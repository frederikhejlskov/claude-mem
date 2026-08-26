# Controlled fork maintenance

`sync-upstream.yml` checks `thedotmack/claude-mem` weekly. It merges new
upstream commits into this fork, resolves only known generated-file version
conflicts, rebuilds the plugin, and runs the core test suite.

The test job has read-only repository permission. A separate promotion job has
write permission but never executes candidate code. It only verifies and
fast-forwards the tested Git commit.

Upstream changes to `.github/workflows/` are deliberately not imported. The
fork keeps its reviewed workflow definitions so upstream build code cannot
turn a dependency update into a repository-token escalation.

The personal fork force-tracks `plugin/.install-version`. The version helper
keeps it aligned with each tested build so Claude Code and Codex marketplace
auto-updates do not require a second manual repair step on Fred's prepared
machine.

Manual dry run:

```bash
gh workflow run sync-upstream.yml --repo frederikhejlskov/claude-mem \
  -f force=true -f dry_run=true
```
