"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ENTER_DURATION_MS = 220;

export function PageTransitionController() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.dataset.routeTransition = "in";

    const timer = window.setTimeout(() => {
      if (document.body.dataset.routeTransition === "in") {
        delete document.body.dataset.routeTransition;
      }
    }, ENTER_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
