/**
 * Registered factions cleanup to folder-rules.
 *
 * Safe structural cleanup + path realignment where files already exist.
 * Does NOT invent images or rename production voice files.
 *
 * node sw/remotion/scripts/cleanup-active-factions.mjs
 * node sw/remotion/scripts/cleanup-active-factions.mjs --dry
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DRY = process.argv.includes("--dry");
const FAC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/factions",
);
const ACTIVE = new Set(
  JSON.parse(fs.readFileSync(path.join(FAC, "_episodes.json"), "utf8")),
);

const log = [];
function note(msg) {
  log.push(msg);
  console.log(msg);
}

function ensureDir(p) {
  if (!DRY) fs.mkdirSync(p, { recursive: true });
}

function exists(p) {
  return fs.existsSync(p);
}

function movePath(from, to) {
  if (!exists(from)) return false;
  if (exists(to)) {
    note(`  skip move (dest exists): ${path.relative(FAC, from)}`);
    return false;
  }
  note(`  move ${path.relative(FAC, from)} → ${path.relative(FAC, to)}`);
  if (!DRY) {
    ensureDir(path.dirname(to));
    try {
      fs.renameSync(from, to);
    } catch (e) {
      // Windows EPERM on dirs often held by indexer/IDE — copy then rm
      if (e && (e.code === "EPERM" || e.code === "EACCES" || e.code === "EBUSY")) {
        fs.cpSync(from, to, { recursive: true });
        fs.rmSync(from, { recursive: true, force: true });
      } else {
        throw e;
      }
    }
  }
  return true;
}

function rmDirRecursive(p) {
  if (!exists(p)) return;
  note(`  rm ${path.relative(FAC, p)}`);
  if (!DRY) fs.rmSync(p, { recursive: true, force: true });
}

function loadJson(p) {
  let raw = fs.readFileSync(p, "utf8");
  const last = raw.lastIndexOf("}");
  if (last >= 0) raw = raw.slice(0, last + 1) + "\n";
  return JSON.parse(raw);
}

function saveJson(p, j) {
  const text = JSON.stringify(j, null, 2) + "\n";
  if (!DRY) fs.writeFileSync(p, text, "utf8");
}

function walkStrings(obj, fn) {
  let n = 0;
  const walk = (o) => {
    if (o == null) return;
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) {
        if (typeof o[i] === "string") {
          const next = fn(o[i], null);
          if (next !== o[i]) {
            o[i] = next;
            n++;
          }
        } else walk(o[i]);
      }
      return;
    }
    if (typeof o === "object") {
      for (const k of Object.keys(o)) {
        if (typeof o[k] === "string") {
          const next = fn(o[k], k);
          if (next !== o[k]) {
            o[k] = next;
            n++;
          }
        } else walk(o[k]);
      }
    }
  };
  walk(obj);
  return n;
}

/** Find best matching file in dir for a basename (png/jpg/crop/new) */
function resolveImageInDir(dir, wantedRel) {
  const wanted = wantedRel.replace(/\\/g, "/");
  const full = path.join(dir, wanted);
  if (exists(full)) return wanted;

  const parts = wanted.split("/");
  const file = parts.pop();
  const sub = parts.join("/");
  const parent = path.join(dir, sub);
  if (!exists(parent)) return null;

  const base = file.replace(/\.(png|jpg|jpeg|webp)$/i, "");
  const files = fs.readdirSync(parent).filter((f) =>
    /\.(png|jpg|jpeg|webp)$/i.test(f),
  );

  // exact base variants
  const candidates = [
    `${base}.png`,
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.webp`,
    `${base}-crop.jpg`,
    `${base}-crop.png`,
    `${base}-new.png`,
    `${base}-new.jpg`,
  ];
  for (const c of candidates) {
    if (files.includes(c)) return sub ? `${sub}/${c}` : c;
  }

  // starts with base
  const hit = files.find(
    (f) =>
      f.startsWith(base) ||
      f.replace(/-crop|-new|-copy| - 복사본.*/gi, "").replace(/\.[^.]+$/, "") ===
        base,
  );
  if (hit) return sub ? `${sub}/${hit}` : hit;
  return null;
}

function listSeries() {
  return fs
    .readdirSync(FAC, { withFileTypes: true })
    .filter((d) => d.isDirectory() && ACTIVE.has(d.name))
    .map((d) => d.name)
    .sort();
}

// ─── per-series structural cleanup ───────────────────────
function cleanStructure(name) {
  const root = path.join(FAC, name);
  note(`\n## structure ${name}`);
  const archive = path.join(root, "_archive");

  // bak / pre backups
  for (const f of fs.readdirSync(root)) {
    const abs = path.join(root, f);
    if (!fs.statSync(abs).isFile()) continue;
    if (f.endsWith(".bak") || f.includes(".pre-") || f.endsWith(".pre-adds") || f.endsWith(".pre-reset")) {
      ensureDir(archive);
      movePath(abs, path.join(archive, f));
    }
  }

  // research/ → _docs/research
  const research = path.join(root, "research");
  if (exists(research) && fs.statSync(research).isDirectory()) {
    movePath(research, path.join(root, "_docs", "research"));
  }

  // nested sw/ mistake
  const nestedSw = path.join(root, "sw");
  if (exists(nestedSw)) rmDirRecursive(nestedSw);

  // _refs_backup_* → _archive
  for (const f of fs.readdirSync(root)) {
    if (f.startsWith("_refs_backup")) {
      ensureDir(archive);
      movePath(path.join(root, f), path.join(archive, f));
    }
  }

  // 재료/ → _staging/재료
  const material = path.join(root, "재료");
  if (exists(material)) {
    movePath(material, path.join(root, "_staging", "재료"));
  }

  // junk folders
  const junkNames = ["새 폴더", "새 폴더 (2)", "New folder"];
  for (const j of junkNames) {
    const p = path.join(root, j);
    // also search one level deep in group dirs
    if (exists(p)) {
      // if has files, move to _staging
      movePath(p, path.join(root, "_staging", j.replace(/\s+/g, "-")));
    }
  }
  // Social-Network 02-x/새 폴더
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || !/^\d{2}/.test(ent.name)) continue;
    const gdir = path.join(root, ent.name);
    for (const j of junkNames) {
      const jp = path.join(gdir, j);
      if (exists(jp)) {
        ensureDir(path.join(root, "_staging"));
        movePath(jp, path.join(root, "_staging", `${ent.name}-${j.replace(/\s+/g, "-")}`));
      }
    }
    // _group_rename.txt junk notes
    const renameTxt = path.join(gdir, "_group_rename.txt");
    if (exists(renameTxt)) {
      ensureDir(path.join(root, "_archive"));
      movePath(renameTxt, path.join(root, "_archive", `${ent.name}_group_rename.txt`));
    }
  }

  // root loose png that look like work files (korea football team drafts)
  if (name === "korea-football-best11") {
    for (const f of fs.readdirSync(root)) {
      if (/^대표팀/.test(f) && /\.(png|jpg)$/i.test(f)) {
        ensureDir(path.join(root, "_staging"));
        movePath(path.join(root, f), path.join(root, "_staging", f));
      }
    }
  }

  // ensure _docs, _status
  ensureDir(path.join(root, "_docs"));
  const statusPath = path.join(root, "_status.json");
  if (!exists(statusPath)) {
    note("  + _status.json");
    if (!DRY) fs.writeFileSync(statusPath, JSON.stringify({ status: "todo" }, null, 2) + "\n");
  }

  // Digital-Resistance: _docs Korean clutter already in _docs — ok
  // quotes-research at root of some → _docs
  for (const f of fs.readdirSync(root)) {
    if (!f.endsWith(".md")) continue;
    if (f.startsWith("00-")) continue;
    if (f === "README.md") continue;
    // root md that is research-ish
    if (/quote|research|plan|prompts/i.test(f) || /개선|확장/.test(f)) {
      movePath(path.join(root, f), path.join(root, "_docs", f));
    }
  }
}

