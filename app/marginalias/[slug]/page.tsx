import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkDeflist from "remark-deflist";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

import { MarginaliaNotes } from "@/components/marginalia-notes";
import { mdxComponents } from "@/components/mdx-components";
import { TocScale } from "@/components/toc-scale";
import { TranslationBlock } from "@/components/translation-block";
import { TranslationVisibilityToggle } from "@/components/translation-visibility-toggle";
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

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { slug } = await params;
  const page = await getMdxPage(slug);

  if (!page) {
    notFound();
  }

  const hasAnyNotes = page.blocks.some((block) => block.notes.length > 0);
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

  return (
    <main className="min-h-screen p-8 text-zinc-900 dark:text-zinc-100">
      <TocScale items={tocScaleItems} />

      <section className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4 px-2 md:px-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Back to chapter list
          </Link>
          <TranslationVisibilityToggle />
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

          {!hasAnyNotes ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No annotations for this chapter yet. Add a paragraph starting with{" "}
              <code>%%marginalia</code> right below content to create one.
            </p>
          ) : null}
        </article>
      </section>
    </main>
  );
}
