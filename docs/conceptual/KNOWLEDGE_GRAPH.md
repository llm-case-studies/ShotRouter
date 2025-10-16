# ShotRouter — Knowledge Graph Conceptual Model

## Overview

ShotRouter's domain model is best understood as a knowledge graph where core concepts (nodes) are connected through well-defined relationships (edges). This document describes the conceptual model independent of implementation details, enabling flexible UI projections and future extensibility.

**Core Principle:** Sources, Destinations, and Routes are **peer concepts** with no inherent ownership hierarchy. Relationships between them are directional but symmetric — the graph can be traversed from any perspective (source-centric, destination-centric, route-centric, or processing-centric).

---

## Clarifications (2025-01)

- “Arm next” is an ActivationRule composition (n_shots=1 + time-based TTL) applied to a transient, high-priority Route — not a separate concept. The API simply creates that ephemeral rule.
- Quarantine is a virtual collection (status=quarantined) by default. Optionally, organizations may materialize it as a Destination flagged `kind=quarantine`.
- Manual routing convenience is captured as RouteShortcut (ad‑hoc). Users can promote a shortcut to a persistent Route.
- Analyzer is a first‑class concept (distinct from DetectionRule) to record provenance (name, version, mode, sandbox flags).
- Device/fleet (ShotManager/ShotHub) is deferred post‑MVP.

## Core Concepts (Nodes)

### 1. Source
**Definition:** A filesystem location being monitored for new screenshots.

**Properties:**
- `id` (uuid)
- `path` (string) - absolute filesystem path
- `enabled` (boolean) - currently watching?
- `debounce_ms` (integer) - wait time for file stability (default: 400)
- `watch_patterns` (list of strings) - glob patterns (e.g., `*.png`, `*.jpg`)
- `last_scan_time` (timestamp)
- `created_at` (timestamp)

**Semantics:**
- Sources are passive watchers — they generate screenshot events
- A source can exist without any routes (screenshots go to Inbox)
- A source can have activation rules (e.g., "only watch during work hours")

**Examples:**
- `~/Pictures/Screenshots` (GNOME default)
- `~/Downloads` (browser screenshot downloads)
- `%USERPROFILE%/OneDrive/Pictures/Screenshots` (Windows)

---

### 2. Destination
**Definition:** A filesystem location where screenshots are moved.

**Properties:**
- `id` (uuid)
- `path` (string) - absolute filesystem path
- `target_dir` (string) - subdirectory within destination (e.g., `assets/images/`)
- `name_format` (string) - naming template (e.g., `{repo}-{date}_{time}-{seq}.{ext}`)
- `exists` (boolean) - computed: does folder exist right now?
- `last_routed_at` (timestamp)
- `total_routed_count` (integer)
- `created_at` (timestamp)

**Semantics:**
- Destinations are passive receivers — they accept routed screenshots
- A destination can exist without any routes pointing to it
- A destination can become a source in a pipeline (e.g., "inbox" folder is both destination and source)
- A destination can have activation rules (e.g., "only accept screenshots when folder name matches pattern")

**Examples:**
- `/home/alex/Projects/MyApp/assets/images/`
- `/home/alex/Documents/Screenshots/inbox/`
- `/mnt/archive/screenshots/quarterly-report/`

---

### 3. Route
**Definition:** A directional connection from source(s) to destination(s) with optional processing logic.

**Properties:**
- `id` (uuid)
- `priority` (integer) - used when multiple routes compete (lower number = higher priority)
- `active` (boolean) - currently matching activation conditions?
- `match_count` (integer) - total screenshots routed via this route
- `description` (string) - human-readable label (e.g., "MyApp development screenshots")
- `created_at` (timestamp)

**Semantics:**
- Routes are **directional connectors**: `Source → Route → Destination`
- A route connects exactly one source to exactly one destination (1:1)
- Multiple routes can connect same source to different destinations (fan-out)
- Multiple routes can connect different sources to same destination (fan-in)
- Routes can have activation rules (e.g., "active for next 5 screenshots")
- Routes can have policies and actions attached (e.g., "compress before routing")
- Routes are **ordered by priority** within a source's context

