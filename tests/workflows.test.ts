import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import YAML from "yaml";

void test("GitHub workflows are valid YAML", () => {
  for (const path of [".github/workflows/ci.yml", ".github/workflows/release.yml"]) {
    const parsed = YAML.parse(fs.readFileSync(path, "utf8")) as unknown;
    assert.ok(parsed, `${path} should parse`);
  }
});

void test("release workflow publishes all Obsidian assets", () => {
  const workflow = fs.readFileSync(".github/workflows/release.yml", "utf8");
  for (const asset of ["main.js", "manifest.json", "styles.css"]) {
    assert.match(workflow, new RegExp(asset.replace(".", "\\.")));
  }
});

void test("release workflow describes and attests every published asset", () => {
  const workflow = fs.readFileSync(".github/workflows/release.yml", "utf8");

  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /attestations: write/);
  assert.match(workflow, /uses: actions\/attest@v4/);
  assert.match(workflow, /subject-path:\s*\|[\s\S]*main\.js[\s\S]*manifest\.json[\s\S]*styles\.css/);
  assert.match(workflow, /generate_release_notes: true/);
  assert.match(workflow, /fail_on_unmatched_files: true/);
});
