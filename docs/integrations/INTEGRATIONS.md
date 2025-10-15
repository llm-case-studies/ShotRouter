# ShotRouter — Integrations

## VSCode

- Task (Shell) to call `shotrouter arm .` and open UI.
- Command palette entry: "ActCLI: Arm next screenshot" → calls local API POST /arm.
- Optional status bar item showing "Armed" or "Watching".

## ActCLI

- CLI glue: `actcli ss arm` can forward to ShotRouter’s API/CLI.
- Presenter/reporter modules can assume predictable screenshot paths in `assets/images`.

## Desktop Notifications

- On route success: system notification with destination path.
- On error: notification with retry action.

## File Explorer Integration (Open/reveal)

- Linux: `xdg-open` parent dir
- macOS: `open -R <file>`
- Windows: `explorer.exe /select,<file>`

## Local LLMs (Analyzers)

- Support adapters for local models (e.g., `ollama`, `llama.cpp`) via analyzer plugins.
- Configure in `config.toml` (see analyzers section); default is disabled and offline.
