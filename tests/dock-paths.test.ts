import assert from "node:assert/strict";
import test from "node:test";
import { renameRememberedVaultIconPaths } from "../src/dock-paths";
import { addDockPreset, normalizeSettings } from "../src/settings";

void test("vault icon renames update active and remembered paths across every dock", () => {
  const settings = normalizeSettings({
    items: [{
      id: "active",
      iconSource: "vault",
      icon: "Assets/Icons/contact.png",
      vaultIconPath: "Assets/Icons/contact.png",
      builtInIcon: "contact",
    }, {
      id: "remembered",
      iconSource: "lucide",
      icon: "home",
      builtInIcon: "home",
      vaultIconPath: "Assets/Icons/contact.png",
    }],
  });
  const second = addDockPreset(settings, true);
  assert.ok(second);

  assert.equal(
    renameRememberedVaultIconPaths(
      settings,
      "Archive/Icons/contact.png",
      "Assets/Icons/contact.png",
    ),
    true,
  );

  for (const dock of settings.docks) {
    const active = dock.items.find((item) => item.id === "active");
    const remembered = dock.items.find((item) => item.id === "remembered");
    assert.equal(active?.vaultIconPath, "Archive/Icons/contact.png");
    assert.equal(active?.icon, "Archive/Icons/contact.png");
    assert.equal(remembered?.vaultIconPath, "Archive/Icons/contact.png");
    assert.equal(remembered?.icon, "home");
  }
});

void test("unrelated vault renames do not modify dock icon state", () => {
  const settings = normalizeSettings({
    items: [{
      id: "home",
      iconSource: "lucide",
      icon: "home",
      builtInIcon: "home",
      vaultIconPath: "Assets/Icons/home.svg",
    }],
  });
  const before = structuredClone(settings.docks);

  assert.equal(
    renameRememberedVaultIconPaths(settings, "Elsewhere/file.svg", "Other/file.svg"),
    false,
  );
  assert.deepEqual(settings.docks, before);
});
