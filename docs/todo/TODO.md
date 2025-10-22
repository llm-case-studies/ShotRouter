# ShotRouter — Backlog

**Last Updated:** 2025-10-22

This document tracks concrete, actionable tasks organized by priority and phase. For high-level roadmap, see [ROADMAP.md](../roadmap/ROADMAP.md).

---

## Phase 1 - Polish & Bug Fixes (Ongoing)

### High Priority
- [ ] Add desktop notifications on screenshot detection (Linux: libnotify)
- [ ] Add error toasts in UI for locked files, permission errors
- [ ] Implement better loading states in UI (spinners, progress indicators)
- [ ] Add keyboard shortcuts documentation (ESC to close, arrow navigation)
- [ ] Improve empty states with helpful messages and actions

### Medium Priority
- [ ] Add `shotrouter status` CLI command (show service status, active sources)
- [ ] Add `shotrouter logs` CLI command (tail recent logs)
- [ ] Implement image preview hover in UI tables
- [ ] Add "Reveal in File Manager" button for routed screenshots
- [ ] Add copy-to-clipboard for screenshot paths

### Low Priority
- [ ] Add GitHub Actions CI (pytest, linting)
- [ ] Add pre-commit hooks (black, ruff)
- [ ] Improve error messages with actionable suggestions
- [ ] Add telemetry toggle (local counts only, opt-in)

### Bug Fixes
- [ ] Handle screenshot file deletion before routing (graceful error)
- [ ] Fix potential race condition in atomic claim (rare edge case)
- [ ] Improve config.toml validation and error messages
- [ ] Handle invalid image files gracefully (corrupted screenshots)

---

## Phase 2 - Compliance Pipeline (Next)

### Epic 1: Plugin SDK Foundation
**Goal:** Allow users to write analyzer plugins

- [ ] Design plugin interface (`AnalyzerPlugin` base class)
- [ ] Implement plugin discovery (`~/.config/shotrouter/plugins/*.py`)
- [ ] Add plugin loading and validation
- [ ] Create plugin lifecycle hooks (init, scan, cleanup)
- [ ] Add plugin error handling and timeouts
- [ ] Write plugin development guide
- [ ] Create example plugin template

### Epic 2: Secrets Detection Analyzer
**Goal:** First built-in analyzer to prevent credential leaks

- [ ] Design secrets detection patterns (regex for API keys, tokens, JWT)
- [ ] Implement OCR integration (tesseract or easyocr)
- [ ] Add secret pattern matching on OCR text
- [ ] Create findings data model (extend DB schema)
- [ ] Implement findings storage and retrieval
- [ ] Add configurable patterns in `config.toml`
- [ ] Write tests for secrets detection

### Epic 3: Policy Engine
**Goal:** Route screenshots based on analyzer findings

- [ ] Design policy configuration schema
- [ ] Implement decision engine (approve/gate/quarantine)
- [ ] Add policy evaluation on screenshot detection
- [ ] Implement gating workflow (block routing until reviewed)
- [ ] Add auto-quarantine based on severity thresholds
- [ ] Create audit trail for policy decisions
- [ ] Write tests for policy engine

### Epic 4: Findings UI
**Goal:** Manual review and approval workflow

- [ ] Add Findings view to UI navigation
- [ ] Implement findings list table (screenshot, analyzer, severity, status)
- [ ] Add finding detail view with context
- [ ] Implement approve/quarantine actions
- [ ] Add bulk operations (approve all, quarantine all)
- [ ] Show findings count badge in navigation
- [ ] Add findings filter (by analyzer, severity, status)

### Epic 5: Quarantine Management
**Goal:** Secure storage and recovery for quarantined screenshots

- [ ] Design quarantine directory structure
- [ ] Implement quarantine move operation
- [ ] Add quarantine metadata (reason, timestamp, findings)
- [ ] Create Quarantine UI view
- [ ] Implement recovery workflow (un-quarantine with approval)
- [ ] Add retention policy for quarantined items
- [ ] Write tests for quarantine operations

---

## Phase 3 - Cross-Platform Support (Future)

### macOS Support
- [ ] Implement macOS screenshot directory detection (`screencapture location`)
- [ ] Create launchd service installer script
- [ ] Test on macOS Ventura, Sonoma
- [ ] Handle APFS case-sensitivity correctly
- [ ] Add macOS native notifications
- [ ] Create DMG installer package
- [ ] Update documentation for macOS

