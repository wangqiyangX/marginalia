"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type CSSProperties, useState } from "react";

const NOTE_GAP_PX = 12;
const DESKTOP_QUERY = "(min-width: 768px)";
const FOCUS_FRAME_ID = "marginalia-focus-frame";
const FOCUS_CLEAR_DELAY_MS = 220;
const FOCUS_PAD = { top: 5, right: 5, bottom: 5, left: 9 };

let reflowRafId: number | null = null;
let activeAnchorId: string | null = null;
let pendingClearTimer: number | null = null;
let focusFrameRafId: number | null = null;
let focusFrameListenersBound = false;

function ensureFocusFrame(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const existing = document.getElementById(FOCUS_FRAME_ID);
  if (existing) {
    return existing;
  }

  const frame = document.createElement("div");
  frame.id = FOCUS_FRAME_ID;
  frame.className = "marginalia-focus-frame";
  frame.setAttribute("aria-hidden", "true");
  frame.style.top = "0px";
  frame.style.left = "0px";
  frame.style.width = "0px";
  frame.style.height = "0px";
  frame.style.opacity = "0";
  frame.style.zIndex = "9999";
  document.body.appendChild(frame);
  return frame;
}

function positionFocusFrame(anchorId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const anchor = document.getElementById(anchorId);
  const frame = ensureFocusFrame();
  if (!anchor || !frame) {
    console.debug("[marginalia-focus] position skipped", {
      anchorId,
      hasAnchor: Boolean(anchor),
      hasFrame: Boolean(frame),
    });
    return;
  }

  const rect = anchor.getBoundingClientRect();
  const top = rect.top - FOCUS_PAD.top;
  const left = rect.left - FOCUS_PAD.left;
  const width = rect.width + FOCUS_PAD.left + FOCUS_PAD.right;
  const height = rect.height + FOCUS_PAD.top + FOCUS_PAD.bottom;

  frame.style.top = `${Math.round(top)}px`;
  frame.style.left = `${Math.round(left)}px`;
  frame.style.width = `${Math.round(width)}px`;
  frame.style.height = `${Math.round(height)}px`;
  console.debug("[marginalia-focus] positioned", {
    anchorId,
    top: Math.round(top),
    left: Math.round(left),
    width: Math.round(width),
    height: Math.round(height),
  });
}

function setFocusFrameVisible(nextVisible: boolean) {
  const frame = ensureFocusFrame();
  if (!frame) {
    console.debug("[marginalia-focus] visibility skipped (no frame)");
    return;
  }
  frame.style.opacity = nextVisible ? "1" : "0";
  console.debug("[marginalia-focus] visible", { nextVisible });
}

function scheduleFocusFramePositionSync() {
  if (typeof window === "undefined" || focusFrameRafId !== null) {
    return;
  }

  focusFrameRafId = window.requestAnimationFrame(() => {
    focusFrameRafId = null;
    if (!activeAnchorId) {
      return;
    }
    positionFocusFrame(activeAnchorId);
  });
}

function bindFocusFrameListeners() {
  if (typeof window === "undefined" || focusFrameListenersBound) {
    return;
  }

  const handleViewportChange = () => {
    scheduleFocusFramePositionSync();
  };

  window.addEventListener("scroll", handleViewportChange, { passive: true });
  window.addEventListener("resize", handleViewportChange);
  focusFrameListenersBound = true;
}

function clearPendingAnchorReset() {
  if (typeof window === "undefined" || pendingClearTimer === null) {
    return;
  }
  window.clearTimeout(pendingClearTimer);
  pendingClearTimer = null;
}

function activateAnchorHighlight(anchorId: string) {
  console.debug("[marginalia-focus] activate", { anchorId });
  clearPendingAnchorReset();
  activeAnchorId = anchorId;
  bindFocusFrameListeners();
  positionFocusFrame(anchorId);
  setFocusFrameVisible(true);
}

