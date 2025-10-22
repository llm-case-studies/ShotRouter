# ShotRouter — Roadmap

**Last Updated:** 2025-10-22

## Phase 0 — Repo bootstrap ✅ COMPLETE
- ✅ Docs package confirming concepts and UX
- ✅ Initial implementation structure

## Phase 1 — UI‑First MVP (Linux) ✅ COMPLETE
**Status:** Production-ready, daily use recommended

### Core Features ✅
- ✅ File watcher with `watchfiles` library (cross-platform)
- ✅ Debounce + atomic claim (`file.png` → `file.png.sr-claim-{pid}-{ts}`)
- ✅ SQLite metadata with WAL mode
- ✅ WebSocket events (`screenshot.new`, `screenshot.routed`, etc.)
- ✅ FastAPI server with REST + WebSocket endpoints

### UI Features ✅
- ✅ Local SPA: Inbox, Routed, Routes, Settings views
- ✅ Collections → Routed split view with detail pane
- ✅ Route management (add/edit/delete/reorder)
- ✅ "Arm Next" one-shot routing workflow
- ✅ Source directory management (add/remove/configure)

### Configuration & Persistence ✅
- ✅ TOML config at `~/.config/shotrouter/config.toml`
- ✅ Sources persistence (paths, debounce, enabled state)
- ✅ Settings API (`PATCH /api/settings`)
- ✅ Canonical path handling (expanduser, resolve, dedupe)

### Production Deployment ✅
- ✅ systemd user service installation (`install-service.sh`)
- ✅ Desktop autostart entry (`install-autostart.sh`)
- ✅ Auto-restart on crashes
- ✅ Logging via journalctl
- ✅ Comprehensive setup documentation

### Testing ✅
- ✅ 21 passing tests covering API, WebSocket, persistence
- ✅ Test isolation with fixtures and state reset
- ✅ CI-ready test suite

---

## Phase 2 — Compliance Pipeline 🚧 NEXT
**Status:** Design phase, ready to implement

### Analyzer Plugin SDK
- [ ] Plugin interface design (Python modules or full sandboxing?)
- [ ] Plugin discovery and loading (`~/.config/shotrouter/plugins/`)
- [ ] Plugin lifecycle (init, scan, cleanup)
- [ ] Error handling and timeouts
- [ ] Plugin metadata (name, version, capabilities)

### Built-in Analyzers
- [ ] **Secrets Detection**: API keys, tokens, passwords in screenshots
  - Regex patterns for common secret formats
  - Configurable custom patterns
- [ ] **PII Detection**: SSN, credit cards, emails, phone numbers
  - Redaction options (blur, remove, quarantine)
- [ ] **Local LLM Classifier**: Sensitive vs. safe content
  - Ollama integration
  - llama.cpp integration
  - Configurable prompts and thresholds

### Policy Engine
- [ ] Policy configuration (`config.toml` section)
- [ ] Decision flow: approve/gate/quarantine
- [ ] Gating workflow (manual review required before routing)
- [ ] Auto-quarantine based on findings severity
- [ ] Approval with reason (audit trail)

### Findings UI
- [ ] Findings list view (per screenshot)
- [ ] Finding detail with context (highlighted regions if possible)
- [ ] Manual review workflow (approve/quarantine/edit)
- [ ] Findings filter (by analyzer, severity, status)
- [ ] Bulk operations on findings

### Quarantine Store
- [ ] Separate quarantine directory
- [ ] Quarantine metadata (reason, timestamp, who)
- [ ] Recovery workflow (un-quarantine with approval)
- [ ] Auto-purge after retention period

### Notifications
- [ ] Desktop notifications on new screenshot
- [ ] Gating notifications (review required)
- [ ] Quarantine notifications
- [ ] Configurable notification levels

---

## Phase 3 — Cross-Platform Support 🔮 FUTURE
**Status:** Planning phase

### macOS Support
- [ ] Read `com.apple.screencapture location` default
- [ ] Fallback to `~/Desktop` if not set
- [ ] launchd service installation (`.plist` in `~/Library/LaunchAgents/`)
- [ ] macOS-specific file handling (APFS, case-sensitivity)
- [ ] Native notifications (Notification Center)
- [ ] DMG installer packaging