/**
 * Path-of-Kings West/East: previous align mangled cluster images into
 * `02-rome/1/3__group.png`. Restore PayPal-style multi-cluster names under 1/:
 *   _group.png, _group-2.png, _group-3.png, _group-shadow.png (rome shadow only)
 * East people sit flat under group; keep as-is or use 1/ if files move later.
 */
function fixPathOfKingsSplit(name, j) {
  if (name !== "Path-of-Kings-West" && name !== "Path-of-Kings-East") return 0;
  let n = 0;
  if (!j.groups) return 0;

  for (const g of j.groups) {
    const logo = g.logoImg || "";
    const gdir = logo.includes("/")
      ? logo.split("/")[0]
      : (g.clusters?.[0]?.image || "").split("/")[0];
    if (!gdir) continue;

    const isRomeShadow =
      /그림자|shadow|적수/i.test(String(g.name || "") + String(g.subtitle || ""));
    const isSolo = /solo|고독/i.test(gdir + String(g.name || ""));

    (g.clusters || []).forEach((c, ci) => {
      let groupName = "_group.png";
      if (isRomeShadow) groupName = "_group-shadow.png";
      else if (ci === 1) groupName = "_group-2.png";
      else if (ci === 2) groupName = "_group-3.png";
      else if (ci === 3) groupName = "_group-enemy.png";
      else if (ci > 0) groupName = `_group-${ci + 1}.png`;

      const next = `${gdir}/1/${groupName}`;
      if (c.image !== next) {
        note(`  cluster img ${c.image} → ${next}`);
        c.image = next;
        n++;
      }

      for (const p of c.people || []) {
        if (!p.image) continue;
        // normalize flat East paths: 03-mongol/이름.png → 03-mongol/1/이름.png
        const m = p.image.match(/^([^/]+)\/([^/]+\.(png|jpg|jpeg|webp))$/i);
        if (m && m[1] === gdir) {
          const nextP = `${gdir}/1/${m[2]}`;
          note(`  person img ${p.image} → ${nextP}`);
          p.image = nextP;
          n++;
        }
        // West mangled paths already under 1/ with Korean names — keep if well-formed
        // Fix any `1/N__` residue in person paths (unlikely)
        if (/\/\d+__/.test(p.image)) {
          const fixed = p.image.replace(/\/(\d+)__/, "/$1/");
          note(`  person fix ${p.image} → ${fixed}`);
          p.image = fixed;
          n++;
        }
      }
    });

    if (!g.logoImg && gdir && !isSolo) {
      g.logoImg = `${gdir}/_logo.png`;
      note(`  set logoImg ${g.logoImg}`);
      n++;
    }
    if (isSolo && !g.logoImg) {
      g.logoImg = `${gdir}/_logo.png`;
      n++;
    }
  }
  return n;
}

