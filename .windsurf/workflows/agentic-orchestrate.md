---
description: Workflow-first agentic orchestration trigger backed by the local agentic-orchestrate CLI
---
# /agentic-orchestrate

Use this workflow when a task is multi-step, multi-file, validation-heavy, or risky. Cascade is the generator; the local CLI is the policy, patch, validation, and reporting engine.

1. Classify the request.
   - Simple: continue normally in Cascade.
   - Normal: let Cascade edit files, then run CLI review on the resulting git diff.
   - Safer pre-apply: let Cascade write a unified diff, then have the CLI check/apply it.
   - Risky: run the CLI plan first and ask for approval before edits or patch application.

1. Prepare the target project if needed:

```bash
agentic-orchestrate prepare --project .
```

1. For fast Cascade edit then review, have Cascade edit files and invoke:

```bash
agentic-orchestrate review "<task>" --project .
```

1. For safer diff-file handoff, have Cascade write a unified diff to `.agentic-orchestrator/patches/<slug>.diff`, then invoke:

```bash
agentic-orchestrate check-patch "<task>" --project . --patch-file .agentic-orchestrator/patches/<slug>.diff
agentic-orchestrate run "<task>" --project . --patch-file .agentic-orchestrator/patches/<slug>.diff --auto
```

1. For risky work, invoke before edits:

```bash
agentic-orchestrate plan "<task>" --project .
```

1. Summarize the CLI output in chat.
   - Handoff mode
   - Risk level and reasons
   - Policy decision
   - Files changed or proposed
   - Validation results
   - Required user action
   - Any skipped checks or uncertainty

1. Do not bypass CLI approval gates for high-risk tasks.
