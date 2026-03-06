import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const MDX_DIR = path.join(process.cwd(), "content");

export type MdxListItem = {
  slug: string;
  title: string;
  source?: string;
  author?: string;
  updatedAt?: string;
};

export type MdxBlock = {
  source: string;
  kind: "heading" | "paragraph" | "blockquote" | "code" | "other";
  anchorId?: string;
  notes: string[];
  translations: {
    zh?: string;
    en?: string;
  };
};

export type MdxPage = MdxListItem & {
  content: string;
  blocks: MdxBlock[];
  references: {
    index: number;
    key: string;
    text?: string;
    missing: boolean;
  }[];
};

type MdxFrontmatter = {
  source?: string;
  author?: string;
  updatedAt?: string;
};

function transformGlossarySyntax(source: string): string {
  const escapeAttr = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  // Syntax: {{term|explanation}}
  return source.replace(/\{\{([^|{}]+)\|([^{}]+)\}\}/g, (rawMatch, rawTerm, rawExplanation) => {
    const term = rawTerm.trim();
    const explanation = rawExplanation.trim();
    if (!term || !explanation) {
      return rawMatch;
    }

    return `<GlossaryTerm term="${escapeAttr(term)}" explanation="${escapeAttr(explanation)}" />`;
  });
}

function transformCitationSyntax(
  source: string,
  resolveCitationIndex: (key: string) => number,
): string {
  const toCitationTag = (keys: string[]) => {
    const items = keys
      .map((key) => `${resolveCitationIndex(key)}:${key}`)
      .join("|");
    return `<CitationRef items="${items}" />`;
  };

  // Syntax: [@citation-key]
  const afterKeyCitations = source.replace(
    /\[@([A-Za-z0-9:_-]+)\]/g,
    (_, rawKey) => {
      const key = String(rawKey).trim();
      if (!key) {
        return _;
      }
      return toCitationTag([key]);
    },
  );

  // Numeric shorthand syntax: [1] / [1, 2, 3]
  return afterKeyCitations.replace(
    /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g,
    (_, rawList) => {
      const keys = String(rawList)
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (keys.length === 0) {
        return _;
      }
      return toCitationTag(keys);
    },
  );
}

function toFigureId(token: string): string {
  return `figure-${token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function transformFigureReferenceSyntax(source: string): string {
  // Syntax: [[Figure 2-2]]
  return source.replace(
    /\[\[\s*Figure\s+([A-Za-z0-9.-]+)\s*\]\]/gi,
    (_, rawToken) => {
      const token = String(rawToken).trim();
      if (!token) {
        return _;
      }
      const label = `Figure ${token}`;
      const id = toFigureId(token);
      return `<a href="#${id}" className="figure-ref-link">${label}</a>`;
    },
  );
}

function transformTripleEqualsBlocks(source: string): string {
  // Syntax:
  // ===Title line
  // Body...
  // ===
  //
  // Also supports:
  // ===
  // Title line
  // Body...
  // ===
  //
  // Convert to dedicated MDX components so the title can contain
  // markdown/MDX safely instead of being serialized into a JSX attribute.
  return source.replace(
    /^===[ \t]*(.*?)[ \t]*\r?\n([\s\S]*?)\r?\n===[ \t]*(?:\r?\n)?/gm,
    (rawMatch, inlineTitle, innerBody) => {
      const lines = String(innerBody)
        .replace(/\r/g, "")
        .split("\n");

      let title = String(inlineTitle ?? "").trim();
      let bodyLines = lines;

      if (!title) {
        const firstNonEmptyIndex = lines.findIndex(
          (line) => line.trim().length > 0,
        );
        if (firstNonEmptyIndex < 0) {
          return rawMatch;
        }

        title = lines[firstNonEmptyIndex].trim();
        bodyLines = lines.slice(firstNonEmptyIndex + 1);
      } else {
        const titleLines = [title];
        let bodyStartIndex = lines.length;

        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index];
          if (line.trim().length === 0) {
            bodyStartIndex = index + 1;
            break;
          }
          titleLines.push(line.trim());
        }

        title = titleLines.join(" ");
        bodyLines = lines.slice(bodyStartIndex);
      }

      const body = bodyLines.join("\n");
      return `<TripleEqualsBlock title={<>${title}</>}>\n${body}\n</TripleEqualsBlock>\n\n`;
    },
  );
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.mdx$/, "");
}

function extractTitle(source: string, fallback: string): string {
  const h1 = source.match(/^#\s+(.+)$/m);
  return h1?.[1]?.trim() || fallback;
}

function toFallbackTitle(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseFrontmatter(source: string): {
  frontmatter: MdxFrontmatter;
  body: string;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: {}, body: source };
  }

  const frontmatterText = match[1];
  const body = source.slice(match[0].length);
  const frontmatter: MdxFrontmatter = {};

  for (const line of frontmatterText.split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!entry) {
      continue;
    }

    const key = entry[1];
    const rawValue = entry[2].trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key === "source") {
      frontmatter.source = value;
    } else if (key === "author") {
      frontmatter.author = value;
    } else if (key === "updatedAt") {
      frontmatter.updatedAt = value;
    }
  }

  return { frontmatter, body };
}

function getGitUpdatedAt(slug: string): string | undefined {
  const relativePath = path.join("content", `${slug}.mdx`);

  try {
    const output = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", relativePath],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    ).trim();

    return output.length > 0 ? output : undefined;
  } catch {
    return undefined;
  }
}

function splitMdxBlocks(source: string): string[] {
  const blocks: string[] = [];
  const lines = source.split(/\r?\n/);

  let current: string[] = [];
  let inFence = false;
  let inTripleEqualsBlock = false;

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    const text = current.join("\n").trim();
    if (text.length > 0) {
      blocks.push(text);
    }
    current = [];
  };

  for (const line of lines) {
    if (!inFence && line.trim().startsWith("<TripleEqualsBlock")) {
      inTripleEqualsBlock = true;
      current.push(line);
      continue;
    }

    if (!inFence && inTripleEqualsBlock) {
      current.push(line);
      if (line.trim() === "</TripleEqualsBlock>") {
        inTripleEqualsBlock = false;
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      current.push(line);
      continue;
    }

    if (!inFence && line.trim() === "") {
      flush();
      continue;
    }

    current.push(line);
  }

  flush();
  return blocks;
}

function classifyBlock(source: string): MdxBlock["kind"] {
  const firstLine = source.split(/\r?\n/, 1)[0]?.trim() ?? "";

  if (firstLine.startsWith("```")) {
    return "code";
  }
  if (/^#{1,6}\s+/.test(firstLine)) {
    return "heading";
  }
  if (firstLine.startsWith(">")) {
    return "blockquote";
  }
  if (firstLine.length > 0) {
    return "paragraph";
  }

  return "other";
}