// ─── data path realignment ───────────────────────────────
function fixDataPaths(name) {
  const root = path.join(FAC, name);
  const dataPath = path.join(root, "faction-data.json");
  if (!exists(dataPath)) return;

  note(`\n## data paths ${name}`);
  const j = loadJson(dataPath);
  let fixes = 0;

  // 0) Path-of-Kings West/East structural path repair
  fixes += fixPathOfKingsSplit(name, j);

  // 1) Fix residual N__group.png → N/_group.png (other series)
  fixes += walkStrings(j, (s) => {
    if (/\/\d+__group\./.test(s)) {
      const next = s.replace(/\/(\d+)__group\./, "/$1/_group.");
      note(`  fix double-underscore group: ${s} → ${next}`);
      return next;
    }
    return s;
  });

  // 2) Resolve missing image paths to on-disk variants (-crop, .jpg, -new)
  const resolveField = (s, key) => {
    if (!s || typeof s !== "string") return s;
    if (s.startsWith("http")) return s;
    if (!/\.(png|jpg|jpeg|webp|mp4)$/i.test(s)) return s;
    if (exists(path.join(root, s))) return s;

    // logoVid missing → clear if key is logoVid
    if (key === "logoVid" || s.endsWith(".mp4")) {
      // try _logo.mp4 alternatives or any mp4 at group root
      const parts = s.split("/");
      if (parts.length >= 2) {
        const g = parts[0];
        const gdir = path.join(root, g);
        if (exists(gdir)) {
          const mp4s = fs
            .readdirSync(gdir)
            .filter((f) => f.endsWith(".mp4"));
          if (mp4s.length === 1) {
            const next = `${g}/${mp4s[0]}`;
            note(`  logoVid → sole mp4: ${s} → ${next}`);
            return next;
          }
          const pref = mp4s.find((f) => /logo|title|grok/i.test(f));
          if (pref) {
            const next = `${g}/${pref}`;
            note(`  logoVid → ${next}`);
            return next;
          }
        }
      }
      if (key === "logoVid") {
        note(`  clear missing logoVid: ${s}`);
        return "";
      }
      return s;
    }

    const resolved = resolveImageInDir(root, s);
    if (resolved && resolved !== s) {
      note(`  remap ${s} → ${resolved}`);
      return resolved;
    }
    return s;
  };

  fixes += walkStrings(j, resolveField);

  // empty string logoVid → delete key for cleanliness
  if (j.groups) {
    for (const g of j.groups) {
      if (g.logoVid === "") {
        delete g.logoVid;
        fixes++;
        note("  delete empty logoVid");
      }
    }
  }

  if (fixes > 0) {
    note(`  → ${fixes} path fixes`);
    saveJson(dataPath, j);
  } else {
    note("  (no path fixes)");
  }
}

