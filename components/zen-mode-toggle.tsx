"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "marginalia-zen-mode";

export function ZenModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fromStorage = window.localStorage.getItem(STORAGE_KEY) === "1";

    const rafId = window.requestAnimationFrame(() => {
      setEnabled(fromStorage);
      document.body.dataset.zenMode = fromStorage ? "on" : "off";
    });

    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    document.body.dataset.zenMode = enabled ? "on" : "off";
  }, [enabled]);

  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      document.body.dataset.zenMode = next ? "on" : "off";
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className={`inline-flex items-center rounded-full px-1 py-1 text-xs transition-colors ${
        enabled
          ? "text-zinc-800 opacity-100 dark:text-zinc-100"
          : "bg-transparent text-zinc-700 opacity-45 hover:opacity-70 dark:text-zinc-200 dark:opacity-40 dark:hover:opacity-65"
      }`}
    >
      Zen
    </button>
  );
}
