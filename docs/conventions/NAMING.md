# ShotRouter — Naming Conventions

Final file name format is configurable per repo; default:

```
{repo}-{yyyy}{MM}{dd}_{HH}{mm}{ss}-{n}.png
```

- `{repo}`: repo slug (folder name sanitized)
- `{n}`: collision suffix starting at 01
- `{date}_{time}`: local time when routed

Examples:
- `actcli-20250113_151245-01.png`
- `clientx-20250113_151245-02.png` (second file in same second)

Optional date subfolders (future):
- `assets/images/2025-01/actcli-...png`

Targets are typically repo/doc stores; final paths are relative to the selected target's `assets/images/` unless configured otherwise in repo policy.
