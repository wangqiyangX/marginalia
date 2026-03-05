"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

type TransitionLinkProps = React.ComponentProps<typeof Link>;

const EXIT_DURATION_MS = 140;

function isModifiedEvent(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.button !== 0
  );
}

export function TransitionLink({
  href,
  onClick,
  target,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const hrefText = typeof href === "string" ? href : href.toString();

  return (
    <Link
      href={href}
      target={target}
      data-pending={isPending ? "true" : "false"}
      aria-busy={isPending}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        if (target === "_blank" || isModifiedEvent(event)) {
          return;
        }

        event.preventDefault();
        document.body.dataset.routeTransition = "out";

        timerRef.current = window.setTimeout(() => {
          startTransition(() => {
            router.push(hrefText);
          });
        }, EXIT_DURATION_MS);
      }}
    />
  );
}
