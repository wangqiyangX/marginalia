"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "marginalia-translations-visible";

export function TranslationVisibilityToggle() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  });

  useEffect(() => {
    document.body.dataset.translations = visible ? "on" : "off";
  }, [visible]);

  const toggle = () => {
    setVisible((prev) => {
      const next = !prev;
      document.body.dataset.translations = next ? "on" : "off";
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={visible}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors ${
        visible
          ? "border-zinc-400 bg-zinc-200 text-zinc-800 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100"
          : "border-zinc-300 bg-transparent text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      {visible ? "Translation: On" : "Translation: Off"}
    </button>
  );
}