function scheduleAnchorHighlightClear(anchorId: string) {
  if (typeof window === "undefined") {
    return;
  }

  console.debug("[marginalia-focus] schedule clear", { anchorId });
  clearPendingAnchorReset();
  pendingClearTimer = window.setTimeout(() => {
    pendingClearTimer = null;
    if (activeAnchorId === anchorId) {
      activeAnchorId = null;
      setFocusFrameVisible(false);
      console.debug("[marginalia-focus] cleared", { anchorId });
      return;
    }
    console.debug("[marginalia-focus] clear skipped (anchor switched)", {
      anchorId,
      activeAnchorId,
    });
  }, FOCUS_CLEAR_DELAY_MS);
}

function reflowMarginaliaNotes() {
  if (typeof window === "undefined") {
    return;
  }

  const asides = Array.from(
    document.querySelectorAll<HTMLElement>("[data-marginalia-aside='true']"),
  );

  if (!window.matchMedia(DESKTOP_QUERY).matches) {
    asides.forEach((aside) => {
      aside.style.setProperty("--marginalia-offset", "0px");
    });
    return;
  }

  const positionedAsides = asides
    .map((aside) => {
      const anchorId = aside.dataset.anchorId;
      if (!anchorId) {
        return null;
      }

      const anchor = document.getElementById(anchorId);
      if (!anchor) {
        return null;
      }

      return {
        aside,
        anchorTop: anchor.getBoundingClientRect().top + window.scrollY,
      };
    })
    .filter(
      (
        item,
      ): item is { aside: HTMLElement; anchorTop: number } => item !== null,
    )
    .sort((a, b) => a.anchorTop - b.anchorTop);

  let previousBottom = -Infinity;

  positionedAsides.forEach(({ aside, anchorTop }) => {
    const targetTop = Math.max(anchorTop, previousBottom + NOTE_GAP_PX);
    const offset = Math.max(0, targetTop - anchorTop);

    aside.style.setProperty("--marginalia-offset", `${Math.round(offset)}px`);
    previousBottom = targetTop + aside.offsetHeight;
  });
}

function scheduleMarginaliaReflow() {
  if (typeof window === "undefined") {
    return;
  }

  if (reflowRafId !== null) {
    return;
  }

  reflowRafId = window.requestAnimationFrame(() => {
    reflowRafId = null;
    reflowMarginaliaNotes();
  });
}

type MarginaliaNotesProps = {
  anchorId: string;
  notes: string[];
};

export function MarginaliaNotes({ anchorId, notes }: MarginaliaNotesProps) {
  const [isVisible, setIsVisible] = useState(false);

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

  useEffect(() => {
    const handleResize = () => {
      scheduleMarginaliaReflow();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    scheduleMarginaliaReflow();
    return () => {
      scheduleMarginaliaReflow();
      clearPendingAnchorReset();
      if (activeAnchorId === anchorId) {
        activeAnchorId = null;
        setFocusFrameVisible(false);
      }
    };
  }, [anchorId, isVisible, notes.length]);

  return (
    <AnimatePresence
      initial={false}
      onExitComplete={() => {
        scheduleMarginaliaReflow();
      }}
    >
      {isVisible ? (
        <motion.aside
          data-marginalia-aside="true"
          data-anchor-id={anchorId}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={
            {
              "--marginalia-offset": "0px",
              marginTop: "var(--marginalia-offset)",
            } as CSSProperties
          }
          className="mt-2 space-y-2 md:absolute md:top-0 md:left-full md:ml-6 md:mt-0 md:w-56 md:transition-[margin-top] md:duration-300 md:ease-out motion-reduce:md:transition-none"
          onMouseEnter={() => {
            console.debug("[marginalia-focus] aside enter", { anchorId });
            clearPendingAnchorReset();
            activateAnchorHighlight(anchorId);
          }}
          onMouseLeave={() => {
            console.debug("[marginalia-focus] aside leave", { anchorId });
            scheduleAnchorHighlightClear(anchorId);
          }}
        >
          {notes.map((note, noteIndex) => {
            const rotationClass =
              noteIndex % 2 === 0 ? "-rotate-1" : "rotate-1";

            return (
              <p
                key={`note-${noteIndex}`}
                className={`marginalia-note text-left ${rotationClass} w-full`}
                onMouseEnter={() => {
                  console.debug("[marginalia-focus] note enter", {
                    anchorId,
                    noteIndex,
                  });
                  activateAnchorHighlight(anchorId);
                }}
              >
                {note}
              </p>
            );
          })}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
