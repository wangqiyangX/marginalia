import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkDeflist from "remark-deflist";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

import { MarginaliaNotes } from "@/components/marginalia-notes";
import { mdxComponents } from "@/components/mdx-components";
import { TocScale } from "@/components/toc-scale";
import { TransitionLink } from "@/components/transition-link";
import { TranslationBlock } from "@/components/translation-block";
import { TranslationVisibilityToggle } from "@/components/translation-visibility-toggle";
import { ZenFocusController } from "@/components/zen-focus-controller";
import { ZenModeToggle } from "@/components/zen-mode-toggle";
import { getMdxList, getMdxPage } from "@/lib/mdx";

type ChapterPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const items = await getMdxList();
  return items.map((item) => ({ slug: item.slug }));
}

const prettyCodeOptions = {
  theme: {
    light: "github-light",
    dark: "github-dark",
  },
  keepBackground: false,
  defaultLang: "txt",
};

function toTocLabel(
  headingSource: string,
): { level: number; text: string } | null {
  const firstLine = headingSource.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const match = firstLine.match(/^(#{1,6})\s+(.+)$/);
  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    text: match[2].trim(),
  };
}

function formatUpdatedAt(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { slug } = await params;
  const page = await getMdxPage(slug);

  if (!page) {
    notFound();
  }

  const tocItems = page.blocks
    .filter((block) => block.kind === "heading" && block.anchorId)
    .map((block) => {
      const parsed = toTocLabel(block.source);
      if (!parsed) {
        return null;
      }

      return {
        id: block.anchorId as string,
        level: parsed.level,
        text: parsed.text,
      };
    })
    .filter(
      (item): item is { id: string; level: number; text: string } =>
        item !== null,
    );
  const tocScaleItems = tocItems.filter(
    (item) => item.level === 2 || item.level === 3,
  );
  const updatedAtLabel = formatUpdatedAt(page.updatedAt);
  const hasMeta = Boolean(page.source || page.author || updatedAtLabel);

  return (
    <main className="relative min-h-screen p-8 text-zinc-900 dark:text-zinc-100">
      <TocScale items={tocScaleItems} />
      <ZenFocusController />

      {hasMeta ? (
        <aside className="zen-meta hidden md:absolute md:top-6 md:left-6 md:block md:max-w-xs md:text-xs md:leading-6 md:text-zinc-500 dark:md:text-zinc-400">
          {page.source ? <p>{page.source}</p> : null}
          {page.author ? <p>{page.author}</p> : null}
          {updatedAtLabel ? <p>{updatedAtLabel}</p> : null}
        </aside>
      ) : null}

      <section className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4 px-2 md:px-4">
          <TransitionLink
            href="/"
            className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Back to chapter list
          </TransitionLink>
          <div className="flex items-center">
            <ZenModeToggle />
            <TranslationVisibilityToggle />
          </div>
        </div>

        <article className="space-y-4 px-2 py-1 md:px-4">
          {page.blocks.map((block, index) => {
            const hasNotes = block.notes.length > 0;
            const hasTranslations = Boolean(
              block.translations.zh || block.translations.en,
            );

            return (
              <section
                key={`${block.anchorId ?? "block"}-${index}`}
                id={block.anchorId}
                data-zen-body={
                  block.kind === "paragraph" ||
                  block.kind === "blockquote" ||
                  block.kind === "heading"
                    ? "true"
                    : undefined
                }
                className={
                  block.anchorId ? "anchor-target scroll-mt-24" : undefined
                }
              >
                <div className="relative">
                  <MDXRemote
                    source={block.source}
                    components={mdxComponents}
                    options={{
                      mdxOptions: {
                        remarkPlugins: [remarkGfm, remarkDeflist],
                        rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
                      },
                    }}
                  />

                  {hasNotes ? (
                    <MarginaliaNotes
                      anchorId={block.anchorId ?? ""}
                      notes={block.notes}
                    />
                  ) : null}
                </div>

                {hasTranslations ? (
                  <div className="translation-panel">
                    <TranslationBlock
                      zh={block.translations.zh}
                      en={block.translations.en}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}
        </article>

        {page.references.length > 0 ? (
          <section className="px-2 pt-3 md:px-4">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              References
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {page.references.map((reference) => (
                <li
                  key={reference.key}
                  id={`ref-${reference.index}`}
                  className="reference-target scroll-mt-24 rounded-md px-2 py-1"
                >
                  <span className="mr-1 text-zinc-600 dark:text-zinc-400">
                    [{reference.index}]
                  </span>
                  <span>
                    {reference.text ? (
                      reference.text
                    ) : (
                      <span className="italic text-zinc-500 dark:text-zinc-400">
                        Missing reference definition for <code>{reference.key}</code>.
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </main>
  );
}