function slugifyHeadingText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractHeadingText(source: string): string {
  const firstLine = source.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const match = firstLine.match(/^#{1,6}\s+(.+)$/);
  return match?.[1]?.trim() ?? "";
}

function isDirectiveBlock(source: string): boolean {
  const firstLine = source.split(/\r?\n/, 1)[0]?.trim() ?? "";
  return firstLine.startsWith("%%");
}

function parseDirective(
  source: string,
):
  | { kind: "marginalia" | "zh" | "en"; text: string }
  | { kind: "ref"; key: string; text: string }
  | null {
  const lines = source.split(/\r?\n/);
  if (lines.length === 0) {
    return null;
  }

  const firstLine = lines[0].trim();
  const match = firstLine.match(/^%%([a-zA-Z]+)\s?(.*)$/);
  if (!match) {
    return null;
  }

  const rawKind = match[1].toLowerCase();
  if (
    rawKind !== "marginalia" &&
    rawKind !== "zh" &&
    rawKind !== "en" &&
    rawKind !== "ref"
  ) {
    return null;
  }

  if (rawKind === "ref") {
    const payload = match[2] ?? "";
    const keyMatch = payload.match(/^([A-Za-z0-9:_-]+)\s*:?\s*(.*)$/);
    if (!keyMatch) {
      return null;
    }

    const key = keyMatch[1].trim();
    lines[0] = keyMatch[2] ?? "";
    return {
      kind: "ref",
      key,
      text: lines.join("\n").trim(),
    };
  }

  lines[0] = match[2] ?? "";
  return {
    kind: rawKind,
    text: lines.join("\n").trim(),
  };
}

function parseReferenceBlock(
  source: string,
): { key: string; text: string } | null {
  const lines = source.split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";
  const match = firstLine.match(/^\[(\d+)\]\s+(.+)$/);
  if (!match) {
    return null;
  }

  const key = match[1];
  lines[0] = match[2];
  const text = lines.join("\n").trim();
  if (!text) {
    return null;
  }

  return { key, text };
}

function toBlocks(source: string): {
  blocks: MdxBlock[];
  references: {
    index: number;
    key: string;
    text?: string;
    missing: boolean;
  }[];
} {
  const rawBlocks = splitMdxBlocks(source);
  const blocks: MdxBlock[] = [];
  let anchorIndex = 1;
  const headingSlugCounts = new Map<string, number>();
  let lastAnchorableBlock: MdxBlock | null = null;
  const referenceByKey = new Map<string, string>();
  const citationIndexByKey = new Map<string, number>();
  const citationKeyByIndex = new Map<number, string>();
  let nextSequentialIndex = 1;

  const claimIndex = (key: string, preferred?: number) => {
    if (
      typeof preferred === "number" &&
      preferred > 0 &&
      !citationKeyByIndex.has(preferred)
    ) {
      citationIndexByKey.set(key, preferred);
      citationKeyByIndex.set(preferred, key);
      return preferred;
    }

    while (citationKeyByIndex.has(nextSequentialIndex)) {
      nextSequentialIndex += 1;
    }
    const next = nextSequentialIndex;
    citationIndexByKey.set(key, next);
    citationKeyByIndex.set(next, key);
    nextSequentialIndex += 1;
    return next;
  };

  const resolveCitationIndex = (key: string): number => {
    const existing = citationIndexByKey.get(key);
    if (existing) {
      return existing;
    }

    const numericKey = Number.parseInt(key, 10);
    const preferred =
      Number.isFinite(numericKey) && String(numericKey) === key
        ? numericKey
        : undefined;
    return claimIndex(key, preferred);
  };

  for (const blockSource of rawBlocks) {
    if (isDirectiveBlock(blockSource)) {
      const directive = parseDirective(blockSource);
      if (directive) {
        if (directive.kind === "ref") {
          if (directive.text.length > 0) {
            referenceByKey.set(directive.key, directive.text);
          }
        } else if (lastAnchorableBlock && directive.text.length > 0) {
          if (directive.kind === "marginalia") {
            lastAnchorableBlock.notes.push(directive.text);
          } else {
            lastAnchorableBlock.translations[directive.kind] = directive.text;
          }
        }
      }
      continue;
    }

    const parsedReference = parseReferenceBlock(blockSource);
    if (parsedReference) {
      referenceByKey.set(parsedReference.key, parsedReference.text);
      continue;
    }

    const kind = classifyBlock(blockSource);
    const shouldAnchorForNotes = kind === "paragraph" || kind === "blockquote";
    const shouldAnchorForHeading = kind === "heading";

    const block: MdxBlock = {
      source:
        kind === "code"
          ? blockSource
          : transformGlossarySyntax(
              transformFigureReferenceSyntax(
                transformCitationSyntax(blockSource, resolveCitationIndex),
              ),
            ),
      kind,
      notes: [],
      translations: {},
    };

    if (shouldAnchorForHeading) {
      const headingText = extractHeadingText(blockSource);
      const baseSlug = slugifyHeadingText(headingText) || "section";
      const count = headingSlugCounts.get(baseSlug) ?? 0;
      headingSlugCounts.set(baseSlug, count + 1);
      block.anchorId = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    } else if (shouldAnchorForNotes) {
      block.anchorId = `m-${anchorIndex}`;
      anchorIndex += 1;
      lastAnchorableBlock = block;
    } else {
      lastAnchorableBlock = null;
    }

    blocks.push(block);
  }

  return {
    blocks,
    references: Array.from(citationIndexByKey.entries())
      .map(([key, index]) => {
      const text = referenceByKey.get(key);
      return {
        index,
        key,
        text,
        missing: !text,
      };
      })
      .sort((a, b) => a.index - b.index),
  };
}

async function readMdxFile(slug: string): Promise<string | null> {
  const fullPath = path.join(MDX_DIR, `${slug}.mdx`);
  try {
    return await fs.readFile(fullPath, "utf8");
  } catch {
    return null;
  }
}

export async function getMdxList(): Promise<MdxListItem[]> {
  try {
    const filenames = await fs.readdir(MDX_DIR);
    const mdxFiles = filenames.filter((name) => name.endsWith(".mdx")).sort();

    const items = await Promise.all(
      mdxFiles.map(async (filename) => {
        const slug = slugFromFilename(filename);
        const source = await readMdxFile(slug);
        const fallbackTitle = toFallbackTitle(slug);
        const parsed = parseFrontmatter(source ?? "");
        const transformedBody = transformTripleEqualsBlocks(parsed.body);
        const updatedAt = getGitUpdatedAt(slug) ?? parsed.frontmatter.updatedAt;

        return {
          slug,
          title: extractTitle(transformedBody, fallbackTitle),
          source: parsed.frontmatter.source,
          author: parsed.frontmatter.author,
          updatedAt,
        };
      }),
    );

    return items;
  } catch {
    return [];
  }
}

export async function getMdxPage(slug: string): Promise<MdxPage | null> {
  const rawSource = await readMdxFile(slug);
  if (!rawSource) {
    return null;
  }

  const parsed = parseFrontmatter(rawSource);
  const transformedBody = transformTripleEqualsBlocks(parsed.body);
  const updatedAt = getGitUpdatedAt(slug) ?? parsed.frontmatter.updatedAt;
  const fallbackTitle = toFallbackTitle(slug);

  return {
    slug,
    content: transformedBody,
    title: extractTitle(transformedBody, fallbackTitle),
    ...toBlocks(transformedBody),
    source: parsed.frontmatter.source,
    author: parsed.frontmatter.author,
    updatedAt,
  };
}