**Examples:**
- `~/Pictures/Screenshots → MyApp/assets/images/` (priority: 1, 5 shots remaining)
- `~/Pictures/Screenshots → Fallback/inbox/` (priority: 999, always active)
- `~/Downloads → QuarterlyReport/raw/` (priority: 1, active until folder exists)

---

### 4. ActivationRule
**Definition:** Conditions that determine when a source, destination, or route is active.

**Properties:**
- `id` (uuid)
- `type` (enum: `n_shots`, `time_based`, `time_window`, `folder_exists`, `folder_name_pattern`, `always_on`)
- `parameters` (JSON) - flexible configuration per type
- `created_at` (timestamp)

**Type-specific parameters:**

**`n_shots`:**
```json
{
  "n_shots_total": 5,
  "n_shots_remaining": 3
}
```

**`time_based`:**
```json
{
  "expires_at": "2025-01-16T18:30:00Z"
}
```

**`time_window`:**
```json
{
  "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "hours_start": "09:00",
  "hours_end": "17:00",
  "timezone": "America/New_York"
}
```

**`folder_exists`:**
```json
{
  "check_path": "/home/alex/Projects/MyApp/repo-images",
  "polling_interval_sec": 30
}
```

**`folder_name_pattern`:**
```json
{
  "check_path": "/home/alex/Projects/MyApp",
  "name_pattern": "repo-images",
  "match_mode": "exact"
}
```

**`always_on`:**
```json
{}
```

**Semantics:**
- Activation rules can apply to **sources**, **destinations**, or **routes**
- Multiple activation rules can be combined with AND/OR logic (future)
- Examples:
  - **Source + activation rule:** "Only watch ~/Pictures/Screenshots during work hours"
  - **Destination + activation rule:** "Only accept screenshots when folder exists" (your rename trick!)
  - **Route + activation rule:** "Route next 5 screenshots, then deactivate"

---

### 5. Policy
**Definition:** Rules that govern screenshot handling (retention, detection-based routing, size limits, etc.)

**Properties:**
- `id` (uuid)
- `type` (enum: `retention`, `detection_triggered`, `size_limit`, `quarantine_rule`, `custom`)
- `scope` (enum: `global`, `source`, `destination`, `route`)
- `parameters` (JSON) - flexible configuration per type
- `enabled` (boolean)
- `created_at` (timestamp)

**Type-specific parameters:**

**`retention`:**
```json
{
  "delete_after_days": 30,
  "flagged_delete_after_days": 7,
  "action": "delete"
}
```

**`detection_triggered`:**
```json
{
  "if_pii_detected": "route_to_review",
  "if_ip_detected": "flag_only",
  "target_destination_id": "uuid-of-review-folder"
}
```

**`size_limit`:**
```json
{
  "max_size_mb": 10,
  "action": "archive",
  "notify_user": true
}
```

**Semantics:**
- Policies can apply to sources, destinations, or routes
- Policies are **evaluated** when screenshots are processed
- Policies can **trigger actions** (see Actions below)
- Examples:
  - **Source policy:** "Delete all screenshots from this source after 30 days"
  - **Route policy:** "If PII detected, route to review folder instead of destination"
  - **Destination policy:** "Reject screenshots larger than 10 MB"

---

### 6. Action
**Definition:** Operations performed on screenshots (routing, compression, embedding calculation, categorization, etc.)

**Properties:**
- `id` (uuid)
- `type` (enum: `route`, `archive`, `delete`, `quarantine`, `compress`, `calculate_hash`, `calculate_embedding`, `categorize`, `custom`)
- `status` (enum: `pending`, `in_progress`, `completed`, `failed`)
- `performed_at` (timestamp)
- `performed_by` (enum: `system`, `user`, `policy`, `route`)
- `reason` (string, nullable) - explanation for audit trail
- `parameters` (JSON) - action-specific config
- `result` (JSON, nullable) - action output (e.g., compression ratio, embedding vector)

**Type-specific parameters:**

**`route`:**
```json
{
  "from_source_id": "uuid",
  "to_destination_id": "uuid",
  "via_route_id": "uuid"
}
```

**`compress`:**
```json
{
  "compression_format": "webp",
  "quality": 85,
  "original_size_bytes": 1048576,
  "compressed_size_bytes": 204800
}
```

