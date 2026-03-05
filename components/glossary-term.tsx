"use client";

import { Fragment, type ReactNode, useId, useState } from "react";

type GlossaryTermProps = {
  term: string;
  explanation: string;
};

type InlineToken = {
  regex: RegExp;
  render: (content: string, key: string) => ReactNode;
};

const INLINE_TOKENS: InlineToken[] = [
  {
    regex: /`([^`]+)`/,
    render: (content, key) => <code key={key}>{content}</code>,
  },
  {
    regex: /\*\*(.+?)\*\*/,
    render: (content, key) => <strong key={key}>{renderInlineMarkdown(content, key)}</strong>,
  },
  {
    regex: /__(.+?)__/,
    render: (content, key) => <strong key={key}>{renderInlineMarkdown(content, key)}</strong>,
  },
  {
    regex: /~~(.+?)~~/,
    render: (content, key) => <del key={key}>{renderInlineMarkdown(content, key)}</del>,
  },
  {
    regex: /\*(.+?)\*/,
    render: (content, key) => <em key={key}>{renderInlineMarkdown(content, key)}</em>,
  },
  {
    regex: /_(.+?)_/,
    render: (content, key) => <em key={key}>{renderInlineMarkdown(content, key)}</em>,
  },
];

function findFirstTokenMatch(input: string): {
  token: InlineToken;
  match: RegExpMatchArray;
} | null {
  let best:
    | {
        token: InlineToken;
        match: RegExpMatchArray;
      }
    | null = null;

  for (const token of INLINE_TOKENS) {
    const match = input.match(token.regex);
    if (!match || typeof match.index !== "number") {
      continue;
    }

    if (!best || match.index < (best.match.index ?? Number.POSITIVE_INFINITY)) {
      best = { token, match };
    }
  }

  return best;
}

function renderInlineMarkdown(input: string, keyPrefix = "md"): ReactNode[] {
  const result: ReactNode[] = [];
  let rest = input;
  let index = 0;

  while (rest.length > 0) {
    const found = findFirstTokenMatch(rest);
    if (!found) {
      result.push(rest);
      break;
    }

    const { token, match } = found;
    const start = match.index ?? 0;
    const full = match[0];
    const inner = match[1];

    if (start > 0) {
      result.push(rest.slice(0, start));
    }

    result.push(token.render(inner, `${keyPrefix}-${index}`));
    rest = rest.slice(start + full.length);
    index += 1;
  }

  return result;
}

function renderTermLabel(term: string) {
  const nodes = renderInlineMarkdown(term.trim(), "term");
  if (nodes.length === 1 && typeof nodes[0] === "string") {
    return nodes[0];
  }

  return nodes.map((node, index) => (
    <Fragment key={`term-node-${index}`}>{node}</Fragment>
  ));
}

export function GlossaryTerm({ term, explanation }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="glossary-term-wrapper">
      <span
        role="button"
        tabIndex={0}
        aria-describedby={tooltipId}
        aria-expanded={open}
        className="glossary-term-trigger"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {renderTermLabel(term)}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={`glossary-term-tooltip ${open ? "glossary-term-tooltip-open" : ""}`}
      >
        {explanation}
      </span>
    </span>
  );
}
