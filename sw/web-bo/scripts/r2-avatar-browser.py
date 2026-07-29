#!/usr/bin/env python3
"""Local browser UI for finding and downloading Feel&Note celeb avatars from R2.

Identity search uses the public Supabase REST API. R2 access uses only the
public delivery URL, so this tool never exposes the service-role or R2 secret
keys to the browser.
"""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


DEFAULT_PROJECT_ROOT = Path(r"C:\project\feelandnote")
DEFAULT_DOWNLOAD_DIR = Path(r"D:\image\서비스_재료\_R2_다운로드")
HOST = "127.0.0.1"
MAX_SEARCH_RESULTS = 100
MAX_AVATAR_BYTES = 25 * 1024 * 1024
UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
INVALID_WINDOWS_CHARS_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
WINDOWS_RESERVED_NAMES = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}


@dataclass(frozen=True)
class AppConfig:
    supabase_url: str
    supabase_anon_key: str
    r2_public_url: str
    download_dir: Path
    env_path: Path


def parse_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key] = value
    return values


def load_config() -> AppConfig:
    project_root = Path(
        os.environ.get("FEELANDNOTE_ROOT", str(DEFAULT_PROJECT_ROOT))
    ).resolve()
    env_candidates = [
        project_root / "sw" / "web-bo" / ".env",
        project_root / "sw" / "web" / ".env",
    ]
    required = {
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "R2_PUBLIC_URL",
    }

    for env_path in env_candidates:
        if not env_path.is_file():
            continue
        values = parse_dotenv(env_path)
        if required.issubset(values):
            download_dir = Path(
                os.environ.get(
                    "FEELANDNOTE_AVATAR_DOWNLOAD_DIR",
                    str(DEFAULT_DOWNLOAD_DIR),
                )
            ).resolve()
            return AppConfig(
                supabase_url=values["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"),
                supabase_anon_key=values["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
                r2_public_url=values["R2_PUBLIC_URL"].rstrip("/"),
                download_dir=download_dir,
                env_path=env_path,
            )

    checked = "\n".join(str(path) for path in env_candidates)
    raise RuntimeError(
        "필요한 공개 연결 설정을 찾지 못했습니다.\n"
        "다음 파일 중 하나에 NEXT_PUBLIC_SUPABASE_URL, "
        "NEXT_PUBLIC_SUPABASE_ANON_KEY, R2_PUBLIC_URL이 필요합니다.\n"
        f"{checked}"
    )


def api_headers(config: AppConfig) -> dict[str, str]:
    return {
        "apikey": config.supabase_anon_key,
        "Authorization": f"Bearer {config.supabase_anon_key}",
        "Accept": "application/json",
        "User-Agent": "Feelandnote-R2-Avatar-Browser/1.0",
    }


def request_json(url: str, config: AppConfig) -> Any:
    request = urllib.request.Request(url, headers=api_headers(config))
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"프로필 검색 실패 (HTTP {exc.code}): {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"프로필 서버 연결 실패: {exc.reason}") from exc


def decorate_profile(profile: dict[str, Any], config: AppConfig) -> dict[str, Any]:
    profile_id = str(profile["id"])
    expected_r2_url = f"{config.r2_public_url}/celebs/{profile_id}/avatar.webp"
    db_avatar_url = profile.get("avatar_url") or ""
    return {
        "id": profile_id,
        "nickname": profile.get("nickname") or "",
        "nickname_en": profile.get("nickname_en") or "",
        "slug": profile.get("slug") or "",
        "db_avatar_url": db_avatar_url,
        "r2_url": expected_r2_url,
        "is_r2_link": db_avatar_url.split("?", 1)[0] == expected_r2_url,
    }


def search_profiles(query: str, config: AppConfig) -> list[dict[str, Any]]:
    needle = query.strip()
    if not needle:
        raise ValueError("검색어를 입력해주세요.")
    if len(needle) > 100:
        raise ValueError("검색어는 100자 이하로 입력해주세요.")

    # PostgREST filter control characters are removed; ordinary Korean,
    # English, spaces, apostrophes, periods, and hyphens remain searchable.
    needle = re.sub(r"[%*(),]", "", needle).strip()
    if not needle:
        raise ValueError("검색 가능한 문자를 입력해주세요.")

    clauses = [
        f"nickname.ilike.*{needle}*",
        f"nickname_en.ilike.*{needle}*",
        f"slug.ilike.*{needle}*",
    ]
    if UUID_RE.fullmatch(needle):
        clauses.append(f"id.eq.{needle}")

    params = urllib.parse.urlencode(
        {
            "select": "id,nickname,nickname_en,slug,avatar_url",
            "profile_type": "eq.CELEB",
            "or": f"({','.join(clauses)})",
            "order": "nickname.asc",
            "limit": str(MAX_SEARCH_RESULTS),
        }
    )
    url = f"{config.supabase_url}/rest/v1/profiles?{params}"
    rows = request_json(url, config)
    if not isinstance(rows, list):
        raise RuntimeError("프로필 검색 결과 형식이 올바르지 않습니다.")
    return [decorate_profile(row, config) for row in rows]


def get_profile(profile_id: str, config: AppConfig) -> dict[str, Any]:
    if not UUID_RE.fullmatch(profile_id):
        raise ValueError("올바른 인물 UUID가 아닙니다.")
    params = urllib.parse.urlencode(
        {
            "select": "id,nickname,nickname_en,slug,avatar_url",
            "profile_type": "eq.CELEB",
            "id": f"eq.{profile_id}",
            "limit": "1",
        }
    )
    url = f"{config.supabase_url}/rest/v1/profiles?{params}"
    rows = request_json(url, config)
    if not isinstance(rows, list) or not rows:
        raise LookupError("해당 인물을 찾지 못했습니다.")
    return decorate_profile(rows[0], config)


def safe_stem(value: str, fallback: str) -> str:
    stem = INVALID_WINDOWS_CHARS_RE.sub("_", value).strip(" .")
    stem = re.sub(r"\s+", " ", stem)
    if not stem:
        stem = fallback
    if stem.upper() in WINDOWS_RESERVED_NAMES:
        stem = f"_{stem}"
    return stem[:120]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def curl_executable() -> str:
    executable = shutil.which("curl.exe") or shutil.which("curl")
    if not executable:
        raise RuntimeError(
            "Windows curl.exe를 찾지 못했습니다. Windows 기본 curl 설치가 필요합니다."
        )
    return executable


def curl_download(url: str, destination: Path, byte_range: str | None = None) -> None:
    command = [
        curl_executable(),
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "30",
        "--max-filesize",
        str(MAX_AVATAR_BYTES),
    ]
    if byte_range:
        command.extend(["--range", byte_range])
    command.extend(["--output", str(destination), url])
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=40,
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "알 수 없는 오류").strip()
        raise RuntimeError(f"R2 다운로드 실패: {detail[:500]}")


