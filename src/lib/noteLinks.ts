export interface LinkableNote {
  id: number;
  title: string;
}

export interface ResolvedNoteLink {
  targetNoteId: number;
  linkText: string;
}

export interface NoteLinkIssue {
  linkText: string;
  title: string;
  kind: "unmatched" | "ambiguous";
}

export interface NoteLinkResolution {
  links: ResolvedNoteLink[];
  issues: NoteLinkIssue[];
}

const LINK_PATTERN = /\[\[([^\[\]]+?)\]\]/g;

function parseLinkTarget(rawTarget: string): { title: string; id: number | null } {
  const separator = rawTarget.lastIndexOf("|");
  if (separator === -1) return { title: rawTarget.trim(), id: null };

  const title = rawTarget.slice(0, separator).trim();
  const rawId = rawTarget.slice(separator + 1).trim();
  const id = /^\d+$/.test(rawId) ? Number(rawId) : null;
  return { title, id: id && Number.isSafeInteger(id) ? id : null };
}

export function resolveNoteLinks(
  content: string,
  candidates: LinkableNote[],
  sourceNoteId: number | null
): NoteLinkResolution {
  const links = new Map<string, ResolvedNoteLink>();
  const issues: NoteLinkIssue[] = [];

  for (const match of content.matchAll(LINK_PATTERN)) {
    const linkText = match[0];
    const { title, id } = parseLinkTarget(match[1]);
    if (!title) {
      issues.push({ linkText, title: "", kind: "unmatched" });
      continue;
    }

    const matchingCandidates = candidates.filter(
      (candidate) => candidate.title === title && candidate.id !== sourceNoteId
    );
    const target = id
      ? matchingCandidates.find((candidate) => candidate.id === id)
      : matchingCandidates.length === 1
        ? matchingCandidates[0]
        : undefined;

    if (!target) {
      issues.push({
        linkText,
        title,
        kind: matchingCandidates.length > 1 && id === null ? "ambiguous" : "unmatched",
      });
      continue;
    }

    links.set(`${target.id}:${linkText}`, {
      targetNoteId: target.id,
      linkText,
    });
  }

  return { links: [...links.values()], issues };
}

export function getActiveLinkQuery(content: string, cursor: number): string | null {
  const beforeCursor = content.slice(0, cursor);
  const linkStart = beforeCursor.lastIndexOf("[[");
  if (linkStart === -1) return null;
  const query = beforeCursor.slice(linkStart + 2);
  if (query.includes("]]")) return null;
  return query.includes("|") || query.includes("\n") ? null : query;
}

export function formatNoteLink(candidate: LinkableNote, candidates: LinkableNote[]): string {
  const duplicateCount = candidates.filter((item) => item.title === candidate.title).length;
  return duplicateCount > 1
    ? `[[${candidate.title}|${candidate.id}]]`
    : `[[${candidate.title}]]`;
}
