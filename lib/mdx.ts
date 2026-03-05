import { promises as fs } from "node:fs";
import path from "node:path";

const MDX_DIR = path.join(process.cwd(), "content", "mdx");

export type MdxListItem = {
  slug: string;
  title: string;
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
  source: string;
  blocks: MdxBlock[];
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

function splitMdxBlocks(source: string): string[] {
  const blocks: string[] = [];
  const lines = source.split(/\r?\n/);

  let current: string[] = [];
  let inFence = false;

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

function parseDirective(source: string): { kind: "marginalia" | "zh" | "en"; text: string } | null {
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
  if (rawKind !== "marginalia" && rawKind !== "zh" && rawKind !== "en") {
    return null;
  }

  lines[0] = match[2] ?? "";
  return {
    kind: rawKind,
    text: lines.join("\n").trim(),
  };
}

function toBlocks(source: string): MdxBlock[] {
  const rawBlocks = splitMdxBlocks(source);
  const blocks: MdxBlock[] = [];
  let anchorIndex = 1;
  const headingSlugCounts = new Map<string, number>();
  let lastAnchorableBlock: MdxBlock | null = null;

  for (const blockSource of rawBlocks) {
    if (isDirectiveBlock(blockSource)) {
      const directive = parseDirective(blockSource);
      if (lastAnchorableBlock && directive && directive.text.length > 0) {
        if (directive.kind === "marginalia") {
          lastAnchorableBlock.notes.push(directive.text);
        } else {
          lastAnchorableBlock.translations[directive.kind] = directive.text;
        }
      }
      continue;
    }

    const kind = classifyBlock(blockSource);
    const shouldAnchorForNotes = kind === "paragraph" || kind === "blockquote";
    const shouldAnchorForHeading = kind === "heading";

    const block: MdxBlock = {
      source: kind === "code" ? blockSource : transformGlossarySyntax(blockSource),
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

  return blocks;
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

        return {
          slug,
          title: extractTitle(source ?? "", fallbackTitle),
        };
      }),
    );

    return items;
  } catch {
    return [];
  }
}

export async function getMdxPage(slug: string): Promise<MdxPage | null> {
  const source = await readMdxFile(slug);
  if (!source) {
    return null;
  }

  const fallbackTitle = toFallbackTitle(slug);

  return {
    slug,
    source,
    title: extractTitle(source, fallbackTitle),
    blocks: toBlocks(source),
  };
}