### Windows Support
- [ ] Implement Windows screenshot directory detection (OneDrive, Pictures)
- [ ] Create Windows service installer (Task Scheduler or NSSM)
- [ ] Handle NTFS cross-volume semantics (copy+verify+delete)
- [ ] Add Windows native notifications (Action Center)
- [ ] Test on Windows 10, Windows 11
- [ ] Create MSI installer package
- [ ] Update documentation for Windows

---

## Phase 4 - Advanced Features (Future)

### Search & Tagging
- [ ] Add full-text search across screenshots
- [ ] Implement tagging system (DB schema + API)
- [ ] Add tag management UI
- [ ] Add advanced filters (date range, size, source, tags)
- [ ] Implement saved searches

### Thumbnails & Preview
- [ ] Add thumbnail generation (pillow or imagemagick)
- [ ] Implement thumbnail caching
- [ ] Add image preview modal with zoom
- [ ] Show thumbnail in screenshot lists
- [ ] Add "Open in External Viewer" button

### Retention & Cleanup
- [ ] Implement retention policies (auto-delete after N days)
- [ ] Add stale screenshot warnings
- [ ] Implement disk space monitoring
- [ ] Add cleanup wizard (bulk delete old screenshots)
- [ ] Add archive feature (compress + move to cold storage)

### VSCode Integration
- [ ] Create VSCode extension scaffolding
- [ ] Implement "Arm Next" command in command palette
- [ ] Add status bar indicator
- [ ] Show screenshot gallery in sidebar
- [ ] Add quick routing from editor context menu

---

## Infrastructure & DevOps

### Testing
- [ ] Add integration tests for watcher + routing flow
- [ ] Add performance tests (large files, many screenshots)
- [ ] Add E2E tests for UI workflows
- [ ] Improve test coverage (aim for >80%)
- [ ] Add mutation testing

### CI/CD
- [ ] Set up GitHub Actions for tests
- [ ] Add linting (ruff, black) to CI
- [ ] Add type checking (mypy) to CI
- [ ] Set up automated releases (tags → PyPI)
- [ ] Add changelog generation

### Documentation
- [ ] Add contributing guide (CONTRIBUTING.md)
- [ ] Add plugin development tutorial
- [ ] Create video walkthrough (YouTube)
- [ ] Add FAQ document
- [ ] Improve API documentation (OpenAPI)

### Packaging
- [ ] Publish to PyPI
- [ ] Add installation via pip
- [ ] Create Homebrew formula (macOS)
- [ ] Create AUR package (Arch Linux)
- [ ] Create snap package (Ubuntu)

---

## Ideas & Explorations (Backburner)

These are ideas that might be valuable but need more thought:

- [ ] Browser extension to capture from web apps directly
- [ ] Mobile app to route phone screenshots (sync via control plane)
- [ ] OCR search (find screenshots by text content)
- [ ] AI-powered auto-tagging
- [ ] Screenshot diff tool (compare versions)
- [ ] Annotation support (draw on screenshots before routing)
- [ ] GIF/video capture support (not just static screenshots)
- [ ] Team sharing (share screenshot routes with team members)
- [ ] Git integration (auto-commit routed screenshots)
- [ ] Slack/Discord webhook notifications

---

## Completed (Archive)

### Phase 0 ✅
- ✅ Confirm naming and repo structure
- ✅ Pick license
- ✅ Create design docs

### Phase 1 ✅
- ✅ Implement Linux watcher (watchfiles)
- ✅ Debounce policy (stable size)
- ✅ Atomic claim rename (in-place)
- ✅ SQLite schema + WAL mode
- ✅ CLI: arm, list, route, settings
- ✅ API skeleton (FastAPI) + WS events
- ✅ SPA: Inbox, Routed, Routes, Settings
- ✅ Sources persistence to config.toml
- ✅ systemd service installation
- ✅ Desktop autostart installation
- ✅ Comprehensive test suite (21 tests)
- ✅ Move/rename operation (same volume)

---

## How to Use This Document

**For Contributors:**
- Pick a task from the current phase (Phase 2 is next)
- Open an issue linking to this TODO item
- Create a feature branch and PR
- Update this file when complete

**For Maintainers:**
- Review and prioritize tasks quarterly
- Move completed tasks to "Completed" section
- Add new tasks as user feedback comes in
- Keep in sync with ROADMAP.md

**For Users:**
- Use this to see what's coming next
- Suggest new tasks via GitHub issues
- Upvote tasks you want prioritized
