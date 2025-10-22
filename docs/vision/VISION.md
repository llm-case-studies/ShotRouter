# ShotRouter — Vision & Philosophy

**Last Updated:** 2025-10-22

## The Problem

Screenshots are essential for modern work: bug reports, documentation, design reviews, knowledge sharing. Yet they're chaos:

- **Lost in Desktop clutter** - Hundreds of `Screenshot_2025-10-22_143052.png` files
- **Wrong repos** - Documentation screenshots in personal folders, code examples scattered
- **No audit trail** - Which screenshots went where? When? Why?
- **Compliance nightmares** - Accidentally sharing API keys, PII, internal data
- **Context-switching overhead** - Manual drag-and-drop, renaming, organizing interrupts flow

Traditional solutions fail:
- **Cloud services** upload your data (privacy concerns, compliance violations)
- **OS screenshot tools** offer minimal organization
- **Manual workflows** break concentration and are error-prone

## The Vision

**ShotRouter makes screenshots self-organizing, compliant, and invisible.**

### Core Principles

1. **Zero Interruption**
   - Press Print Screen as usual
   - No dialogs, no prompts, no decisions required
   - Screenshots route themselves to the right place

2. **Local-First Privacy**
   - All processing happens on your machine
   - No cloud uploads by default
   - You control your data completely

3. **Compliance by Default**
   - Automatic scanning for secrets, PII, sensitive data
   - Policy-based gating (review before routing)
   - Complete audit trail for every screenshot

4. **Predictable & Searchable**
   - Consistent naming: `project-YYYYMMDD_HHMMSS-01.png`
   - Full metadata in SQLite
   - Easy to find, easy to reference

5. **UI-First, CLI-Optional**
   - Beautiful web UI for visual review
   - Keyboard shortcuts for power users
   - CLI for scripting and automation
   - Pick your workflow

## What Success Looks Like

### For Individual Developers

**Before ShotRouter:**
- Take screenshot → Save to Desktop → Manually drag to repo → Rename → Update docs → Repeat
- Screenshots pile up in `~/Desktop` and `~/Pictures`
- Waste 5-10 minutes per screenshot organizing
- Accidentally commit screenshots with API keys

**After ShotRouter:**
- Work in IDE → Arm next screenshot for current repo → Press Print Screen → Done
- Screenshot automatically appears in `docs/images/myproject-20251022_143052-01.png`
- Secrets analyzer catches API key → Quarantined with notification → Fix before routing
- Zero context switching, complete peace of mind

### For Teams

**Before ShotRouter:**
- No standard screenshot workflow
- Screenshots scattered across personal folders, Slack, email attachments
- Compliance violations (accidental PII exposure)
- No way to discover existing screenshots

**After ShotRouter (Phase 5):**
- Org-wide policies distributed to all devices
- Screenshots automatically scanned and routed per team standards
- Centralized audit log for compliance reviews
- Shared screenshot repository for team collaboration

### For Organizations

**Before ShotRouter:**
- Data loss incidents from screenshots with customer data
- No visibility into screenshot contents or destinations
- Manual compliance processes (screen every screenshot)
- Audit failures due to incomplete records

**After ShotRouter (Phase 5):**
- Automated DLP scanning of all screenshots
- Policy-enforced quarantine of sensitive content
- Complete audit trail for regulators
- Reduced compliance burden by 80%+

## The Journey

### Phase 1: Individual Productivity ✅ **COMPLETE**
**Status:** Production-ready, daily use recommended

Make screenshots effortless for solo developers:
- Watch OS screenshot folders
- Route to correct repo with predictable naming
- Simple web UI for review and approval
- Auto-start on boot

**Outcome:** Save 5-10 minutes per screenshot, zero lost screenshots.

### Phase 2: Compliance & Safety 🚧 **NEXT**
**Status:** Design phase, ready to implement

Prevent data leaks and compliance violations:
- Secrets detection (API keys, tokens, passwords)
- PII detection (SSN, credit cards, emails)
- Policy engine (approve/gate/quarantine)
- Manual review workflow for sensitive content

