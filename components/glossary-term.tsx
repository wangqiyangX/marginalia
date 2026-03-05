"use client";

import { useId, useState } from "react";

type GlossaryTermProps = {
  term: string;
  explanation: string;
};

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
        {term}
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