### Windows Support
- [ ] OneDrive screenshot path detection
- [ ] Standard `%USERPROFILE%/Pictures/Screenshots` support
- [ ] Task Scheduler or NSSM service installation
- [ ] NTFS cross-volume semantics (copy+verify+delete)
- [ ] Windows notifications (Action Center)
- [ ] MSI installer packaging

### Cross-Volume Move
- [ ] Detect same-volume vs. cross-volume moves
- [ ] Implement copy+verify+delete for cross-volume
- [ ] SHA256 verification after copy
- [ ] Rollback on verification failure
- [ ] Progress reporting for large files

---

## Phase 4 — Polish & Advanced Features 🔮 FUTURE
**Status:** Nice-to-have, post-MVP

### CLI Power Features
- [ ] `shotrouter search <query>` - Search routed screenshots
- [ ] `shotrouter tag <id> <tag>` - Tag screenshots
- [ ] `shotrouter export <query>` - Bulk export
- [ ] `shotrouter stats` - Usage statistics
- [ ] Shell completion (bash, zsh, fish)

### UI Enhancements
- [ ] Search/filter across all screenshots
- [ ] Tag management
- [ ] Thumbnail generation and caching
- [ ] Image preview with zoom
- [ ] Keyboard shortcuts (vim-style navigation?)
- [ ] Dark mode toggle
- [ ] Customizable themes

### Retention & Cleanup
- [ ] Retention policies (auto-delete after N days)
- [ ] Stale screenshot warnings
- [ ] Disk space monitoring
- [ ] Archive old screenshots (compress, move to cold storage)

### VSCode Integration
- [ ] VSCode extension for "Arm Next" command
- [ ] Quick-arm from command palette
- [ ] Status bar indicator
- [ ] Screenshot gallery in sidebar

### Advanced Routes
- [ ] Pattern-based routing (regex on filename, content)
- [ ] Multi-destination routing (copy to multiple repos)
- [ ] Conditional routing based on analyzer findings
- [ ] Time-based routing (different repos by day/project)

---

## Phase 5 — Control Plane (Optional) 🔮 FUTURE
**Status:** Exploratory, org-scale features

### ShotHub Multi-Device Sync
- [ ] Device enrollment and authentication
- [ ] Policy distribution (org-wide analyzer configs)
- [ ] Metadata sync across devices
- [ ] Centralized audit log aggregation
- [ ] Team collaboration features

### Org-Wide Features
- [ ] Central policy management dashboard
- [ ] Compliance reporting
- [ ] User activity monitoring
- [ ] Screenshot discovery across org
- [ ] Data loss prevention (DLP) integration

**Note:** Phase 5 is optional and only relevant for organizations. Individual users can stop at Phase 4.

---

## Current Priorities (Next 3-6 months)

1. **Phase 2 Kick-off**: Design analyzer plugin SDK
2. **First Analyzer**: Secrets detection (high value, low complexity)
3. **Policy Engine**: Basic approve/gate/quarantine flow
4. **Findings UI**: Manual review workflow
5. **User Feedback**: Iterate on Phase 1 based on daily usage

## Decision Points

### Analyzer Architecture
**Question:** Start simple (Python modules) or build full sandboxing?

**Options:**
- **Simple:** Plugins as Python modules in `~/.config/shotrouter/plugins/`, import and run
  - Pro: Fast to implement, easy for users to write
  - Con: No security isolation, plugins can break app
- **Sandboxed:** Subprocess execution with IPC, resource limits
  - Pro: Security, fault isolation
  - Con: More complex, slower, harder to debug

**Recommendation:** Start simple, add sandboxing in Phase 2.5 if needed.

### Policy UX
**Question:** Auto-quarantine vs. gating (manual review required)?

**Options:**
- **Auto-quarantine:** High-severity findings automatically quarantined
- **Gating:** All findings require manual review before routing
- **Hybrid:** Configurable per-analyzer (some auto-quarantine, some gate)

**Recommendation:** Hybrid approach with sensible defaults.

### First Analyzer Priority
**Question:** Which analyzer provides most value for first implementation?

**Candidates:**
1. **Secrets Detection** - High value, prevents credential leaks
2. **PII Detection** - Compliance-focused, protects privacy
3. **LLM Classifier** - Flexible but requires local LLM setup

**Recommendation:** Secrets detection first (regex-based, no external deps).
