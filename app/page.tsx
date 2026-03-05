import { TransitionLink } from "@/components/transition-link";
import { getMdxList } from "@/lib/mdx";

export default async function Home() {
  const items = await getMdxList();

  return (
    <main className="min-h-screen px-6 py-10 font-serif text-zinc-900 dark:text-zinc-100 md:px-10">
      <section className="mx-auto w-full max-w-3xl">
        <header className="p-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            MARGINALIA LIBRARY
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            A reading space for excerpts, notes, and commentary.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 md:text-base">
            Browse chapters, annotated passages, and translated snippets from
            technical writing and published materials. This index is designed
            for learning, critique, and editorial exploration.
          </p>
        </header>

        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.slug}>
              <TransitionLink
                href={`/${item.slug}`}
                className="block underline decoration-zinc-400 underline-offset-4 hover:decoration-zinc-600 dark:decoration-zinc-500 dark:hover:decoration-zinc-300"
              >
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </p>
              </TransitionLink>
            </li>
          ))}
        </ul>

        {items.length === 0 ? (
          <p className="mt-6 p-1 text-zinc-600 dark:text-zinc-400">
            No MDX files found in <code>content</code>.
          </p>
        ) : null}

      </section>

      <section className="mx-auto mt-16 w-full max-w-3xl p-1 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        <h3 className="text-base font-semibold">Disclaimer</h3>
        <p className="mt-3">
          Some pages may include excerpts or references from published books,
          articles, or third-party material. All copyrights remain with their
          respective owners.
        </p>
        <p className="mt-2">
          Content in this library is presented for educational, research, and
          commentary purposes. If you are a rights holder and need content to
          be corrected, credited, or removed, please contact the maintainer.
        </p>
      </section>
    </main>
  );
}
