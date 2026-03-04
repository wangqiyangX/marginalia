"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type TocScaleItem = {
  id: string;
  level: number;
  text: string;
};

type TocScaleProps = {
  items: TocScaleItem[];
};

export function TocScale({ items }: TocScaleProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    if (itemIds.length === 0) {
      return;
    }

    const findActiveId = () => {
      const viewportHeight = window.innerHeight;
      const anchorY = Math.max(80, viewportHeight * 0.28);

      const positions = itemIds
        .map((id) => {
          const el = document.getElementById(id);
          if (!el) {
            return null;
          }
          return { id, top: el.getBoundingClientRect().top };
        })
        .filter(
          (entry): entry is { id: string; top: number } => entry !== null,
        );

      if (positions.length === 0) {
        return null;
      }

      const visible = positions.filter(
        (entry) =>
          entry.top < viewportHeight * 0.92 &&
          entry.top > -viewportHeight * 0.4,
      );

      const candidates = visible.length > 0 ? visible : positions;
      const belowOrAtAnchor = candidates.filter(
        (entry) => entry.top >= anchorY,
      );

      if (belowOrAtAnchor.length > 0) {
        belowOrAtAnchor.sort((a, b) => a.top - b.top);
        return belowOrAtAnchor[0].id;
      }

      candidates.sort((a, b) => b.top - a.top);
      return candidates[0].id;
    };

    let rafId = 0;
    const update = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setActiveId(findActiveId());
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("hashchange", update);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("hashchange", update);
    };
  }, [itemIds]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="fixed left-6 top-1/2 z-20 hidden -translate-y-1/2 overflow-visible lg:block">
      <ul className="space-y-0">
        {items.map((item) => {
          const isHovered = hoveredId === item.id;
          const isActive = activeId === item.id;
          const showLabel = isHovered;

          return (
            <li key={item.id}>
              <Link
                href={`#${item.id}`}
                aria-label={item.text}
                className="relative flex h-4 w-56 items-center"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() =>
                  setHoveredId((current) =>
                    current === item.id ? null : current,
                  )
                }
                onFocus={() => setHoveredId(item.id)}
                onBlur={() =>
                  setHoveredId((current) =>
                    current === item.id ? null : current,
                  )
                }
              >
                <AnimatePresence initial={false} mode="wait">
                  {showLabel ? (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={`block truncate text-xs ${
                        isActive
                          ? "text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      {item.text}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="tick"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{
                        opacity: 1,
                        width: item.level === 3 ? 20 : 28,
                      }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={`block h-1 rounded ${
                        isActive
                          ? "bg-zinc-800 dark:bg-zinc-100"
                          : "bg-zinc-400 dark:bg-zinc-500"
                      }`}
                    />
                  )}
                </AnimatePresence>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
