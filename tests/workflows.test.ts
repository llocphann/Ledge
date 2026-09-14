import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import YAML from "yaml";

void test("GitHub workflows are valid YAML", () => {
  for (const path of [
    ".github/workflows/ci.yml",
    ".github/workflows/prepare-release.yml",
    ".github/workflows/release.yml",
  ]) {
    const parsed = YAML.parse(fs.readFileSync(path, "utf8")) as unknown;
    assert.ok(parsed, `${path} should parse`);
  }
});

void test("prerelease and stable CI certify metadata and the tracked bundle", () => {
  const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");

  assert.match(workflow, /refs\/heads\/prerelease/);
  assert.match(workflow, /refs\/heads\/stable/);
  assert.match(workflow, /LOCK_ROOT_VERSION/);
  assert.match(workflow, /VERSIONS_MIN_APP/);
  assert.match(workflow, /git diff --exit-code -- main\.js/);
});

void test("release preparation changes only tracked release metadata and build output", () => {
  const workflow = fs.readFileSync(".github/workflows/prepare-release.yml", "utf8");

  assert.match(workflow, /timeout-minutes: 15/);
  assert.match(workflow, /npm version "\$VERSION" --no-git-tag-version --ignore-scripts/);
  assert.match(workflow, /node version-bump\.mjs/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /git diff --check/);
  assert.match(workflow, /Unexpected files changed during release preparation/);
  assert.match(workflow, /git commit -m "chore: prepare Ledge \$VERSION"/);
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