**`calculate_embedding`:**
```json
{
  "model": "clip-vit-base-patch32",
  "embedding_dim": 512,
  "embedding_vector": [0.123, -0.456, ...]
}
```

**`categorize`:**
```json
{
  "categories": ["ui", "diagram", "code"],
  "confidence_scores": [0.85, 0.12, 0.03]
}
```

**Semantics:**
- Actions are **events** that happen to screenshots
- Actions can be triggered by:
  - Routes (automatic during routing)
  - Policies (conditional based on detection)
  - Users (manual actions)
  - System (scheduled tasks, cleanup)
- Actions have activation rules (e.g., "compress only during idle hours")
- Actions build an **audit trail**: "Why was this screenshot compressed?" → "Route 'MyApp pipeline' triggered compression action"

**Examples:**
- `route` - Move screenshot from source to destination
- `compress` - Reduce file size before archiving
- `calculate_hash` - Compute SHA256 for deduplication
- `calculate_embedding` - Generate ML embedding for similarity search
- `categorize` - Classify screenshot type (UI, diagram, code, etc.)

---

### 7. Screenshot
**Definition:** The actual file being managed.

**Properties:**
- `id` (uuid)
- `source_path` (string) - original location
- `dest_path` (string, nullable) - final location after routing
- `status` (enum: `inbox`, `archive`, `routed`, `quarantined`, `under_review`)
- `size_bytes` (integer)
- `sha256` (string, nullable)
- `created_at` (timestamp)
- `routed_at` (timestamp, nullable)
- `flagged` (boolean) - marked for review?
- `metadata` (JSON) - EXIF, dimensions, etc.

**Semantics:**
- Screenshots are the **data flowing through the graph**
- A screenshot always **originated from** exactly one source
- A screenshot may be **routed to** zero or one destination
- A screenshot may be **routed via** zero or one route
- Screenshots can have multiple actions performed on them
- Screenshots can have multiple findings (from detection rules)

---

### 8. DetectionRule
**Definition:** Configuration for content analysis (PII, IP addresses, sensitive data).

**Properties:**
- `id` (uuid)
- `type` (enum: `pii`, `ip_address`, `credit_card`, `ssn`, `custom_pattern`)
- `enabled` (boolean)
- `analyzer` (string) - which plugin/method to use (e.g., `regex`, `ml_model`, `ocr+nlp`)
- `confidence_threshold` (float 0.0-1.0)
- `parameters` (JSON) - analyzer-specific config

**Examples:**

**`pii` (Social Security Numbers):**
```json
{
  "pattern": "\\d{3}-\\d{2}-\\d{4}",
  "analyzer": "regex",
  "confidence_threshold": 0.9
}
```

**`ip_address` (Internal network IPs):**
```json
{
  "pattern": "10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|192\\.168\\.\\d{1,3}\\.\\d{1,3}",
  "analyzer": "regex",
  "confidence_threshold": 0.95
}
```

**Semantics:**
- Detection rules can be configured **per source** or **globally**
- Detection rules produce **findings** when triggered
- Findings can trigger **policies** (e.g., "if PII detected → route to review folder")

---

### 9. Finding
**Definition:** Result from content analysis (detection rules).

**Properties:**
- `id` (uuid)
- `type` (string) - e.g., `pii.ssn`, `ip.internal`, `credit_card.visa`
- `severity` (enum: `info`, `warning`, `critical`)
- `confidence` (float 0.0-1.0)
- `location` (JSON) - bounding box or text offset: `{"bbox": [x, y, w, h]}` or `{"text_offset": 123}`
- `detected_at` (timestamp)
- `raw_match` (string, nullable) - actual detected text (redacted in UI)

**Semantics:**
- Findings are **produced by** detection rules
- Findings are **attached to** screenshots
- Findings can **trigger** policies
- Findings contribute to audit trail: "Screenshot quarantined because Finding X triggered Policy Y"

---

### 10. Target (Future Enhancement - Not MVP)
**Definition:** Higher-level grouping of sources, destinations, and routes (e.g., project, workspace, pipeline stage).

