from __future__ import annotations

import json
from pathlib import Path

VERSION = "2.0.1"


def read_json(path: str) -> dict:
    return json.loads(Path(path).read_text())


def write_json(path: str, value: dict) -> None:
    Path(path).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


# Guard the release lane: 2.0.1 must contain the Target path freeze hotfix,
# but not the broader prerelease settings/reorder optimizations.
settings_source = Path("src/settings-tab.ts").read_text()
main_source = Path("src/main.ts").read_text()
icon_tab_source = Path("src/icon-library-setting-tab.ts").read_text()

required_hotfix_markers = [
    "class DockTargetSuggest extends AbstractInputSuggest<TFile>",
    "const TARGET_SUGGESTION_LIMIT = 50",
    "render: (setting) => this.renderTargetPathControl(setting, key(\"target\"))",
]
for marker in required_hotfix_markers:
    if marker not in settings_source:
        raise SystemExit(f"Missing required 2.0.1 hotfix marker: {marker}")

for prerelease_marker in [
    "async saveSettings(refresh = true, syncIcons = false)",
    "scheduleItemRowControls",
    "ledge-item-order-controls",
]:
    if prerelease_marker in main_source or prerelease_marker in icon_tab_source or prerelease_marker in settings_source:
        raise SystemExit(f"Prerelease-only optimization leaked into main: {prerelease_marker}")

package = read_json("package.json")
if package.get("version") != "2.0.0":
    raise SystemExit(f"Expected package version 2.0.0, found {package.get('version')}")
package["version"] = VERSION
write_json("package.json", package)

lock = read_json("package-lock.json")
if lock.get("version") != "2.0.0":
    raise SystemExit(f"Expected lock version 2.0.0, found {lock.get('version')}")
lock["version"] = VERSION
root_package = lock.get("packages", {}).get("")
if not isinstance(root_package, dict):
    raise SystemExit("package-lock.json is missing the root package entry")
root_package["version"] = VERSION
write_json("package-lock.json", lock)

manifest = read_json("manifest.json")
if manifest.get("version") != "2.0.0":
    raise SystemExit(f"Expected manifest version 2.0.0, found {manifest.get('version')}")
manifest["version"] = VERSION
write_json("manifest.json", manifest)

versions = read_json("versions.json")
if VERSION in versions:
    raise SystemExit(f"versions.json already contains {VERSION}")
versions[VERSION] = manifest["minAppVersion"]
write_json("versions.json", versions)

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text()
anchor = "# Changelog\n\n## Unreleased\n\n"
if changelog.count(anchor) != 1:
    raise SystemExit("Could not find the expected Unreleased changelog anchor")
hotfix_notes = (
    "## 2.0.1\n\n"
    "- Fix a freeze when opening or editing a Dock item's Target path in large vaults by replacing the eager vault-wide file control with a bounded lazy suggester.\n"
    "- Limit Target path suggestions to 50 relevant Markdown, Base, and Canvas files while excluding `.git` and `node_modules` paths.\n\n"
)
changelog_path.write_text(changelog.replace(anchor, anchor + hotfix_notes, 1))
