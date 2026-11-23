// body(P, lib)를 ego 런타임에서 돌리고 반환값을 받는다. lib은 ego-lib.mjs다.
// body는 바깥 변수를 참조하지 않는다(문자열로 옮겨져 실행된다).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const MARK = "TYPECAST_RESULT ";
const LIB = new URL("./ego-lib.mjs", import.meta.url).href;
export const redact = (s) => String(s ?? "").replace(/(Signature|Key-Pair-Id|Expires)=[^&\s'"]+/g, "$1=…");

export function runEgo(body, P) {
  const dir = join(tmpdir(), "typecast-voice-save");
  mkdirSync(dir, { recursive: true });
  const mod = join(dir, `run-${Date.now()}.mjs`);
  writeFileSync(mod, `const lib = await import(${JSON.stringify(LIB)});\nconsole.log(${JSON.stringify(MARK)} + JSON.stringify(await (${body.toString()})(${JSON.stringify(P)}, lib)));\n`, "utf8");
  const r = spawnSync("ego-browser", ["nodejs", "-e", `await import('${pathToFileURL(mod).href}')`], { encoding: "utf8", maxBuffer: 64 << 20 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const line = out.split(/\r?\n/).find((l) => l.startsWith(MARK));
  if (!line) {
    console.error(redact(out) || r.error?.message);
    process.exit(1);
  }
  return JSON.parse(line.slice(MARK.length));
}

export function parseArgs(argv = process.argv.slice(2)) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[i + 1];
  return a;
}

export function printFiles(files) {
  for (const f of files) console.log(f.error ? `${f.n}: 실패 — ${redact(f.error)}` : `${f.file}  ${f.rate}Hz ${f.channels}ch ${f.sec}s`);
}