def download_avatar(profile_id: str, config: AppConfig) -> dict[str, Any]:
    profile = get_profile(profile_id, config)
    config.download_dir.mkdir(parents=True, exist_ok=True)

    nickname = safe_stem(profile["nickname"], profile["id"])
    slug = safe_stem(profile["slug"], profile["id"])
    base_path = config.download_dir / f"{nickname}__{slug}.webp"
    temp_path = config.download_dir / f".{profile['id']}.{time.time_ns()}.part"

    try:
        curl_download(profile["r2_url"], temp_path)
        total = temp_path.stat().st_size
        if total > MAX_AVATAR_BYTES:
            raise RuntimeError("이미지가 허용 크기 25MB를 초과합니다.")
    except Exception:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)
        raise

    if total < 12:
        temp_path.unlink(missing_ok=True)
        raise RuntimeError("R2 응답이 비어 있거나 이미지가 아닙니다.")
    with temp_path.open("rb") as handle:
        signature = handle.read(12)
    if not (
        signature[:4] == b"RIFF"
        and signature[8:12] == b"WEBP"
    ):
        temp_path.unlink(missing_ok=True)
        raise RuntimeError("R2 응답이 WebP 이미지가 아닙니다.")

    remote_hash = sha256_file(temp_path)
    final_path = base_path
    reused = False
    if final_path.exists():
        if sha256_file(final_path) == remote_hash:
            temp_path.unlink(missing_ok=True)
            reused = True
        else:
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            final_path = config.download_dir / f"{nickname}__{slug}__{timestamp}.webp"
            suffix = 2
            while final_path.exists():
                final_path = config.download_dir / (
                    f"{nickname}__{slug}__{timestamp}_{suffix}.webp"
                )
                suffix += 1

    if not reused:
        os.replace(temp_path, final_path)

    return {
        "path": str(final_path),
        "bytes": total,
        "sha256": remote_hash,
        "reused": reused,
        "profile": profile,
    }


