# ShotRouter — Testing Strategy

## Unit
- Naming formatter (token expansion, collision suffixes)
- Debounce policy
- Claim algorithm (mock FS)
- Hashing + move/copy strategies
- Policy evaluation (approve/gate/quarantine)
- Analyzer adapter contracts (timeouts, error paths)

## Integration (Linux first)
- In‑repo temp folders simulate OS sources
- Create temp file patterns, ensure router claims/moves/renames
- Crash recovery: leave claim file, restart, verify continue
 - Scan pipeline: run stub analyzer; verify findings persisted and decisions applied

## API
- REST endpoints and error codes
- WS events ordering
 - New endpoints: scans, findings, policies, approve/quarantine

## UI (Cypress/Playwright)
- Inbox list updates on WS events
- Route action moves item and shows toast
 - Findings panel populates after scan; gating banner behavior
 - Quarantine/Approve flows with reasons

## Windows/macOS
- FS watcher correctness on platform
- Cross‑volume copy+verify+delete

## Performance
- Many small screenshots in bursts
- Large file hashing deferred
 - Analyzer concurrency limits, timeouts

## Fixtures
- Source dir: synthetic screenshots with different names/locales
- Repo dir: empty assets/images; verify final names and relpaths
 - Analyzer outputs: canned findings for deterministic tests
