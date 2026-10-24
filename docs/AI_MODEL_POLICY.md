# MODEL SELECTION POLICY

This project should use the most efficient Claude model for each task while maintaining code quality.

## Primary Model

Sonnet 5 is the primary development model.

Use Sonnet for:

- Architecture
- Planning
- Backend implementation
- API development
- Authentication
- Authorization
- Database schema changes
- Database migrations
- RevenueCat integration
- Security implementation
- Device registration
- Device synchronization
- Analytics
- Parent dashboard
- Cross-file refactoring
- Multi-package changes
- Complex debugging
- Production bug fixes
- Anything requiring architectural reasoning

## Lightweight Maintenance

Whenever possible, delegate the following tasks to a Haiku 4.5 subagent instead of using Sonnet.

Haiku tasks include:

- Markdown edits
- Documentation updates
- AI_CONTEXT updates
- CHANGELOG updates
- NEXT_TASK updates
- PROJECT_MAP updates
- Formatting
- Renaming variables
- Renaming files
- Import cleanup
- Dead code removal
- Comment cleanup
- Small UI spacing changes
- Styling adjustments
- Icon replacements
- Text copy changes
- Simple validation messages
- Simple TypeScript fixes
- ESLint fixes
- Simple lint cleanup
- Small unit tests
- Snapshot updates
- Boilerplate generation
- JSON edits
- Package version updates

## Delegation Rules

Before beginning work:

Determine whether the task requires architectural reasoning.

If YES:
    Complete using Sonnet.

If NO:
    Delegate to a Haiku 4.5 subagent.

If a task contains both:

1. Complete architectural work with Sonnet.

2. Delegate documentation, cleanup, formatting and maintenance to Haiku.

## Goal

Use Sonnet only where reasoning quality materially affects correctness.

Use Haiku whenever the work is deterministic and localized.

This policy should be applied automatically whenever possible.