**Outcome:** Zero credential leaks, compliance confidence, audit-ready workflows.

### Phase 3: Cross-Platform Ubiquity 🔮 **FUTURE**
**Status:** Planning phase

Work the same way everywhere:
- macOS support (launchd service, native notifications)
- Windows support (Task Scheduler, OneDrive integration)
- Consistent UX across all platforms
- Native installers (DMG, MSI)

**Outcome:** Same workflow on work laptop (macOS), home desktop (Windows), dev box (Linux).

### Phase 4: Power User Features 🔮 **FUTURE**
**Status:** Nice-to-have

Make screenshot workflows delightful:
- Search screenshots by content (OCR, metadata, tags)
- VSCode integration (arm from command palette)
- Advanced routing rules (pattern-based, conditional)
- Thumbnail galleries, keyboard shortcuts, dark mode

**Outcome:** Screenshots feel native to your workflow, not an afterthought.

### Phase 5: Team & Org Scale 🔮 **OPTIONAL**
**Status:** Exploratory

Bring screenshot sanity to entire organizations:
- Multi-device sync (ShotHub control plane)
- Centralized policy distribution
- Team collaboration features
- Compliance dashboards and reporting

**Outcome:** Org-wide screenshot hygiene, compliance by default, team efficiency gains.

## Design Philosophy

### 1. Invisible Until Needed

The best tools disappear. ShotRouter should:
- Run silently in the background
- Require zero configuration for 80% of use cases
- Only surface UI when something needs attention
- Feel like the OS built it in

### 2. Fast Paths for Common Cases

Most workflows should be:
- Press Print Screen → Done (if route is armed)
- Open web UI → Review → Approve → Route

Power users should be able to:
- Keyboard-navigate entire UI
- Script common operations via CLI
- Customize routes and policies

### 3. Safe by Default, Powerful When Needed

Default behavior should be conservative:
- Scan for secrets and PII before routing
- Quarantine suspicious content
- Require manual approval for high-risk scenarios

Advanced users should be able to:
- Disable analyzers for trusted repos
- Auto-approve based on custom rules
- Write custom analyzer plugins

### 4. Local-First, Cloud-Optional

Privacy is non-negotiable:
- All core features work 100% offline
- No external network calls by default
- User controls all data

Organizations that need sync should be able to:
- Opt-in to control plane (ShotHub)
- Self-host control plane if desired
- Use end-to-end encryption for sync

### 5. Open & Extensible

Users should be able to:
- Write custom analyzer plugins (Python)
- Extend routing logic with rules
- Integrate with their tools (VSCode, Slack, etc.)
- Fork and modify to fit their needs

Core should provide:
- Well-documented plugin SDK
- Stable API contracts
- Example plugins and templates

## Success Metrics

### Phase 1 (Individual Productivity)
- **Time saved:** 5-10 minutes per screenshot
- **Adoption:** 100+ daily active users
- **Reliability:** 99.9% uptime (no crashes, auto-restart)
- **User satisfaction:** "I can't live without this" feedback

### Phase 2 (Compliance & Safety)
- **Incident prevention:** Zero credential leaks from screenshots
- **Policy compliance:** 100% of screenshots scanned before routing
- **Audit readiness:** Complete audit trail for all screenshots
- **Peace of mind:** Users trust ShotRouter to catch mistakes

### Phase 3 (Cross-Platform)
- **Platform coverage:** Works on Linux, macOS, Windows
- **Consistency:** Same UX across all platforms
- **Adoption:** 1000+ daily active users across platforms

### Phase 4 (Power Features)
- **Workflow integration:** VSCode extension, CLI power users
- **Search efficiency:** Find any screenshot in <5 seconds
- **User delight:** "This is how screenshots should work" reviews

### Phase 5 (Team & Org Scale)
- **Team adoption:** 10+ orgs using ShotRouter for teams
- **Compliance wins:** Customers pass audits thanks to ShotRouter
- **Business value:** ROI > 10x for org deployments