def json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")


HTML_PAGE = r"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>R2 아바타 검색기</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0908;
      --panel: #171513;
      --panel-2: #211e1a;
      --line: rgba(255,255,255,.11);
      --gold: #d4af37;
      --text: #f5f0e8;
      --muted: #aaa198;
      --ok: #7fcf9b;
      --warn: #e0b86a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 50% -20%, #332c22 0, transparent 40rem),
        var(--bg);
      color: var(--text);
      font-family: "Pretendard", "Malgun Gothic", system-ui, sans-serif;
    }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 42px 0 72px; }
    header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
    h1 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(28px, 4vw, 44px); }
    .subtitle { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    button, a.action {
      border: 1px solid var(--line);
      background: #24201c;
      color: var(--text);
      border-radius: 7px;
      padding: 10px 14px;
      font: inherit;
      cursor: pointer;
      text-decoration: none;
    }
    button:hover, a.action:hover { border-color: var(--gold); color: #fff3c4; }
    button:disabled { opacity: .45; cursor: default; }
    .danger:hover { border-color: #c76d6d; color: #ffc7c7; }
    form {
      margin: 30px 0 12px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
    }
    input {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: rgba(255,255,255,.055);
      color: var(--text);
      padding: 15px 17px;
      font: inherit;
      outline: none;
    }
    input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212,175,55,.12); }
    form button { min-width: 100px; background: var(--gold); color: #17120a; border-color: var(--gold); font-weight: 800; }
    form button:hover { color: #000; background: #e4c75e; }
    .path {
      color: var(--muted);
      font: 12px Consolas, monospace;
      overflow-wrap: anywhere;
      margin-bottom: 22px;
    }
    #status { min-height: 24px; color: var(--muted); font-size: 14px; }
    #results {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    article {
      display: grid;
      grid-template-columns: 96px 1fr;
      gap: 14px;
      padding: 13px;
      border: 1px solid var(--line);
      background: linear-gradient(145deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
      border-radius: 10px;
      min-width: 0;
    }
    .image-shell {
      width: 96px;
      height: 96px;
      border-radius: 8px;
      overflow: hidden;
      background: radial-gradient(circle at 50% 30%, #3a332b, #111);
      border: 1px solid rgba(255,255,255,.08);
    }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .body { min-width: 0; }
    .name { font-size: 17px; font-weight: 800; }
    .name-en { color: var(--muted); font-size: 12px; margin-top: 2px; min-height: 17px; }
    .slug { color: #d4c39d; font: 11px Consolas, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 6px; }
    .badge { display: inline-block; margin-top: 7px; padding: 3px 6px; border-radius: 4px; font-size: 10px; border: 1px solid currentColor; }
    .badge.ok { color: var(--ok); }
    .badge.warn { color: var(--warn); }
    .actions { display: flex; gap: 6px; margin-top: 10px; }
    .actions button, .actions a { padding: 7px 9px; font-size: 12px; }
    .save-message { color: var(--ok); font-size: 11px; margin-top: 7px; overflow-wrap: anywhere; }
    @media (max-width: 680px) {
      main { width: min(100% - 20px, 1120px); padding-top: 24px; }
      header { display: block; }
      .toolbar { justify-content: flex-start; margin-top: 16px; }
      form { grid-template-columns: 1fr; }
      form button { width: 100%; }
      #results { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>R2 아바타 검색기</h1>
        <p class="subtitle">국문명·영문명·slug·UUID로 현재 서비스 아바타를 찾고 내려받습니다.</p>
      </div>
      <div class="toolbar">
        <button id="open-folder" type="button">다운로드 폴더 열기</button>
        <button id="shutdown" class="danger" type="button">프로그램 종료</button>
      </div>
    </header>

    <form id="search-form">
      <input id="query" type="search" autocomplete="off" autofocus
             placeholder="예: 오타니, Shohei Ohtani, shohei-ohtani">
      <button id="search-button" type="submit">검색</button>
    </form>
    <div class="path">저장 위치: __OUTPUT_DIR__</div>
    <div id="status">검색어를 입력해주세요.</div>
    <section id="results" aria-live="polite"></section>
  </main>

  <script>
    const form = document.querySelector("#search-form");
    const queryInput = document.querySelector("#query");
    const searchButton = document.querySelector("#search-button");
    const status = document.querySelector("#status");
    const results = document.querySelector("#results");

    function setBusy(busy) {
      searchButton.disabled = busy;
      searchButton.textContent = busy ? "검색 중…" : "검색";
    }

    function makeButton(label, onClick) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", onClick);
      return button;
    }

    function renderProfiles(profiles) {
      results.replaceChildren();
      for (const profile of profiles) {
        const card = document.createElement("article");
        const imageShell = document.createElement("div");
        imageShell.className = "image-shell";
        const image = document.createElement("img");
        image.src = profile.r2_url;
        image.alt = profile.nickname;
        image.loading = "lazy";
        image.addEventListener("error", () => {
          image.style.display = "none";
          imageShell.title = "R2 이미지를 불러오지 못했습니다.";
        });
        imageShell.append(image);

        const body = document.createElement("div");
        body.className = "body";
        const name = document.createElement("div");
        name.className = "name";
        name.textContent = profile.nickname || "(이름 없음)";
        const nameEn = document.createElement("div");
        nameEn.className = "name-en";
        nameEn.textContent = profile.nickname_en || "";
        const slug = document.createElement("div");
        slug.className = "slug";
        slug.textContent = profile.slug || profile.id;
        slug.title = profile.id;
        const badge = document.createElement("span");
        badge.className = `badge ${profile.is_r2_link ? "ok" : "warn"}`;
        badge.textContent = profile.is_r2_link ? "DB · R2 연결" : "DB의 R2 링크 확인 필요";

        const actions = document.createElement("div");
        actions.className = "actions";
        const message = document.createElement("div");
        message.className = "save-message";
        const saveButton = makeButton("여기에 저장", async () => {
          saveButton.disabled = true;
          saveButton.textContent = "저장 중…";
          message.textContent = "";
          try {
            const response = await fetch("/api/save", {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({id: profile.id})
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "저장 실패");
            message.textContent = payload.reused
              ? `이미 같은 파일이 있습니다: ${payload.path}`
              : `저장 완료: ${payload.path}`;
          } catch (error) {
            message.style.color = "#ffc7c7";
            message.textContent = error.message;
          } finally {
            saveButton.disabled = false;
            saveButton.textContent = "여기에 저장";
          }
        });
        const openLink = document.createElement("a");
        openLink.className = "action";
        openLink.href = profile.r2_url;
        openLink.target = "_blank";
        openLink.rel = "noreferrer";
        openLink.textContent = "원본 열기";
        actions.append(saveButton, openLink);
        body.append(name, nameEn, slug, badge, actions, message);
        card.append(imageShell, body);
        results.append(card);
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = queryInput.value.trim();
      if (!query) {
        status.textContent = "검색어를 입력해주세요.";
        return;
      }
      setBusy(true);
      status.textContent = "프로필과 R2 경로를 찾는 중입니다…";
      results.replaceChildren();
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "검색 실패");
        renderProfiles(payload.profiles);
        status.textContent = payload.profiles.length
          ? `${payload.profiles.length}명을 찾았습니다.`
          : "검색 결과가 없습니다.";
      } catch (error) {
        status.textContent = error.message;
      } finally {
        setBusy(false);
      }
    });

    document.querySelector("#open-folder").addEventListener("click", async () => {
      const response = await fetch("/api/open-folder", {method: "POST"});
      if (!response.ok) {
        const payload = await response.json();
        status.textContent = payload.error || "폴더를 열지 못했습니다.";
      }
    });

    document.querySelector("#shutdown").addEventListener("click", async () => {
      await fetch("/api/shutdown", {method: "POST"});
      document.body.innerHTML = "<main><h1>프로그램을 종료했습니다.</h1><p class='subtitle'>이 창을 닫아도 됩니다.</p></main>";
    });
  </script>
</body>
</html>
"""


class AvatarBrowserServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], config: AppConfig):
        self.config = config
        super().__init__(address, AvatarBrowserHandler)


class AvatarBrowserHandler(BaseHTTPRequestHandler):
    server: AvatarBrowserServer

    def log_message(self, _format: str, *_args: Any) -> None:
        return

    def send_payload(
        self,
        status: int,
        body: bytes,
        content_type: str,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' https: data:; "
            "style-src 'unsafe-inline'; script-src 'unsafe-inline'",
        )
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status: int, payload: Any) -> None:
        self.send_payload(
            status,
            json_bytes(payload),
            "application/json; charset=utf-8",
        )

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/":
            page = HTML_PAGE.replace(
                "__OUTPUT_DIR__",
                html.escape(str(self.server.config.download_dir)),
            )
            self.send_payload(200, page.encode("utf-8"), "text/html; charset=utf-8")
            return

        if parsed.path == "/api/search":
            try:
                query = urllib.parse.parse_qs(parsed.query).get("q", [""])[0]
                profiles = search_profiles(query, self.server.config)
                self.send_json(200, {"profiles": profiles})
            except (ValueError, RuntimeError) as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if parsed.path == "/api/health":
            self.send_json(
                200,
                {
                    "ok": True,
                    "download_dir": str(self.server.config.download_dir),
                },
            )
            return

        self.send_json(404, {"error": "찾을 수 없는 경로입니다."})

    def read_json_body(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("요청 크기가 올바르지 않습니다.") from exc
        if length <= 0 or length > 4096:
            raise ValueError("요청 본문 크기가 올바르지 않습니다.")
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("요청 JSON이 올바르지 않습니다.") from exc
        if not isinstance(payload, dict):
            raise ValueError("요청 JSON이 올바르지 않습니다.")
        return payload

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/save":
            try:
                payload = self.read_json_body()
                result = download_avatar(str(payload.get("id", "")), self.server.config)
                self.send_json(200, result)
            except (ValueError, LookupError, RuntimeError, OSError) as exc:
                self.send_json(400, {"error": str(exc)})
            return

        if parsed.path == "/api/open-folder":
            try:
                self.server.config.download_dir.mkdir(parents=True, exist_ok=True)
                os.startfile(self.server.config.download_dir)  # type: ignore[attr-defined]
                self.send_json(200, {"ok": True})
            except OSError as exc:
                self.send_json(500, {"error": f"폴더를 열지 못했습니다: {exc}"})
            return

        if parsed.path == "/api/shutdown":
            self.send_json(200, {"ok": True})
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            return

        self.send_json(404, {"error": "찾을 수 없는 경로입니다."})


def self_test(query: str, config: AppConfig) -> int:
    profiles = search_profiles(query, config)
    if not profiles:
        raise RuntimeError(f"'{query}' 검색 결과가 없습니다.")
    first = profiles[0]
    probe_path = config.download_dir / f".self-test-{time.time_ns()}.part"
    config.download_dir.mkdir(parents=True, exist_ok=True)
    try:
        curl_download(first["r2_url"], probe_path, byte_range="0-11")
        signature = probe_path.read_bytes()[:12]
    finally:
        probe_path.unlink(missing_ok=True)
    is_webp = signature[:4] == b"RIFF" and signature[8:12] == b"WEBP"
    report = {
        "query": query,
        "results": len(profiles),
        "first": {
            "nickname": first["nickname"],
            "nickname_en": first["nickname_en"],
            "slug": first["slug"],
            "id": first["id"],
        },
        "r2_webp_ok": is_webp,
        "download_dir": str(config.download_dir),
        "env_path": str(config.env_path),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if is_webp else 1


def show_error_dialog(message: str) -> None:
    try:
        ctypes.windll.user32.MessageBoxW(  # type: ignore[attr-defined]
            0,
            message,
            "R2 아바타 검색기",
            0x10,
        )
    except Exception:
        print(message, file=sys.stderr)


def run_server(config: AppConfig) -> None:
    config.download_dir.mkdir(parents=True, exist_ok=True)
    server = AvatarBrowserServer((HOST, 0), config)
    port = server.server_address[1]
    url = f"http://{HOST}:{port}/"
    threading.Timer(0.35, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever(poll_interval=0.25)
    finally:
        server.server_close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Feel&Note R2 아바타 검색기")
    parser.add_argument(
        "--self-test",
        metavar="QUERY",
        help="브라우저를 열지 않고 검색 및 R2 WebP 응답을 검사합니다.",
    )
    args = parser.parse_args()

    config = load_config()
    if args.self_test:
        return self_test(args.self_test, config)
    run_server(config)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        if "--self-test" in sys.argv:
            print(str(error), file=sys.stderr)
        else:
            show_error_dialog(str(error))
        raise
