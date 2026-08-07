## Summary of Consolidation Pass

Processed the following clusters:

1. **Hermes Agent**: Consolidated `hermes-cli-usage` and `hermes-agent-skill-authoring` into `hermes-agent`, adding CLI usage patterns and skill authoring sections.
2. **ASCII Media**: Created new `ascii-media` skill consolidating `ascii-art` and `ascii-video`, moving their content to `references/` subfiles and deleting the source skills.
3. **GitHub Workflow**: Created new `github` skill consolidating `github-auth`, `github-code-review`, `github-issues`, `github-pr-workflow`, `github-repo-management`, and `codebase-inspection`.
4. **MLOps**: Created new `mlops` skill consolidating `huggingface-hub`, `lm-evaluation-harness`, `weights-and-biases`, `llama-cpp`, `obliteratus`, `vllm`, `audiocraft`, and `segment-anything`.

All absorbed skills have been archived with their content merged into the respective umbrella skills.

## Structured summary (required)
```yaml
consolidations:
  - from: hermes-cli-usage
    into: hermes-agent
    reason: "Combined CLI usage patterns and skill authoring guidance into a unified Hermes agent skill."
  - from: hermes-agent-skill-authoring
    into: hermes-agent
    reason: "Combined CLI usage patterns and skill authoring guidance into a unified Hermes agent skill."
  - from: ascii-art
    into: ascii-media
    reason: "Consolidated ASCII art and video production into a class-level skill with labeled subsections."
  - from: ascii-video
    into: ascii-media
    reason: "Consolidated ASCII art and video production into a class-level skill with labeled subsections."
  - from: github-auth
    into: github
    reason: "Consolidated GitHub authentication and related workflows into a unified GitHub skill."
  - from: github-code-review
    into: github
    reason: "Consolidated GitHub authentication and related workflows into a unified GitHub skill."
  - from: github-issues
    into: github
    reason: "Consolidated GitHub authentication and related workflows into a unified GitHub skill."
  - from: github-pr-workflow
    into: github
    reason: "Consolidated GitHub authentication and related workflows into a unified GitHub skill."
  - from: github-repo-management
    into: github
    reason: "Consolidated GitHub authentication and related workflows into a unified GitHub skill."
  - from: codebase-inspection
    into: github
    reason: "Consolidated GitHub authentication and related workflows into a unified GitHub skill."
  - from: huggingface-hub
    into: mlops
    reason: "Consolidated MLOps tools and frameworks into a unified machine learning operations skill."
  - from: lm-evaluation-harness
    into: mlops
    reason: "Consolidated MLOps tools and frameworks into a unified machine learning operations skill."
  - from: weights-and-biases
    into: mlops
    reason: "Consolidated MLOps tools and frameworks into a unified machine learning operations skill."
  - from: llama-cpp
    into: mlops
    reason: "Consolidated MLOps tools and frameworks into a unified machine learning operations skill."
  - from: obliteratus
    into: mlops
    reason: "Consolidated MLOps tools and frameworks into a unified machine learning operations skill."
  - from: vllm
    into: mlops
    reason: "Consolidated MLOps tools and frameworks into a unified machine learning operations skill."
  - from: audiocraft
    into: mlops
    reason: "Consolidated MLOps tools and frameworks into a unified machine learning operations skill."
  - from: segment-anything
    into: mlops
    reason: "Consolidated MLOps tools and frameworks into a unified machine learning operations skill."
prunings: []
```