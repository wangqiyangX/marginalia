"use client";

import { useEffect } from "react";

const ZEN_SELECTOR = "[data-zen-body='true']";

let zenRafId: number | null = null;

function applyZenFocus() {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>(ZEN_SELECTOR),
  );
  if (sections.length === 0) {
    return;
  }

  const enabled = document.body.dataset.zenMode === "on";
  if (!enabled) {
    sections.forEach((section) => {
      section.style.setProperty("--zen-focus", "1");
    });
    return;
  }

  const viewportHeight = window.innerHeight;
  const viewportCenter = viewportHeight * 0.5;
  const scrollTop = window.scrollY || window.pageYOffset;
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - viewportHeight,
  );
  const distanceToTop = Math.max(0, scrollTop);
  const distanceToBottom = Math.max(0, maxScroll - scrollTop);
  const topZone = viewportHeight * 0.65;
  const bottomZone = viewportHeight * 0.65;
  const topProgress =
    maxScroll > 0
      ? Math.max(0, Math.min(1, 1 - distanceToTop / topZone))
      : 0;
  const bottomProgress =
    maxScroll > 0
      ? Math.max(0, Math.min(1, 1 - distanceToBottom / bottomZone))
      : 0;

  // Near top/bottom, move the focus anchor toward visible content tails so
  // edge paragraphs can still become active.
  const focusAnchorY =
    viewportCenter -
    viewportHeight * 0.3 * topProgress +
    viewportHeight * 0.3 * bottomProgress;
  const edgeBoost = Math.max(topProgress, bottomProgress);
  const range = viewportHeight * (0.62 + 0.18 * edgeBoost);

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const sectionCenter = rect.top + rect.height * 0.5;
    const distance = Math.abs(sectionCenter - focusAnchorY);
    const normalized = Math.max(0, 1 - distance / range);
    section.style.setProperty("--zen-focus", normalized.toFixed(3));
  });
}

function scheduleZenFocus() {
  if (zenRafId !== null) {
    return;
  }

  zenRafId = window.requestAnimationFrame(() => {
    zenRafId = null;
    applyZenFocus();
  });
}

export function ZenFocusController() {
  useEffect(() => {
    const handleChange = () => scheduleZenFocus();

    const observer = new MutationObserver(() => scheduleZenFocus());
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-zen-mode", "data-translations"],
    });

    window.addEventListener("scroll", handleChange, { passive: true });
    window.addEventListener("resize", handleChange);
    scheduleZenFocus();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleChange);
      window.removeEventListener("resize", handleChange);
    };
  }, []);

  return null;
}
