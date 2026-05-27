#!/usr/bin/env node
/**
 * Validates pnpm workspace package globs resolve to package.json files.
 * Used in CI and local setup.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readWorkspaceGlobs() {
  const yamlPath = path.join(root, "pnpm-workspace.yaml");
  const text = fs.readFileSync(yamlPath, "utf8");
  const packages = [];
  let inPackages = false;
  for (const line of text.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = line.match(/^\s+-\s+(.+)$/);
      if (m) packages.push(m[1].trim());
      else if (line.trim() && !line.startsWith("#")) inPackages = false;
    }
  }
  return packages;
}

function expandGlob(globPattern) {
  const results = [];
  const walk = (base, segments) => {
    if (segments.length === 0) {
      const pkg = path.join(base, "package.json");
      if (fs.existsSync(pkg)) results.push(base);
      return;
    }
    const [head, ...rest] = segments;
    if (head === "**") {
      for (const name of fs.readdirSync(base, { withFileTypes: true })) {
        if (!name.isDirectory() || name.name === "node_modules") continue;
        walk(path.join(base, name.name), rest);
      }
      return;
    }
    if (head === "*") {
      for (const name of fs.readdirSync(base, { withFileTypes: true })) {
        if (!name.isDirectory()) continue;
        walk(path.join(base, name.name), rest);
      }
      return;
    }
    walk(path.join(base, head), rest);
  };

  const parts = globPattern.split("/");
  walk(root, parts);
  return [...new Set(results.map((p) => path.relative(root, p)))].sort();
}

const globs = readWorkspaceGlobs();
const packages = globs.flatMap(expandGlob);
const errors = [];

if (packages.length === 0) {
  errors.push("No workspace packages found — check pnpm-workspace.yaml");
}

for (const pkgDir of packages) {
  const pkgPath = path.join(root, pkgDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    errors.push(`Missing package.json: ${pkgDir}`);
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (!pkg.name) errors.push(`Package missing name: ${pkgDir}`);
}

const requiredRootFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  ".nvmrc",
];
for (const file of requiredRootFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`Missing required root file: ${file}`);
  }
}

if (errors.length) {
  console.error("[validate-workspace] FAILED");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log(`[validate-workspace] OK (${packages.length} packages)`);
for (const p of packages) console.log(`  - ${p}`);