**Properties:**
- `id` (uuid)
- `name` (string) - e.g., "MyApp Project", "Quarterly Report 2025 Q1", "Pre-Audit Cleanup"
- `type` (enum: `project`, `pipeline_stage`, `workspace`, `collection`)
- `root_path` (string, nullable) - base directory
- `active` (boolean) - is this target currently "open" or in use?
- `created_at` (timestamp)

**Semantics:**
- Targets can **group destinations** (e.g., "MyApp Project" has destinations: `assets/images/`, `docs/screenshots/`)
- Targets can **group sources** (e.g., pipeline stage "Pre-Audit Cleanup" monitors multiple source folders)
- Targets can **group routes** (e.g., "Quarterly Report 2025 Q1" has routes for collecting screenshots)
- Targets can have activation rules (e.g., "active when project is open in VS Code")

**Examples:**
- **Project:** "MyApp" → destinations: `assets/images/`, `docs/diagrams/`, `tests/fixtures/`
- **Pipeline Stage:** "Pre-Audit Cleanup" → sources: `inbox/`, `review/`, destinations: `approved/`, `quarantined/`
- **Workspace:** "Client Work" → routes tagged for client-related screenshots

**Note:** Targets are deferred to post-MVP but the model is designed to accommodate them.

---

### 11. Collection (Virtual - UI Projection)
**Definition:** Dynamic grouping of screenshots by status (not stored in DB, just query views).

**Types:**
- **Inbox** - `WHERE status = 'inbox'` - needs triage, normal state is empty
- **Archive** - `WHERE status = 'archive'` - unclear ownership, still "our responsibility"
- **Routed** - `WHERE status = 'routed'` - moved to destination, now "their responsibility"
- **Under Review** - `WHERE status = 'under_review'` - flagged for manual review
- **Quarantined** - `WHERE status = 'quarantined'` - policy violation, held

**Semantics:**
- Collections are **not entities** — they are **views/queries** over screenshots
- Collections are useful for UI organization
- Collection membership is determined by screenshot status

---

### 11. Analyzer (Explicit)
**Definition:** Executable that produces findings from a screenshot.

**Properties:**
- `id` (uuid)
- `name` (string)
- `version` (string)
- `mode` (enum: `regex`, `ml_model`, `ocr+nlp`, `custom`)
- `sandbox` (JSON) — `{"network": false, "timeout_ms": 2000, "memory_mb": 512}`
- `created_at` (timestamp)

**Semantics:**
- DetectionRules reference an Analyzer; Findings record which Analyzer produced them.
- Enables provenance and audit for plugin behavior.

---

### 12. Decision
**Definition:** Outcome of policy evaluation for a screenshot.

**Properties:**
- `id` (uuid)
- `outcome` (enum: `approved`, `gated`, `quarantined`)
- `policy_id` (uuid)
- `actor` (enum: `system`, `user`)
- `reason` (string, nullable)
- `created_at` (timestamp)

**Semantics:**
- Binds Findings and Policies to a durable outcome for auditability.
- Drives UI state and routing permissibility.

---

### 13. RouteShortcut (Ad‑Hoc)
**Definition:** Ephemeral mapping of recent manual routing choices.

**Properties:**
- `id` (uuid)
- `destination_id` (uuid)
- `usage_count` (integer)
- `last_used_at` (timestamp)

**Semantics:**
- Lives per‑user; improves convenience without polluting persistent routes.
- Can be promoted to a persistent Route via a user action.

---

## Relationships (Edges)

### Symmetric Peer Relationships

| From | Relationship | To | Cardinality | Notes |
|------|--------------|-----|-------------|-------|
| Route | CONNECTS_FROM | Source | N:1 | Route reads from source |
| Route | CONNECTS_TO | Destination | N:1 | Route writes to destination |
| Source | PROVIDES_TO | Route | 1:N | Source can feed multiple routes |
| Destination | RECEIVES_FROM | Route | 1:N | Destination can receive from multiple routes |

**Key Insight:** No inherent hierarchy — graph is traversable from any direction:
- **Source-centric view:** "Show me all routes connected to this source"
- **Destination-centric view:** "Show me all routes feeding this destination"
- **Route-centric view:** "Show me source and destination for this route"
- **Processing-centric view:** "Show me the pipeline flow"

