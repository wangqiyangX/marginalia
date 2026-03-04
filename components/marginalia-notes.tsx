"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type MarginaliaNotesProps = {
  anchorId: string;
  notes: string[];
};

export function MarginaliaNotes({ anchorId, notes }: MarginaliaNotesProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [truncated, setTruncated] = useState<boolean[]>(() =>
    notes.map(() => false),
  );
  const [isVisible, setIsVisible] = useState(false);
  const noteRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (expandedIndex !== null) {
      return;
    }

    const next = notes.map((_, index) => {
      const el = noteRefs.current[index];
      if (!el) {
        return false;
      }
      return el.scrollHeight > el.clientHeight + 1;
    });
    setTruncated(next);
  }, [expandedIndex, notes]);

  useEffect(() => {
    const target = document.getElementById(anchorId);
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -15% 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [anchorId]);

  return (
    <AnimatePresence initial={false}>
      {isVisible ? (
        <motion.aside
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`mt-2 space-y-2 md:absolute md:inset-y-0 md:left-full md:ml-6 md:mt-0 md:w-56 ${
            expandedIndex === null
              ? "md:overflow-hidden"
              : "md:overflow-visible"
          }`}
        >
          {notes.map((note, noteIndex) => {
            if (expandedIndex !== null && expandedIndex !== noteIndex) {
              return null;
            }

            const isExpanded = expandedIndex === noteIndex;
            const isTruncated = truncated[noteIndex];
            const rotationClass =
              noteIndex % 2 === 0 ? "-rotate-1" : "rotate-1";

            return (
              <div key={`note-${noteIndex}`} className="space-y-1">
                <button
                  ref={(el) => {
                    noteRefs.current[noteIndex] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedIndex(null);
                      return;
                    }
                    if (isTruncated) {
                      setExpandedIndex(noteIndex);
                    }
                  }}
                  className={`marginalia-note text-left ${rotationClass} ${
                    isExpanded
                      ? "w-full max-w-none md:max-w-[22rem]"
                      : "marginalia-note-collapsed"
                  } ${isTruncated || isExpanded ? "cursor-pointer" : "cursor-default"}`}
                >
                  {note}
                  {!isExpanded && isTruncated ? " …" : ""}
                </button>

                {isExpanded ? (
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(null)}
                    className="text-[11px] text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    收起
                  </button>
                ) : null}
              </div>
            );
          })}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
