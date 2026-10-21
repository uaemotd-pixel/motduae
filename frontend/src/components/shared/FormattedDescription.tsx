"use client";

import { Fragment, type ReactNode } from "react";

type FormattedDescriptionProps = {
  text: string;
  className?: string;
};

const LIST_RE = /^[.·•\-–—*]\s+(.*)$/;
const SPEC_RE = /^([^:]{1,80}):\s*(.+)$/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let part = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${part++}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>,
      );
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${part++}`} className="font-semibold text-black">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={`${keyPrefix}-i-${part++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-t-${part++}`}>
        {text.slice(lastIndex)}
      </Fragment>,
    );
  }

  return nodes.length > 0 ? nodes : [text];
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || LIST_RE.test(trimmed)) return false;
  if (trimmed.length > 72) return false;
  if (/[.!?،؛]$/.test(trimmed)) return false;
  if (SPEC_RE.test(trimmed) && trimmed.includes(":")) return false;
  return true;
}

function renderListItemContent(content: string, key: string): ReactNode {
  const spec = content.match(SPEC_RE);
  if (spec) {
    return (
      <>
        <strong className="font-semibold text-black">{spec[1]}:</strong>{" "}
        {renderInline(spec[2], `${key}-v`)}
      </>
    );
  }
  return <>{renderInline(content, key)}</>;
}

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const listMatch = line.trim().match(LIST_RE);
    if (listMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!current) break;
        const m = current.match(LIST_RE);
        if (!m) break;
        items.push(m[1].trim());
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const chunk: string[] = [];
    while (i < lines.length) {
      const current = lines[i];
      if (!current.trim()) break;
      if (LIST_RE.test(current.trim())) break;
      chunk.push(current.trim());
      i += 1;
    }

    if (chunk.length === 1 && isHeadingLine(chunk[0])) {
      blocks.push({ type: "heading", text: chunk[0] });
    } else if (
      chunk.length > 1 &&
      isHeadingLine(chunk[0]) &&
      chunk[0].length <= 48
    ) {
      blocks.push({ type: "heading", text: chunk[0] });
      blocks.push({ type: "paragraph", lines: chunk.slice(1) });
    } else {
      blocks.push({ type: "paragraph", lines: chunk });
    }
  }

  return blocks;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Plain text for cards / truncations (strips HTML tags). */
export function stripDescriptionText(value: string): string {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-4]|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Allowlist sanitize for description HTML from the admin rich-text editor. */
export function sanitizeDescriptionHtml(html: string): string {
  if (typeof window === "undefined") {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript:/gi, "");
  }

  const allowed = new Set([
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "S",
    "STRIKE",
    "P",
    "BR",
    "DIV",
    "SPAN",
    "H1",
    "H2",
    "H3",
    "H4",
    "UL",
    "OL",
    "LI",
  ]);
  const allowedStyles = /^(text-align|font-weight|font-style|text-decoration):\s*[^;]+;?$/i;

  const template = document.createElement("template");
  template.innerHTML = html;

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!allowed.has(el.tagName)) {
          el.replaceWith(...Array.from(el.childNodes));
          continue;
        }
        Array.from(el.attributes).forEach((attr) => {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || name === "href" || name === "src") {
            el.removeAttribute(attr.name);
            return;
          }
          if (name === "style") {
            const safe = (attr.value || "")
              .split(";")
              .map((part) => part.trim())
              .filter((part) => part && allowedStyles.test(`${part};`))
              .join("; ");
            if (safe) el.setAttribute("style", safe);
            else el.removeAttribute("style");
            return;
          }
          if (name !== "dir" && name !== "class") {
            el.removeAttribute(attr.name);
          }
        });
        walk(el);
      }
    }
  };

  walk(template.content);
  return template.innerHTML;
}

/**
 * Renders product descriptions from rich-text HTML or legacy plain text
 * (headings, lists, **bold** / *italic*).
 */
export default function FormattedDescription({
  text,
  className = "",
}: FormattedDescriptionProps) {
  const normalized = text?.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  if (looksLikeHtml(normalized)) {
    return (
      <div
        className={`[font-family:var(--font-body)] text-sm sm:text-base text-[#7A7A72] leading-relaxed
          [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-black [&_h1]:mb-2
          [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-black [&_h2]:mb-2
          [&_h3]:text-sm [&_h3]:sm:text-base [&_h3]:font-semibold [&_h3]:text-black [&_h3]:mb-2
          [&_p]:mb-2 [&_p]:last:mb-0
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:space-y-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:space-y-1
          [&_strong]:font-semibold [&_strong]:text-black
          [&_b]:font-semibold [&_b]:text-black
          [&_em]:italic [&_i]:italic
          [&_u]:underline [&_s]:line-through
          ${className}`}
        dangerouslySetInnerHTML={{
          __html: sanitizeDescriptionHtml(normalized),
        }}
      />
    );
  }

  const blocks = parseBlocks(normalized);

  return (
    <div
      className={`[font-family:var(--font-body)] text-sm sm:text-base text-[#7A7A72] leading-relaxed space-y-3 ${className}`}
    >
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <p
              key={`h-${index}`}
              className="[font-family:var(--font-ui)] text-sm sm:text-base font-semibold tracking-wide text-black"
            >
              {renderInline(block.text, `h-${index}`)}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={`l-${index}`}
              className="list-disc pl-5 space-y-1.5 marker:text-black/50"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`l-${index}-${itemIndex}`} className="pl-0.5">
                  {renderListItemContent(item, `l-${index}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`p-${index}`} className="text-justify [text-justify:inter-word]">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={`p-${index}-${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {renderInline(line, `p-${index}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
