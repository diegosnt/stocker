# Skill Registry for stocker

## Compact Rules

### sdd-init
- Detect stack (package.json, README)
- Detect testing (runners, coverage, layers)
- Resolve Strict TDD Mode (priority: system prompt -> config -> detection)
- Persist context to Engram (sdd-init/{project})
- Persist testing capabilities (sdd/{project}/testing-capabilities)

### sdd-explore
- Research codebase using grep/glob
- Propose architecture or bug fix strategy
- Compare approaches with tradeoffs
- Do not modify files

### sdd-propose
- Create proposal for a change
- Include intent, scope, and approach
- Detail affected files and modules

### sdd-spec
- Write RFC 2119 specs (MUST, SHALL)
- Use Given/When/Then for scenarios
- Cover functional and non-functional requirements

### sdd-design
- Technical implementation details
- Architecture decisions with rationale
- UI/UX strategy for frontend changes

### sdd-tasks
- Break down implementation into small steps
- Group by phase (Infra, Code, Test)
- Use hierarchical numbering

### sdd-apply
- Surgical, targeted edits (replace)
- Follow project conventions (Vanilla JS, Express)
- Add tests for new features/bug fixes

### sdd-verify
- Check implementation against specs
- Run tests and quality tools
- Report CRITICAL/WARNING/SUGGESTION

### sdd-archive
- Sync delta specs to main specs
- Clean up change artifacts
- Save archive report to Engram

### go-testing
- Go testing patterns (teatest)
- Bubbletea TUI testing

### branch-pr
- PR creation with issue-first enforcement

### issue-creation
- GitHub issue creation following team rules

### judgment-day
- Dual-blind review protocol

## User Skills Trigger Table

| Skill | Trigger |
|-------|---------|
| sdd-init | sdd init, iniciar sdd, openspec init |
| sdd-explore | think through, investigate codebase, clarify requirements |
| sdd-propose | create proposal, update proposal |
| sdd-spec | write specs, update specs |
| sdd-design | technical design, architecture decisions |
| sdd-tasks | break down change, task checklist |
| sdd-apply | implement tasks, write actual code |
| sdd-verify | validate implementation, verify against specs |
| sdd-archive | close change, archive change |
| go-testing | Go tests, Bubbletea TUI testing |
| branch-pr | create PR, open PR, prepare for review |
| issue-creation | GitHub issue, bug report, feature request |
| judgment-day | judgment day, review adversarial, dual review, juzgar |
| skill-creator | create new skill, add agent instructions |
