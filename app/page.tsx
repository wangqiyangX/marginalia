import Link from "next/link";
import { getMdxList } from "@/lib/mdx";

export default async function Home() {
  const items = await getMdxList();

  return (
    <main className="min-h-screen bg-zinc-50 p-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <section className="mx-auto w-full max-w-3xl">
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/marginalias/${item.slug}`}
                className="block underline-offset-2 hover:underline"
              >
                <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        {items.length === 0 ? (
          <p className="mt-8 rounded-lg bg-white p-4 text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-400">
            No MDX files found in <code>content/mdx</code>.
          </p>
        ) : null}
      </section>
    </main>
  );
}
