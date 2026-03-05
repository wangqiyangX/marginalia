type CitationRefProps = {
  items: string;
};

type CitationItem = {
  index: string;
  key: string;
};

function parseItems(items: string): CitationItem[] {
  return items
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const [index, ...rest] = item.split(":");
      return {
        index: index.trim(),
        key: rest.join(":").trim(),
      };
    })
    .filter((item) => item.index.length > 0 && item.key.length > 0);
}

export function CitationRef({ items }: CitationRefProps) {
  const parsed = parseItems(items);
  if (parsed.length === 0) {
    return null;
  }

  return (
    <span className="citation-ref ml-0.5 align-baseline text-[0.95em]">
      [
      {parsed.map((item, index) => (
        <span key={`${item.index}-${item.key}`}>
          <a
            href={`#ref-${item.index}`}
            aria-label={`Reference ${item.index}: ${item.key}`}
            className="citation-ref-link"
          >
            {item.index}
          </a>
          {index < parsed.length - 1 ? ", " : ""}
        </span>
      ))}
      ]
    </span>
  );
}