---

### Attachment Relationships

| From | Relationship | To | Cardinality | Notes |
|------|--------------|-----|-------------|-------|
| Source | HAS_ACTIVATION_RULE | ActivationRule | 1:N | Optional |
| Destination | HAS_ACTIVATION_RULE | ActivationRule | 1:N | Optional |
| Route | HAS_ACTIVATION_RULE | ActivationRule | 1:N | Required for conditional routes |
| Source | HAS_POLICY | Policy | 1:N | Optional |
| Destination | HAS_POLICY | Policy | 1:N | Optional |
| Route | HAS_POLICY | Policy | 1:N | Optional |
| Source | HAS_DETECTION_RULE | DetectionRule | 1:N | Optional |
| Action | HAS_ACTIVATION_RULE | ActivationRule | 1:N | Optional |

---

Additional relationships:
- DetectionRule USES Analyzer (N:1)
- Finding PRODUCED_BY Analyzer (N:1)
- Decision APPLIES_TO Screenshot (N:1)
- Decision EVALUATED_BY Policy (N:1)
- RouteShortcut PROMOTES_TO Route (N:1, user‑initiated)
- Screenshot DERIVED_FROM Screenshot (optional, for redaction/transformers)

---

### Screenshot Flow Relationships

| From | Relationship | To | Cardinality | Notes |
|------|--------------|-----|-------------|-------|
| Screenshot | ORIGINATED_FROM | Source | N:1 | Always set |
| Screenshot | ROUTED_VIA | Route | N:1 | Nullable (manual routing) |
| Screenshot | ROUTED_TO | Destination | N:1 | Nullable (inbox items) |
| Screenshot | HAS_FINDING | Finding | 1:N | From detection scans |
| Screenshot | HAD_ACTION | Action | 1:N | Audit trail |
| Screenshot | HAS_DECISION | Decision | 1:N | Latest controls routing |

---

### Trigger Relationships

| From | Relationship | To | Cardinality | Notes |
|------|--------------|-----|-------------|-------|
| Finding | DETECTED_BY | DetectionRule | N:1 | Which rule found this |
| Finding | TRIGGERS | Policy | N:N | Finding can trigger multiple policies |
| Policy | TRIGGERS | Action | 1:N | Policy can spawn actions |
| Route | TRIGGERS | Action | 1:N | Route can spawn actions (e.g., compress) |
| Action | PERFORMED_ON | Screenshot | N:1 | Action target |

---

### Future Grouping Relationships (Post-MVP)

| From | Relationship | To | Cardinality | Notes |
|------|--------------|-----|-------------|-------|
| Target | GROUPS_DESTINATIONS | Destination | 1:N | Project has multiple destinations |
| Target | GROUPS_SOURCES | Source | 1:N | Pipeline stage monitors sources |
| Target | GROUPS_ROUTES | Route | 1:N | Collection of related routes |
| Target | HAS_ACTIVATION_RULE | ActivationRule | 1:N | Active when project open |

---

## Graph Traversal Examples

### Example 1: Source-Centric View
**Question:** "What happens to screenshots from `~/Pictures/Screenshots`?"

**Graph Query:**
```
Source(path="~/Pictures/Screenshots")
  ├─> Route(priority=1) --> Destination(path="/MyApp/assets/images")
  │     └─> ActivationRule(type="n_shots", remaining=3)
  │     └─> Policy(type="detection_triggered", if_pii="route_to_review")
  ├─> Route(priority=2) --> Destination(path="/OtherApp/assets")
  │     └─> ActivationRule(type="folder_exists")
  └─> Route(priority=999) --> Destination(path="~/Screenshots/inbox")
        └─> ActivationRule(type="always_on")
```

**Answer:**
- Try Route #1 (3 shots remaining, check PII policy)
- If Route #1 inactive → Try Route #2 (if folder exists)
- If Route #2 inactive → Route #999 (fallback inbox)

---

### Example 2: Destination-Centric View
**Question:** "What feeds screenshots into `/MyApp/assets/images`?"

