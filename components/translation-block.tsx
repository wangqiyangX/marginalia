type TranslationBlockProps = {
  zh?: string;
  en?: string;
};

export function TranslationBlock({ zh, en }: TranslationBlockProps) {
  if (!zh && !en) {
    return null;
  }

  return (
    <div className="translation-block mt-2 space-y-1 border-l border-zinc-300 pl-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
      {zh ? (
        <div className="translation-line">
          <span>{zh}</span>
        </div>
      ) : null}
      {en ? (
        <div className="translation-line">
          <span>{en}</span>
        </div>
      ) : null}
    </div>
  );
}
