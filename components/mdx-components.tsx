import { Noto_Serif } from "next/font/google";
import Image from "next/image";
import type { ReactNode } from "react";
import { CitationRef } from "@/components/citation-ref";
import { GlossaryTerm } from "@/components/glossary-term";

const bodySerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function toFigureId(token: string): string {
  return `figure-${token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

type TripleEqualsBlockProps = {
  title: string;
  children: ReactNode;
};

function TripleEqualsBlock({ title, children }: TripleEqualsBlockProps) {
  return (
    <section className="my-5 border-t border-b border-zinc-300 px-4 py-3 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
      <p className="mb-3 text-center text-2xl leading-8 font-semibold text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <div className="[&>p+p]:mt-3 [&_p]:!text-base [&_p]:!leading-7 [&_p]:!text-zinc-600 dark:[&_p]:!text-zinc-400">
        {children}
      </div>
    </section>
  );
}

export const mdxComponents = {
  CitationRef,
  GlossaryTerm,
  TripleEqualsBlock,
  h1: (props: React.ComponentPropsWithoutRef<"h1">) => (
    <h1
      className="text-4xl font-bold text-zinc-900 dark:text-zinc-100"
      {...props}
    />
  ),
  h2: (props: React.ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="text-3xl font-semibold text-zinc-800 dark:text-zinc-200"
      {...props}
    />
  ),
  h3: (props: React.ComponentPropsWithoutRef<"h3">) => (
    <h3
      className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200"
      {...props}
    />
  ),
  h4: (props: React.ComponentPropsWithoutRef<"h4">) => (
    <h4
      className="text-xl font-semibold text-zinc-700 dark:text-zinc-300"
      {...props}
    />
  ),
  h5: (props: React.ComponentPropsWithoutRef<"h5">) => (
    <h5
      className="text-lg font-semibold text-zinc-700 dark:text-zinc-300"
      {...props}
    />
  ),
  h6: (props: React.ComponentPropsWithoutRef<"h6">) => (
    <h6
      className="text-base font-semibold tracking-[0.06em] text-zinc-600 dark:text-zinc-400"
      {...props}
    />
  ),
  p: (props: React.ComponentPropsWithoutRef<"p">) => (
    <p
      className={`${bodySerif.className} text-lg leading-8 text-zinc-800 dark:text-zinc-200`}
      {...props}
    />
  ),
  blockquote: (props: React.ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className={`${bodySerif.className} mdx-quote`} {...props} />
  ),
  ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
    <ul
      className={`${bodySerif.className} list-disc space-y-2 pl-6 text-lg leading-8 text-zinc-800 dark:text-zinc-200`}
      {...props}
    />
  ),
  ol: (props: React.ComponentPropsWithoutRef<"ol">) => (
    <ol
      className={`${bodySerif.className} list-decimal space-y-2 pl-6 text-lg leading-8 text-zinc-800 dark:text-zinc-200`}
      {...props}
    />
  ),
  li: (props: React.ComponentPropsWithoutRef<"li">) => (
    <li
      className="pl-1 marker:text-zinc-500 dark:marker:text-zinc-400"
      {...props}
    />
  ),
  dl: (props: React.ComponentPropsWithoutRef<"dl">) => (
    <dl
      className={`${bodySerif.className} space-y-4 text-zinc-900 dark:text-zinc-100`}
      {...props}
    />
  ),
  dt: (props: React.ComponentPropsWithoutRef<"dt">) => (
    <dt
      className={`${bodySerif.className} text-lg leading-8 italic`}
      {...props}
    />
  ),
  dd: (props: React.ComponentPropsWithoutRef<"dd">) => (
    <dd
      className={`${bodySerif.className} ml-8 text-lg leading-8 text-zinc-800 dark:text-zinc-200`}
      {...props}
    />
  ),
  a: (props: React.ComponentPropsWithoutRef<"a">) => {
    const { className, ...restProps } = props;
    const isExternal =
      typeof props.href === "string" &&
      (props.href.startsWith("http://") || props.href.startsWith("https://"));
    const childText =
      typeof props.children === "string"
        ? props.children.trim()
        : Array.isArray(props.children)
          ? props.children.join("").trim()
          : "";
    const isPlainUrlLabel =
      typeof props.href === "string" &&
      childText.length > 0 &&
      (childText === props.href ||
        childText === props.href.replace(/^https?:\/\//, ""));

    return (
      <a
        className={`${
          isPlainUrlLabel
            ? "text-sky-700 underline decoration-sky-500 underline-offset-4 hover:text-sky-800 dark:text-sky-300 dark:decoration-sky-400 dark:hover:text-sky-200"
            : "text-zinc-700 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-500 dark:hover:text-zinc-100"
        } ${className ?? ""}`.trim()}
        target={isExternal ? "_blank" : props.target}
        rel={isExternal ? "noreferrer noopener" : props.rel}
        {...restProps}
      />
    );
  },
  img: (props: React.ComponentPropsWithoutRef<"img">) => {
    const caption =
      typeof props.alt === "string"
        ? props.alt.replace(/\s+/g, " ").trim()
        : "";
    const src = typeof props.src === "string" ? props.src : undefined;
    const figureMatch = caption.match(/^Figure\s+([A-Za-z0-9.-]+)/i);
    const figureId = figureMatch ? toFigureId(figureMatch[1]) : undefined;

    if (!src) {
      return null;
    }

    return (
      <span
        id={figureId}
        className="figure-anchor my-6 block scroll-mt-24 space-y-2 rounded-md"
      >
        <Image
          src={src}
          alt={props.alt ?? ""}
          width={1200}
          height={800}
          sizes="(max-width: 768px) 100vw, 768px"
          className={`h-auto w-full max-w-full rounded-md ${props.className ?? ""}`.trim()}
        />
        {caption ? (
          <span className="block text-sm italic text-zinc-600 dark:text-zinc-400">
            {caption}
          </span>
        ) : null}
      </span>
    );
  },
};