**Graph Query:**
```
Destination(path="/MyApp/assets/images")
  <-- Route(priority=1) <-- Source(path="~/Pictures/Screenshots")
  <-- Route(priority=5) <-- Source(path="~/Downloads")
  └─> ActivationRule(type="folder_name_pattern", pattern="repo-images")
```

**Answer:**
- Receives from 2 sources (Pictures/Screenshots and Downloads)
- Only accepts when folder name matches "repo-images" (rename trick)

---

### Example 3: Processing Pipeline View
**Question:** "Show me the screenshot processing pipeline"

**Graph Query:**
```
Source(~/Screenshots)
  └─> Route(pipeline="pre-audit")
        └─> Action(type="compress")
        └─> Action(type="calculate_hash")
        └─> Action(type="categorize")
        └─> Destination(~/Audit/processed)
              [Destination becomes Source in next stage]
              └─> Route(pipeline="audit-review")
                    └─> Action(type="calculate_embedding")
                    └─> DetectionRule(type="pii")
                    └─> Destination(~/Audit/approved)
```

**Answer:** Multi-stage pipeline with actions at each route.

---

## UI Projection Strategies

### Strategy 1: Hierarchical Tree View (Sidebar Navigation)

**Pros:**
- Familiar file-explorer pattern
- Easy to expand/collapse sections
- Good for hierarchical browsing

**Cons:**
- Enforces artificial hierarchy (contradicts peer model)
- Hard to show many-to-many relationships

**Mock:**
```
📁 Sources (2)
├─ 📂 ~/Pictures/Screenshots
│  └─ 🎯 3 active routes
└─ 📂 ~/Downloads
   └─ 🎯 1 active route

📂 Destinations (4)
├─ /MyApp/assets/images (47 items)
├─ /OtherApp/assets (23 items)
└─ ~/Screenshots/inbox (0 items)

🔀 Routes (6 configured)
├─ Route #1: Pictures → MyApp (3 shots left)
├─ Route #2: Pictures → OtherApp (folder exists)
└─ Route #3: Downloads → Archive (always on)

📋 Collections
├─ Inbox (0) ✓
├─ Archive (5)
└─ Routed (226)
```

---

### Strategy 2: Graph Canvas (Visual Network)

**Pros:**
- Directly represents knowledge graph
- Shows many-to-many relationships clearly
- Intuitive for understanding flow

**Cons:**
- Requires space
- Complex interactions (zoom, pan)
- Hard to configure details

**Mock:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   (Source 1)                                           │
│   ~/Pictures ──1──> [Route 1] ──> /MyApp/assets       │
│      │                                   (Dest 1)       │
│      │                                                   │
│      └─────2──> [Route 2] ──> /OtherApp/assets        │
│                                   (Dest 2)               │
│   (Source 2)                                           │
│   ~/Downloads ─1──> [Route 3] ──> ~/Archive           │
│                                   (Dest 3)               │
│                                                         │
│   Legend: ──N──> = Priority N                         │
└─────────────────────────────────────────────────────────┘
```

---

### Strategy 3: Multi-Pane Explorer (Primary Recommendation)

**Pros:**
- Balances graph flexibility with usability
- Left pane: choose perspective (sources/destinations/routes)
- Center pane: list view of selected type
- Right pane: detail view with relationships

**Cons:**
- Requires horizontal space
- More clicks to navigate

**Mock:**
```
┌──────────┬──────────────────────┬───────────────────────┐
│ View By  │ List                 │ Details               │
├──────────┼──────────────────────┼───────────────────────┤
│          │                      │                       │
│● Sources │ ~/Pictures/...       │ Source Details        │
│○ Routes  │ Active • 47 today    │ Path: ~/Pictures/...  │
│○ Destin. │ ┌──────────────────┐ │ Status: 🟢 Watching  │
│○ Collect.│ │Routes Connected: │ │                       │
│          │ │ #1: MyApp (3 left│ │ Connected Routes:     │
│          │ │ #2: Other (idle) │ │ ┌───────────────────┐ │
│          │ │ #3: Fallback     │ │ │ #1: Priority 1    │ │
│          │ └──────────────────┘ │ │ → /MyApp/assets   │ │
│          │ [Configure]          │ │ Mode: 5 shots     │ │
│          │                      │ │ Remaining: 3      │ │
│          │ ~/Downloads          │ │ [Edit] [Remove]   │ │
│          │ Paused • 0 today     │ └───────────────────┘ │
│          │ [Configure]          │                       │
│          │                      │ Policies:             │
│          │                      │ • Retention: 30 days  │
│          │                      │ • PII Detection: OFF  │
│          │                      │ [Edit Policies]       │
│          │                      │                       │
└──────────┴──────────────────────┴───────────────────────┘
```

**Interaction Flow:**
1. User clicks "View By: Sources" → Center pane shows source list
2. User clicks a source → Right pane shows connected routes, policies, stats
3. User clicks route in detail pane → Jumps to route-centric view with that route selected
4. User clicks "View By: Routes" → Center pane shows route list, right pane shows selected route's source + destination
5. User clicks destination in detail pane → Jumps to destination-centric view

---

### Strategy 4: Card-Based Dashboard (Overview First)

**Pros:**
- Good for status overview
- Scannable at a glance
- Mobile-friendly

**Cons:**
- Hard to show detailed relationships
- Less suitable for configuration

**Mock:**
```
┌─ Active Now ────────────────────────────────────────────┐
│ Route: Pictures → MyApp                                 │
│ 🟢 3 of 5 shots remaining  •  Expires in 42m           │
│ Last routed: 2m ago                                     │
└─────────────────────────────────────────────────────────┘