// ─── rename remaining old asset basenames ────────────────
function renameLegacyAssets(name) {
  const root = path.join(FAC, name);
  note(`\n## legacy names ${name}`);
  let n = 0;

  const walk = (dir) => {
    if (!exists(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["voice", "_archive", "_staging", "_refs", "node_modules"].includes(ent.name))
        continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(p);
        continue;
      }
      const map = {
        "group.png": "_group.png",
        "group_shot.png": "_group.png",
        "logo.png": "_logo.png",
        "logo.mp4": "_logo.mp4",
      };
      if (map[ent.name]) {
        const dest = path.join(dir, map[ent.name]);
        if (!exists(dest)) {
          note(`  ren ${path.relative(root, p)} → ${map[ent.name]}`);
          if (!DRY) fs.renameSync(p, dest);
          n++;
          // update data paths
        }
      }
    }
  };
  walk(root);

  if (n > 0) {
    const dataPath = path.join(root, "faction-data.json");
    if (exists(dataPath)) {
      const j = loadJson(dataPath);
      const c = walkStrings(j, (s) => {
        let t = s;
        t = t.replace(/\/group\.png$/g, "/_group.png");
        t = t.replace(/\/group_shot\.png$/g, "/_group.png");
        t = t.replace(/\/logo\.png$/g, "/_logo.png");
        t = t.replace(/\/logo\.mp4$/g, "/_logo.mp4");
        return t;
      });
      if (c) saveJson(dataPath, j);
      note(`  data string updates: ${c}`);
    }
  } else {
    note("  (none)");
  }
}

// ─── main ────────────────────────────────────────────────
const series = listSeries();
note(`Active series: ${series.length}${DRY ? " [DRY RUN]" : ""}`);

for (const s of series) {
  cleanStructure(s);
  renameLegacyAssets(s);
  fixDataPaths(s);
}

// write log
const logPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "_cleanup-active-log.txt",
);
if (!DRY) fs.writeFileSync(logPath, log.join("\n"), "utf8");
note(`\nDone. log → ${logPath}`);