## Non-Goals (Explicit Anti-Patterns)

### What ShotRouter Is NOT

1. **Not a Cloud Screenshot Tool**
   - We don't want to be Dropbox/Google Drive for screenshots
   - Local-first is core to our identity
   - Control plane (Phase 5) is opt-in, not required

2. **Not a Screen Recording Tool**
   - Focus on static screenshots first
   - GIF/video capture is nice-to-have, not core
   - Other tools (OBS, Peek) do this well

3. **Not an OCR/Text Extraction Service**
   - OCR is for analyzers (secrets detection, search)
   - Not trying to replace OCR tools or services
   - Privacy-focused: OCR happens locally only

4. **Not a Social Screenshot Sharing Platform**
   - No public screenshot galleries
   - No social features (likes, comments, follows)
   - Team sharing (Phase 5) is private and org-scoped

5. **Not a Screenshot Editor**
   - No drawing, cropping, annotating (for now)
   - Other tools (Flameshot, Ksnip) do this well
   - May add basic editing later, but not core

### What We Resist

- **Feature creep:** Stay focused on the core workflow
- **Complexity:** Keep UX simple, config minimal
- **Lock-in:** Users should be able to leave anytime (plain files)
- **Surveillance:** No tracking, no telemetry without opt-in
- **Monetization pressure:** Open source first, sustainability second

## Technology Choices

### Why These Tools?

- **Python:** Fast prototyping, rich ecosystem, easy plugins
- **FastAPI:** Modern, async, great docs, OpenAPI out of box
- **SQLite:** Zero-config, durable, perfect for local-first
- **Web UI (SPA):** Cross-platform, no desktop framework complexity
- **watchfiles:** Rust-based, fast, cross-platform file watching

### Architecture Principles

- **Simple by default:** Minimal dependencies, easy to understand
- **Extensible:** Plugin system for analyzers, custom routes
- **Testable:** High test coverage, deterministic tests
- **Observable:** Logs, metrics, clear error messages
- **Maintainable:** Clean code, good docs, contributor-friendly

## Community & Contribution

### Target Audience

**Primary:** Individual developers who take many screenshots
- Documenting bugs, features, designs
- Creating tutorials, guides, READMEs
- Sharing work with teammates
- Building in public

**Secondary:** Teams and organizations
- Compliance-focused industries (healthcare, finance)
- Open source projects with documentation
- Design teams sharing mockups
- Support teams documenting issues

### How to Contribute

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

**Areas we need help:**
- **Testing:** Especially on macOS and Windows
- **Documentation:** Tutorials, guides, examples
- **Analyzers:** Write plugins for specific use cases
- **UI/UX:** Make the web UI delightful
- **Localization:** Translate UI to other languages

### Communication

- **GitHub Issues:** Bug reports, feature requests, questions
- **GitHub Discussions:** General chat, ideas, support
- **Pull Requests:** Code contributions, docs improvements
- **Roadmap Reviews:** Quarterly sync on priorities

## Long-Term Sustainability

### How We Stay Alive

1. **Open Source First:** Core is always open source (MIT license)
2. **No Monetization Pressure:** Built for utility, not profit
3. **Simple Hosting:** No servers to maintain (local-first)
4. **Community Ownership:** Contributors shape the roadmap
5. **Optional Paid Features:** Control plane (Phase 5) might have paid tiers for orgs

### Governance

- **Benevolent Dictatorship:** Maintainer has final say on core direction
- **RFC Process:** Major changes discussed in GitHub Discussions
- **Contributor Recognition:** Credits in README, release notes
- **Code of Conduct:** Welcoming, inclusive community

## The Ultimate Goal

**Make screenshot management so good that it disappears.**

When ShotRouter succeeds, developers will:
- Never think about where screenshots go
- Never worry about leaking credentials
- Never waste time organizing files
- Never lose screenshots again

Screenshots will just **work**, the way they should have from the beginning.

---

**Questions? Ideas? Challenges?**

Open an issue or start a discussion. We'd love to hear from you!
