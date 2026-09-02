# Backup and Restore

Ledge can export the complete configuration as a JSON file.

Open the **Data** section near the bottom of Ledge settings.

## Export

Choose **Export settings → Export**.

The backup contains all Dock presets and their user settings, including layout and positions, behavior and trigger settings, visibility rules, appearance, and Dock items.

Keep the exported JSON somewhere outside the plugin folder if you want a portable backup.

## Import

Choose **Import settings → Import** and select a Ledge JSON backup.

Import **replaces the current Ledge configuration**, so export the current setup first if you may want to return to it.

Ledge validates and normalizes imported data before applying it. Invalid JSON, files from another format, and unsupported future schema versions are rejected instead of being applied partially.

Imports are limited to 1 MB. Ledge also limits oversized item and visibility-rule collections during normalization to protect workspace performance.

## Restore defaults

**About → Restore defaults** replaces the current Ledge configuration with the original defaults. Export first if you want to keep a copy of your current setup.
