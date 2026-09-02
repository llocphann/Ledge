# Visibility Rules

Visibility rules let each Dock appear only in the parts of the vault where it is useful.

Open **Visibility** for the Dock you want to configure.

## Rule priority

Ledge evaluates rules like this:

1. If there are **no enabled include rules with a value**, the Dock is allowed everywhere.
2. If include rules exist, the current note must match **at least one** include rule.
3. If the current note matches **any enabled exclude rule**, the Dock is hidden.

```text
visible = allowed by include rules AND not matched by an exclude rule
```

**Exclude always wins.**

## Show Dock in

Use include rules when the Dock should only exist in specific contexts.

Example: show a Media Dock only inside a media folder.

```text
Match by: Folder path
Value: 20_Personal_Life/25_Media_Tracker
```

Once this enabled include rule exists, the Dock will not appear outside that folder unless another include rule matches.

## Hide Dock in

Use exclude rules when a Dock should normally appear everywhere except a few places.

Example:

```text
Match by: Note name
Value: Homepage
```

## Match types

### Note name

Matches the file name regardless of its folder. The `.md` extension is optional.

`Homepage` and `Homepage.md` both match a note named `Homepage.md`.

### Exact path

Matches one exact vault-relative file path.

```text
Projects/Project A/Dashboard.md
```

Use this when two notes have the same name but live in different folders.

### Folder path

Matches every file inside that folder and all descendant folders.

```text
Projects/Work
```

also matches:

```text
Projects/Work/Client A/Notes.md
```

### Tag

A leading `#` is optional. Tag rules also match nested tags.

A rule for `#media` matches both `#media` and tags such as `#media/movie`.

## Multiple rules

Rules of the same group behave like **OR** conditions. If any enabled include rule matches, the include side passes. Any matching exclude rule then hides the Dock.

A disabled rule has no effect, so you can temporarily turn a rule off without deleting it.
