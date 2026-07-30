/**
 * Registered factions structure audit vs folder-rules.md.
 */
import fs from "fs";
import path from "path";

const root = path.resolve("sw/remotion/public/factions");
const active = new Set(
  JSON.parse(fs.readFileSync(path.join(root, "_episodes.json"), "utf8")),
);

const series = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && active.has(d.name))
  .map((d) => d.name)
  .sort();

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

function resolveUnderSeries(seriesBase, seriesName, imgPath) {
  if (!imgPath) return null;
  let fp = imgPath.replace(/^\//, "").replace(/\\/g, "/");
  const marker = `factions/${seriesName}/`;
  if (fp.includes(marker)) fp = fp.split(marker)[1];
  else if (fp.startsWith("factions/")) {
    const parts = fp.split("/");
    // factions/Other/… ignore
    if (parts[1] === seriesName) fp = parts.slice(2).join("/");
  }
  const full = path.join(seriesBase, fp);
  if (fs.existsSync(full)) return { full, ok: true };
  const pub = path.join("sw/remotion/public", imgPath.replace(/^\//, ""));
  if (fs.existsSync(pub)) return { full: pub, ok: true };
  return { full, ok: false };
}

const report = [];

for (const s of series) {
  const base = path.join(root, s);
  const issues = [];
  const rootEntries = fs.readdirSync(base);
  const rootFiles = rootEntries.filter((f) =>
    fs.statSync(path.join(base, f)).isFile(),
  );
  const rootDirs = rootEntries.filter((f) =>
    fs.statSync(path.join(base, f)).isDirectory(),
  );

  let data = null;
  const dataPath = path.join(base, "faction-data.json");
  if (!fs.existsSync(dataPath)) issues.push("MISSING faction-data.json");
  else {
    try {
      const raw = fs.readFileSync(dataPath, "utf8");
      if (raw.includes('"\\n"') && raw.trimEnd().endsWith('"\\n"')) {
        issues.push("trailing literal \\n corruption");
      }
      data = JSON.parse(raw);
    } catch (e) {
      issues.push("JSON PARSE FAIL: " + String(e.message).slice(0, 100));
    }
  }

  // root clutter patterns
  for (const f of rootFiles) {
    if (/quote[-_]?(research|mining|bank)/i.test(f))
      issues.push("root quote doc: " + f);
    if (/\.pre-/.test(f)) issues.push("pre-backup: " + f);
    if (/^data\.(json|ko\.json)$/.test(f)) issues.push("legacy data: " + f);
    if (f.endsWith(".bak")) issues.push("bak: " + f);
    if (/개선|확장/.test(f)) issues.push("ko clutter: " + f);
    if (f.endsWith(".md") && !f.startsWith("00-") && f !== "README.md")
      issues.push("root md: " + f);
  }
  for (const d of rootDirs) {
    if (d.startsWith("_refs_backup")) issues.push("refs backup dir: " + d);
    if (d === "research") issues.push("research/ at root (→ _docs or archive)");
    if (d === "sw") issues.push("nested sw/ mistake path");
    if (d === "images" && s !== "PayPal-Mafia") {
      // images/ may be legacy; note it
      issues.push("legacy images/ dir");
    }
  }

  const groupDirs = rootDirs.filter((f) => /^\d{2}-/.test(f));
  let oldNames = [];
  let newNames = [];
  for (const g of groupDirs) {
    const files = walkFiles(path.join(base, g));
    for (const f of files) {
      const bn = path.basename(f);
      if (bn === "group.png" || bn === "logo.png" || bn === "logo.mp4")
        oldNames.push(path.relative(base, f).replace(/\\/g, "/"));
      if (bn === "_group.png" || bn === "_logo.png" || bn === "_logo.mp4")
        newNames.push(path.relative(base, f).replace(/\\/g, "/"));
    }
  }

  // also check if people sit directly under group without cluster 1/
  let flatPeople = 0;
  for (const g of groupDirs) {
    const gpath = path.join(base, g);
    for (const e of fs.readdirSync(gpath, { withFileTypes: true })) {
      if (!e.isFile()) continue;
      if (/^_/.test(e.name)) continue;
      if (/\.(png|jpg|webp|mp4)$/i.test(e.name) && !/^_/.test(e.name)) {
        // person or group at group root without cluster
        if (!e.name.startsWith("_") && e.name !== "group.png" && e.name !== "logo.png")
          flatPeople++;
      }
    }
  }

  let pathCount = 0;
  let missing = [];
  if (data?.groups) {
    for (const g of data.groups) {
      for (const key of ["logoImg", "logoVid", "image"]) {
        if (!g[key]) continue;
        pathCount++;
        const r = resolveUnderSeries(base, s, g[key]);
        if (!r?.ok) missing.push(`${key}: ${g[key]}`);
      }
      for (const c of g.clusters || []) {
        if (c.image) {
          pathCount++;
          const r = resolveUnderSeries(base, s, c.image);
          if (!r?.ok) missing.push(`cluster.image: ${c.image}`);
        }
        for (const p of c.people || []) {
          if (p.image) {
            pathCount++;
            const r = resolveUnderSeries(base, s, p.image);
            if (!r?.ok) missing.push(`person ${p.slug || p.name}: ${p.image}`);
          }
          if (p.image2) {
            pathCount++;
            const r = resolveUnderSeries(base, s, p.image2);
            if (!r?.ok) missing.push(`person2 ${p.slug || p.name}: ${p.image2}`);
          }
        }
      }
    }
  }

  report.push({
    series: s,
    groupDirs: groupDirs.length,
    oldAssetNames: oldNames.length,
    newAssetNames: newNames.length,
    oldSamples: oldNames.slice(0, 5),
    flatPeopleAtGroupRoot: flatPeople,
    pathCount,
    missingCount: missing.length,
    missingSamples: missing.slice(0, 8),
    issues,
  });
}

// summary
console.log("=== ACTIVE FACTIONS AUDIT ===\n");
for (const r of report) {
  const flags = [];
  if (r.issues.some((i) => i.startsWith("JSON"))) flags.push("JSON_BROKEN");
  if (r.oldAssetNames > 0) flags.push(`oldNames:${r.oldAssetNames}`);
  if (r.missingCount > 0) flags.push(`missing:${r.missingCount}`);
  if (r.issues.length) flags.push(`issues:${r.issues.length}`);
  if (r.flatPeopleAtGroupRoot > 0)
    flags.push(`flat:${r.flatPeopleAtGroupRoot}`);
  const mark = flags.length ? "⚠" : "✓";
  console.log(
    `${mark} ${r.series} groups=${r.groupDirs} new=${r.newAssetNames} ${flags.join(" ") || "clean"}`,
  );
  if (r.issues.length) {
    for (const i of r.issues.slice(0, 12)) console.log("    · " + i);
    if (r.issues.length > 12) console.log(`    · …+${r.issues.length - 12}`);
  }
  if (r.oldSamples.length) {
    console.log("    old: " + r.oldSamples.join(", "));
  }
  if (r.missingSamples.length) {
    for (const m of r.missingSamples) console.log("    miss: " + m);
    if (r.missingCount > r.missingSamples.length)
      console.log(`    miss: …+${r.missingCount - r.missingSamples.length}`);
  }
}
