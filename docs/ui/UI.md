# ShotRouter — UI (Primary Interface)

Single‑page app served by the local daemon. Keyboard‑friendly, mouse‑simple. First‑class, CLI optional.

## Layout

- Top bar: "ShotRouter" + status (watching N sources) + quick "Arm Next" button
- Tabs: Inbox | Findings | Quarantine | Routed | Targets | Settings
- Right side: Details panel (thumbnail, path, actions, findings/policy)

## Inbox

Columns: thumb | created_at | size | source | actions

Actions per row:
- Approve (if gated) → route now
- Route → choose target (recent repos + browse)
- Quarantine → move to quarantine store
- Delete
- Copy path (relative if routed)

Bulk actions:
- Route approved to <target>
- Approve selected | Quarantine selected | Delete selected

## Findings & Quarantine

- Findings panel shows analyzer results and severities; link to policy decisions.
- Quarantine lists items held by policy; supports approve/override with reason and export.

## Routed

Columns: thumb | moved_at | dest_path | repo | actions

Actions:
- Reveal in file explorer
- Copy relative path
- Add note / tag (future)

## Targets & Sources

- Targets: list/add repo/doc store targets; set defaults.
- Sources: list watched folders with on/off toggle and debounce value. Add/remove sources.

## Settings

- Inbox dir (if used)
- API token (optional)
- Hashing policy (e.g., immediate/idle)
- Analyzer settings (enable/disable, model selection)
- Policy preview (effective rules)

## Toasts

- "New screenshot detected"
- "Routed to <repo>/assets/images/...png"
- Errors with retry buttons

## WS Events → UI

- screenshot.new: insert into Inbox
- scan.started: mark scanning
- scan.completed: show findings; update decision
- decision.updated: reflect gating/approval/quarantine
- screenshot.routed: move item to Routed; show toast
- screenshot.quarantined: move to Quarantine; show banner
- screenshot.error: badge with details
