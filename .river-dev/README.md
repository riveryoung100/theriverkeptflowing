# River Development Agent

The River Development Agent is a repository-local development automation system.

Its purpose is to transform approved project specifications into safe, tested, reviewable local commits.

## Initial Command Model

- `river-dev inspect`
- `river-dev plan`
- `river-dev implement`
- `river-dev verify`
- `river-dev review`
- `river-dev commit`
- `river-dev resume`

## Safety Model

The agent may inspect, plan, edit approved files, run approved checks, review diffs, stage work, and create local commits.

The agent may not push, deploy, access secrets, alter production data, or perform broad destructive operations without explicit human approval.

## Operating Sequence

1. Inspect repository
2. Load specification
3. Produce plan
4. Validate plan against policy
5. Implement approved work
6. Run quality gates
7. Attempt bounded repairs
8. Review final diff
9. Stage approved files
10. Create local commit
11. Produce completion report
