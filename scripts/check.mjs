import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = new URL("../", import.meta.url);
let files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(mjs|js)$/.test(f)) files.push(f);
  }
}
for (const name of ["public/js", "src", "scripts", "tests"])
  walk(fileURLToPath(new URL(name, root)));
for (const file of files) {
  const r = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log("JavaScript syntax checks passed: " + files.length + " files.");