┌─ Sources (2 watching) ──────────────────────────────────┐
│ ~/Pictures/Screenshots  •  47 screenshots today         │
│ ~/Downloads  •  0 screenshots today (paused)            │
└─────────────────────────────────────────────────────────┘

┌─ Inbox ─────────────────────────────────────────────────┐
│ ✓ All clear! (0 items)                                  │
└─────────────────────────────────────────────────────────┘

┌─ Quick Actions ─────────────────────────────────────────┐
│ [Add Route] [Configure Source] [View Archive]           │
└─────────────────────────────────────────────────────────┘
```

---

### Strategy 5: Hybrid Tabs + Graph Detail

**Pros:**
- Tabs for main perspectives (Sources, Routes, Destinations, Collections)
- Within each tab, show mini-graph of relationships
- Best of both worlds

**Cons:**
- Complex implementation
- Requires more screen real estate

**Mock:**
```
┌────────────────────────────────────────────────────────┐
│ [Sources] [Routes] [Destinations] [Collections]        │
├────────────────────────────────────────────────────────┤
│ Sources Tab                                            │
│                                                        │
│ ~/Pictures/Screenshots              [🟢 Watching]      │
│                                                        │
│ ┌─ Route Graph ───────────────────────────────────┐   │
│ │         ┌──> Route #1 ──> /MyApp/assets        │   │
│ │  This ──┼──> Route #2 ──> /OtherApp/assets     │   │
│ │ Source  └──> Route #3 ──> ~/Screenshots/inbox  │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ Policies: Retention (30d), PII Detection (OFF)         │
│ Stats: 47 screenshots today                            │
│                                                        │
│ [Configure Routes] [Edit Policies] [Pause Watching]    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Recommended UI Approach for MVP

**Primary:** Strategy 3 (Multi-Pane Explorer)

**Why:**
- Respects peer model (no artificial hierarchy)
- Flexible perspective switching (source/route/destination centric)
- Detail pane shows relationships clearly
- Scales well as graph complexity grows
- Familiar pattern (file explorer, email clients)

**Navigation Flow:**
```
User wants to see "What routes exist for source X?"
→ Click "View By: Sources"
→ Select source X in center pane
→ Right pane shows connected routes with priorities

User wants to configure "Route Y"
→ Click route in detail pane OR switch to "View By: Routes"
→ Select route Y
→ Right pane shows source, destination, activation rules, policies
→ Click [Edit] to configure
```

**Secondary:** Strategy 4 (Dashboard) for home/overview screen
- Shows "Active Now" status
- Quick actions for common tasks
- Link to detailed explorer (Strategy 3)

---

## Implementation Considerations

### Database Schema Implications

