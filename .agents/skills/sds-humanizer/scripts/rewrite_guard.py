#!/usr/bin/env python3
"""Lightweight guard for SDS Humanizer rewrites.

Checks three things:
1. Protected literals from the source that disappeared from the rewrite.
2. Agent-motion wording that remains in external/report modes.
3. Markdown structure from the source that shrank or changed in the rewrite
   (frontmatter block, checkbox states, table shapes, footnotes, code fences).
   The _humanized file is regenerated whole, so dropped structure is a real
   failure mode; cell/list TEXT may change freely — only the shape is compared.

With --check-ai-words, it also reports common AI-polished wording as warnings.

This is intentionally heuristic. It is a smoke test, not a proof of fidelity.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


PROTECTED_PATTERNS = {
    "uuid": r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b",
    # Require at least one a-f letter so plain long numbers (dates, amounts) are not
    # mistaken for hashes, and raise the floor to 12 chars (short hex words like
    # "accededf" are far more likely to be prose than a truncated hash).
    "hash": r"\b(?=[0-9a-fA-F]*[a-f])[0-9a-f]{12,40}\b",
    "iso_date": r"\b\d{4}-\d{2}-\d{2}\b",
    "kr_date": r"\b\d{4}년\s*\d{1,2}월\s*\d{1,2}일\b",
    # v-prefixed or 3-part versions only; a bare "2.1" is usually a section number
    # or a decimal, and flagging those turns the guard into noise.
    "version": r"(?<![\w.])(?:v\d+\.\d+(?:\.\d+)?|\d+\.\d+\.\d+)(?:-[A-Za-z0-9._-]+)?(?![\w.])",
    # Korean letters are \w, so \b fails both before "약5%" and after "원과"
    # (unit + particle) — use explicit digit/letter guards instead of \b, and put
    # longer units first so "3개월" is not captured as "3개".
    "number_unit": r"(?<![0-9.])\d+(?:\.\d+)?\s?(?:%|만원|억원|원|명|개월|개|건|회|시간|초|분|일|주|년|ms|s|KB|MB|GB|TB)(?![A-Za-z0-9])",
    # Straight and curly double quotes, plus Korean corner brackets.
    "double_quote": r'"[^"\n]+"|“[^”\n]+”|「[^」\n]+」|『[^』\n]+』',
    "path": r"(?:[A-Za-z]:\\[^\s]+|(?:\.{1,2}/|/)[^\s]+)",
}

# Path tokens are matched greedily to the next whitespace, which drags in trailing
# markdown emphasis, punctuation, and attached Korean endings/particles
# ("/helper.py`)**:", "/anthropics/skills다."). A register-switch rewrite changes
# those endings, so unnormalized tokens structurally FAIL on every such path.
# Cut the token at the first character outside the path charset, then strip
# trailing sentence punctuation.
PATH_CHARS = frozenset(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    "._~/\\+@%=:-"
)
PATH_TRAILING_PUNCT = ".,:;\"'`"


def normalize_path_token(value: str) -> str:
    kept: list[str] = []
    for ch in value:
        if ch not in PATH_CHARS:
            break
        kept.append(ch)
    return "".join(kept).rstrip(PATH_TRAILING_PUNCT)

K_RESIDUE_PATTERNS = [
    r"박아\s*(?:넣|두|둔|놓)",
    r"박혀\s*있",
    r"메모리에\s*박",
    r"찔러\s*넣",
    r"때려\s*넣",
    r"긁어\s*(?:오|모)",
    r"갈아\s*(?:엎|끼)",
    r"산출물을\s*뱉",
    r"파이프라인을\s*태",
    r"한\s*콜\s*안에서",
    r"도구\s*호출\s*chain",
]

NON_SECURITY_INJECTION = [
    r"컨텍스트\s*주입",
    r"프롬프트에?\s*주입",
    r"에이전트에?\s*주입",
]

# If any of these appear near an injection-wording hit, the text is discussing
# security (attack technique), where the term is established vocabulary and must
# be preserved — the mode flag alone cannot make this span-level call.
SECURITY_CONTEXT = r"보안|공격|취약|방어|탐지|인젝션|injection|attack|exploit"
SECURITY_CONTEXT_WINDOW = 80

AI_WORD_PATTERNS = {
    "label-transition": [
        r"결론적으로",
        r"요약하면",
        r"정리하자면",
        r"중요한\s*점은",
        r"주목할\s*만한\s*점은",
        r"이러한\s*맥락에서",
        r"이를\s*통해",
        r"더\s*나아가",
    ],
    "hollow-emphasis": [
        r"혁신적",
        r"획기적",
        r"강력한",
        r"효과적",
        r"효율적",
        r"핵심적",
        r"중추적",
        r"포괄적",
        r"종합적",
        r"다각적",
        r"유의미한",
    ],
    "translated-cliche": [
        r"깊이\s*파고들",
        r"심층적으로\s*탐구",
        r"복잡한\s*상호작용",
        r"디지털\s*(?:환경|풍경)",
        r"끊임없이\s*(?:변화|진화)",
        r"가능성을\s*열",
        r"잠재력을\s*끌어내",
    ],
    "marketing-hype": [
        r"최첨단",
        r"차세대",
        r"게임\s*체인저",
        r"시너지",
        r"혁신적인\s*솔루션",
        r"확장\s*가능한\s*솔루션",
        r"원활한\s*경험",
        r"새로운\s*지평",
    ],
    "report-filler": [
        r"시사하는\s*바가\s*크",
        r"향후\s*연구가\s*필요",
        r"중요한\s*과제로\s*남",
        r"긍정적인\s*영향을\s*미칠\s*것으로\s*기대",
    ],
}


def read_text(path: str) -> str:
    # utf-8-sig: a Windows BOM would otherwise sit at position 0 and silently
    # defeat the \A-anchored frontmatter check (and first-line token matches).
    return Path(path).read_text(encoding="utf-8-sig")


def normalize_match(match: str | tuple[str, ...]) -> str:
    return match if isinstance(match, str) else "".join(match)


def unique_matches(text: str, pattern: str) -> list[str]:
    return sorted({normalize_match(match) for match in re.findall(pattern, text)})


def collect_protected(text: str) -> dict[str, list[str]]:
    collected: dict[str, list[str]] = {}
    for name, pattern in PROTECTED_PATTERNS.items():
        values = unique_matches(text, pattern)
        if name == "path":
            values = sorted(
                {
                    token
                    for token in (normalize_path_token(value) for value in values)
                    if len(token) > 1
                }
            )
        collected[name] = values
    return collected


def missing_literals(source: str, rewrite: str) -> list[dict[str, str]]:
    missing: list[dict[str, str]] = []
    for name, values in collect_protected(source).items():
        for value in values:
            if value not in rewrite:
                missing.append({"type": name, "value": value})
    return missing


# --- Markdown structure preservation ---------------------------------------
# Patterns may also match inside code fences; that is harmless here because
# code blocks are themselves preserved verbatim, so both sides match equally.
# Pass 5.5 converts numbered retrospective lists to paragraphs — that is out of
# scope for these checks on purpose: none of the tokens below belong to it.
# Any shape difference fails in BOTH directions: dropped structure loses source
# content, added structure invents content the source never had.

FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.DOTALL)
# A frontmatter body must open with a YAML mapping key; a doc that merely starts
# with a horizontal-rule pair framing prose is NOT frontmatter (its prose stays
# rewritable).
YAML_KEY_RE = re.compile(r"[ \t]*[A-Za-z0-9_'\"-]+[ \t]*:")
# Bulleted (- * +) and numbered (1. / 1)) GFM task-list items both carry states.
CHECKBOX_RE = re.compile(r"^[ \t]*(?:[-*+]|\d{1,3}[.)])[ \t]+\[([ xX])\]", re.MULTILINE)
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$")
FOOTNOTE_DEF_RE = re.compile(r"^\[\^([^\]\s]+)\]:", re.MULTILINE)
FOOTNOTE_REF_RE = re.compile(r"\[\^([^\]\s]+)\](?!:)")
# CommonMark: a fence may be indented at most 3 spaces — 4+ is an indented code
# block, whose ``` lines are content, not fences.
FENCE_LINE_RE = re.compile(r"^ {0,3}([`~]{3,})[ \t]*(\S*)")


def _normalize_eol(text: str) -> str:
    return text.replace("\r\n", "\n")


def frontmatter_block(text: str) -> str | None:
    match = FRONTMATTER_RE.match(_normalize_eol(text))
    if not match:
        return None
    first_line = next((ln for ln in match.group(1).split("\n") if ln.strip()), "")
    if not YAML_KEY_RE.match(first_line):
        return None
    return match.group(0)


def checkbox_counts(text: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for state in CHECKBOX_RE.findall(text):
        key = state.lower()
        counts[key] = counts.get(key, 0) + 1
    return counts


def table_shapes(text: str) -> list[list[int]]:
    """Per table (a run of consecutive pipe rows), the pipe count of each row.

    Escaped pipes (\\|) are cell text, not column separators — strip them before
    counting so rewording such cells stays legal. Pipes inside inline code are a
    known residual limitation.
    """
    shapes: list[list[int]] = []
    current: list[int] = []
    for line in _normalize_eol(text).split("\n"):
        if TABLE_ROW_RE.match(line):
            current.append(line.replace("\\|", "").count("|"))
        elif current:
            shapes.append(current)
            current = []
    if current:
        shapes.append(current)
    # A lone pipe row is more likely prose than a table — require 2+ rows.
    return [shape for shape in shapes if len(shape) >= 2]


def footnote_labels(text: str) -> tuple[set[str], set[str]]:
    return set(FOOTNOTE_DEF_RE.findall(text)), set(FOOTNOTE_REF_RE.findall(text))


def fence_langs(text: str) -> dict[str, int]:
    """Multiset of opening-fence language tags ('' when untagged).

    The closer must use the same fence character, be at least as long as the
    opener, and carry no info string (CommonMark) — so a ``` line inside a
    ```` block is content, not a closer.
    """
    counts: dict[str, int] = {}
    open_char: str | None = None
    open_len = 0
    for line in _normalize_eol(text).split("\n"):
        match = FENCE_LINE_RE.match(line)
        if not match:
            continue
        marker, lang = match.group(1), match.group(2)
        if open_char is None:
            open_char = marker[0]
            open_len = len(marker)
            counts[lang] = counts.get(lang, 0) + 1
        elif marker[0] == open_char and len(marker) >= open_len and not lang:
            open_char = None
    return counts


def structure_issues(source: str, rewrite: str) -> list[dict[str, str]]:
    issues: list[dict[str, str]] = []

    src_front = frontmatter_block(source)
    if src_front is not None and frontmatter_block(rewrite) != src_front:
        issues.append(
            {
                "type": "frontmatter",
                "detail": "source YAML frontmatter block is missing or altered in the rewrite",
            }
        )

    src_boxes, out_boxes = checkbox_counts(source), checkbox_counts(rewrite)
    if src_boxes != out_boxes:
        issues.append(
            {
                "type": "checkbox",
                "detail": f"checkbox states changed: source {src_boxes or '{}'} vs rewrite {out_boxes or '{}'}",
            }
        )

    src_tables, out_tables = table_shapes(source), table_shapes(rewrite)
    if len(src_tables) != len(out_tables):
        issues.append(
            {
                "type": "table",
                "detail": f"table count changed: source {len(src_tables)} vs rewrite {len(out_tables)}",
            }
        )
    else:
        for index, (src_shape, out_shape) in enumerate(zip(src_tables, out_tables), start=1):
            if src_shape != out_shape:
                issues.append(
                    {
                        "type": "table",
                        "detail": f"table {index} shape changed: rows/pipes {src_shape} vs {out_shape}",
                    }
                )

    src_defs, src_refs = footnote_labels(source)
    out_defs, out_refs = footnote_labels(rewrite)
    for label in sorted(src_defs - out_defs):
        issues.append({"type": "footnote", "detail": f"footnote definition [^{label}] disappeared"})
    # Only refs with a matching definition are real footnotes — this keeps regex
    # character classes in prose ("[^abc]") from being tracked as references.
    for label in sorted((src_refs & src_defs) - out_refs):
        issues.append({"type": "footnote", "detail": f"footnote reference [^{label}] disappeared"})

    src_fences, out_fences = fence_langs(source), fence_langs(rewrite)
    if src_fences != out_fences:
        issues.append(
            {
                "type": "code_fence",
                "detail": f"code-fence blocks changed: source {src_fences or '{}'} vs rewrite {out_fences or '{}'}",
            }
        )

    return issues


def in_security_context(text: str, start: int, end: int) -> bool:
    window = text[max(0, start - SECURITY_CONTEXT_WINDOW) : end + SECURITY_CONTEXT_WINDOW]
    return re.search(SECURITY_CONTEXT, window, re.IGNORECASE) is not None


def k_residue(rewrite: str, mode: str) -> list[str]:
    if mode in {"internal", "chat"}:
        return []
    found: set[str] = set()
    for pattern in K_RESIDUE_PATTERNS:
        for match in re.finditer(pattern, rewrite):
            found.add(match.group(0))
    if mode != "security":
        # Injection wording is only a K-residue when the surrounding span is NOT
        # discussing security — there the term is established vocabulary.
        for pattern in NON_SECURITY_INJECTION:
            for match in re.finditer(pattern, rewrite):
                if not in_security_context(rewrite, match.start(), match.end()):
                    found.add(match.group(0))
    return sorted(found)


def ai_word_hits(rewrite: str, per_1000_threshold: float = 2.0) -> list[dict[str, int | str]]:
    """Report AI-word families only when they cluster.

    These lists are detection priors, not banned words: one "효율적" in a page of
    text is normal human writing. A family is reported only when its total hit
    count exceeds the density threshold (hits per 1,000 chars, min floor 2), so
    the guard pressures clusters — not every ordinary precise word — and the
    rewrite is never pushed toward a converged substitute vocabulary.
    """
    floor = max(2.0, per_1000_threshold * max(len(rewrite), 1) / 1000.0)
    hits: list[dict[str, int | str]] = []
    for family, patterns in AI_WORD_PATTERNS.items():
        family_hits: list[dict[str, int | str]] = []
        family_total = 0
        for pattern in patterns:
            matches = [normalize_match(match) for match in re.findall(pattern, rewrite)]
            family_total += len(matches)
            for value in sorted(set(matches)):
                family_hits.append(
                    {
                        "type": family,
                        "value": value,
                        "count": matches.count(value),
                    }
                )
        if family_total >= floor:
            hits.extend(family_hits)
    return hits


def main() -> int:
    parser = argparse.ArgumentParser(description="Check SDS Humanizer rewrite guardrails.")
    parser.add_argument("--source", required=True, help="Original text file")
    parser.add_argument("--rewrite", required=True, help="Rewritten text file")
    parser.add_argument(
        "--mode",
        choices=["external", "internal", "chat", "security"],
        default="external",
        help="Use-case mode for K-word residue checks",
    )
    parser.add_argument(
        "--check-ai-words",
        action="store_true",
        help="Report common AI-polished wording as warnings",
    )
    parser.add_argument(
        "--fail-on-ai-words",
        action="store_true",
        help="Treat AI-word warnings as failures; implies --check-ai-words",
    )
    parser.add_argument(
        "--ai-word-threshold",
        type=float,
        default=2.0,
        help="AI-word family density threshold (hits per 1,000 chars, floor 2)",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON")
    args = parser.parse_args()

    source = read_text(args.source)
    rewrite = read_text(args.rewrite)

    result = {
        "missing_literals": missing_literals(source, rewrite),
        "k_residue": k_residue(rewrite, args.mode),
        "structure_issues": structure_issues(source, rewrite),
        "ai_word_hits": ai_word_hits(rewrite, args.ai_word_threshold)
        if args.check_ai_words or args.fail_on_ai_words
        else [],
    }
    result["ok"] = (
        not result["missing_literals"]
        and not result["k_residue"]
        and not result["structure_issues"]
        and (not args.fail_on_ai_words or not result["ai_word_hits"])
    )

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        if result["ok"]:
            print("PASS: no missing protected literals, structure loss, or disallowed K wording found")
        else:
            print("FAIL: rewrite guard found issues")
            for item in result["missing_literals"]:
                print(f"- missing {item['type']}: {item['value']}")
            for item in result["k_residue"]:
                print(f"- K wording remains: {item}")
            for item in result["structure_issues"]:
                print(f"- structure {item['type']}: {item['detail']}")
        if result["ai_word_hits"]:
            print("WARN: AI-word candidates found")
            for item in result["ai_word_hits"]:
                print(f"- {item['type']}: {item['value']} (count {item['count']})")

    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
