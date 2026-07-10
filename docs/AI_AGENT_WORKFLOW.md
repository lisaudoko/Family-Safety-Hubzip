# SUBAGENT USAGE POLICY

## Purpose

Use subagents whenever parallel analysis or independent research can improve implementation speed or quality.

The coordinating Claude instance is responsible for:

- Planning
- Coordinating subagents
- Reviewing findings
- Making implementation decisions
- Modifying production code
- Integrating changes
- Communicating with the user

---

## Rules

- Automatically determine when subagents are beneficial.
- Launch only the subagents needed for the current task.
- Run multiple subagents in parallel when work does not overlap.
- Consolidate all findings before implementation.
- Prevent duplicate implementations and conflicting architectural changes.
- Follow the existing project architecture and coding standards.

---

## Suggested Subagents

Use subagents as appropriate for:

- Architecture analysis
- Existing code discovery
- Backend analysis
- Database analysis
- Frontend analysis
- Mobile / Expo analysis
- API review
- Security review
- Documentation review
- Testing strategy

---

## Coordination

The coordinating Claude instance must:

1. Launch appropriate subagents.
2. Review all findings.
3. Resolve conflicts.
4. Produce a single implementation plan.
5. Implement one subsystem at a time.
6. Run project verification commands.
7. Update documentation.
8. Produce a completion summary.

---

## Typical Combinations

- Backend feature → Backend + Existing Code + Database + Security
- API change → Backend + API + Security
- Database change → Database + Backend
- Mobile feature → Mobile + Backend
- RevenueCat → Mobile + Backend + Security
- Parent dashboard → Backend + Frontend + API
- Architecture change → Architecture + Documentation

Launch only the subagents required for the current task.

---

## Completion

A subsystem is complete only when:

- Implementation is finished.
- Verification passes.
- Documentation is updated.
- AI_CONTEXT reflects the change.
- Relevant decisions are documented.
- A completion summary has been generated.