**Core Tables:**
- `source` - watched folders
- `destination` - target folders
- `route` - source→destination connections
- `activation_rule` - conditions for activation
- `policy` - governance rules
- `action` - audit trail + processing steps
- `detection_rule` - content analysis config
- `screenshot` - managed files
- `finding` - detection results

**Junction Tables:**
- `source_activation_rule` (source_id, activation_rule_id)
- `destination_activation_rule` (destination_id, activation_rule_id)
- `route_activation_rule` (route_id, activation_rule_id)
- `source_policy` (source_id, policy_id)
- `destination_policy` (destination_id, policy_id)
- `route_policy` (route_id, policy_id)
- `source_detection_rule` (source_id, detection_rule_id)
- `action_activation_rule` (action_id, activation_rule_id)
- `finding_policy` (finding_id, policy_id)

**Note:** Priority ordering for routes is stored as `route.priority` integer (lower = higher priority).

---

### API Endpoints Implications

**Resource-oriented REST:**
- `GET /api/sources` - list sources
- `GET /api/sources/{id}` - get source details
- `GET /api/sources/{id}/routes` - list routes connected to source
- `GET /api/destinations` - list destinations
- `GET /api/destinations/{id}/routes` - list routes feeding destination
- `GET /api/routes` - list all routes
- `GET /api/routes/{id}` - get route details
- `POST /api/routes` - create route
- `PATCH /api/routes/{id}/priority` - reorder route priority
- `GET /api/screenshots` - list screenshots (with filters)
- `GET /api/screenshots/{id}/actions` - audit trail for screenshot

**Graph Traversal Endpoints:**
- `GET /api/graph/source/{id}` - get source + connected routes + destinations (full subgraph)
- `GET /api/graph/destination/{id}` - get destination + connected routes + sources
- `GET /api/graph/route/{id}` - get route + source + destination + policies

---

## MVP Scope

**In Scope (Core Graph):**
- Source, Destination, Route nodes
- ActivationRule (n_shots, time_based, folder_exists, always_on)
- Policy (retention only)
- Screenshot, Action (basic audit trail)
- Relationships: route↔source, route↔destination, screenshot flow

**Deferred to Post-MVP:**
- Target/Project groupings
- DetectionRule + Analyzer + Finding (PII/IP detection)
- Decision (gating outcomes)
- Advanced policies (detection_triggered, size_limit)
- Advanced actions (compress, embedding, categorize)
- Time window activation rules
- Multi-stage pipelines (destination as source)
- Device/Control Plane (fleet)

---

## Questions for Team Discussion

1. **Route Priority:** Should routes be globally ordered or per-source ordered?
   - **Current assumption:** Per-source ordering (each source has its own route priority list)

2. **Activation Rule Composition:** Should multiple activation rules on same entity use AND or OR logic?
   - **Current assumption:** Single activation rule per entity for MVP; composition deferred

3. **Fallback Behavior:** When all routes inactive, should screenshot:
   - (A) Go to Inbox (virtual collection, not moved)
   - (B) Stay in source folder (not moved)
   - (C) Go to configurable fallback destination
   - **Current assumption:** (A) Inbox virtual collection

4. **Action Execution:** Should actions be:
   - (A) Synchronous (block routing until complete)
   - (B) Asynchronous (queue and process in background)
   - **Current assumption:** (B) Async with status tracking

5. **UI Primary View:** Which Strategy for MVP?
   - **Current recommendation:** Strategy 3 (Multi-Pane Explorer) + Strategy 4 (Dashboard home)

---

## Glossary

- **Node** - Core concept/entity in the knowledge graph
- **Edge** - Relationship between nodes
- **Peer Model** - Sources, destinations, and routes are equal concepts with no ownership hierarchy
- **Activation Rule** - Conditions that determine when something is active (time-based, count-based, folder-based)
- **Policy** - Governance rule that affects screenshot handling
- **Action** - Operation performed on a screenshot (routing, compression, etc.)
- **Collection** - Virtual grouping of screenshots by status (not stored, just query views)
- **Target** - Future concept: higher-level grouping of sources/destinations/routes (projects, pipelines)
- **Finding** - Result from detection rule analysis (PII detected, IP address found, etc.)

---

## Revision History

- 2025-01-16: Initial version - comprehensive knowledge graph model
