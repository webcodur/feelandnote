# Fidelity Checklist

Run this checklist before returning the rewritten text.

## Exact Preservation

- Numbers, percentages, amounts, dates, versions.
- Names of people, organizations, products, models, projects.
- File paths, command names, config keys, API names.
- IDs, hashes, issue numbers, PR numbers, run IDs.
- Direct quotes.
- Code blocks and raw command output.
- Legal clauses and security vulnerability terms.
- Markdown structure carried from the source: the YAML frontmatter block, each table's row and
  column counts, checkbox states (`[ ]` / `[x]`), footnote definitions and references, and
  code-fence language tags. Cell and item text may be rewritten; the counted tokens themselves
  must match in both directions — dropping and adding structure both fail. Plain bullet and
  numbered lists are not counted, so Pass 5.5 may still convert them to paragraphs.

## Meaning Preservation

Ask:

- Did the main claim stay the same?
- Did a possibility become a certainty?
- Did a warning become a result?
- Did a failure become a success?
- Did cause and effect reverse?
- Did "some", "most", or "all" change level?
- Did the rewrite add a reason not present in the source?
- Did it remove a condition or limitation?

## Register Preservation

Ask:

- Does the result match the chosen register?
- Did formal writing become too casual?
- Did casual writing become stiff?
- Did a technical document lose necessary terms?

## Agent-Wording Checks

For external/report modes:

- K-1/K-2 should be gone unless quoted or security-specific.
- "박다" should not replace "지정하다" or "반영하다".
- Non-security "주입" should be rewritten.

For security modes:

- SQL 주입, 명령 주입, 코드 주입, 프롬프트 인젝션, injection attack should remain as security terms.

## Change-Rate Judgment

Estimate change roughly:

- Under 30%: usually safe.
- 30-50%: mention that the rewrite is substantial if the document is important.
- Over 50%: use a conservative rewrite or ask before returning a heavily changed version.

If a checklist item fails, revise again or state the limitation.
