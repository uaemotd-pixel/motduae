"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Undo2,
  Redo2,
  type LucideIcon,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  minHeightClassName?: string;
};

type ToolDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  command?: string;
  value?: string;
  action?: () => void;
};

function ToolbarButton({
  label,
  active,
  onMouseDown,
  children,
}: {
  label: string;
  active?: boolean;
  onMouseDown: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      className={`inline-flex h-7 w-7 items-center justify-center rounded border transition hover:cursor-pointer ${
        active
          ? "border-black bg-black text-white"
          : "border-transparent text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px bg-gray-200 shrink-0" aria-hidden />;
}

const EDITOR_BODY_CLASS =
  "rich-text-editor w-full px-2 py-2 text-xs sm:text-sm text-black outline-none " +
  "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-black [&_h3]:my-1.5 " +
  "[&_p]:my-1 " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 " +
  "[&_u]:underline [&_s]:line-through [&_strike]:line-through";

function getSelectionElement(editor: HTMLElement | null): HTMLElement | null {
  if (!editor || typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const node = selection.anchorNode;
  if (!node) return null;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  if (!element || !editor.contains(element)) return null;
  return element;
}

/** Toolbar highlight state via Selection + computed styles (not queryCommandState). */
function getFormatState(editor: HTMLElement | null): Record<string, boolean> {
  const element = getSelectionElement(editor);
  if (!element) return {};

  const style = window.getComputedStyle(element);
  const weight = style.fontWeight;
  const weightNum = Number.parseInt(weight, 10);
  const decoration = `${style.textDecorationLine} ${style.textDecoration}`;

  return {
    bold:
      weight === "bold" ||
      weight === "bolder" ||
      (!Number.isNaN(weightNum) && weightNum >= 600) ||
      Boolean(element.closest("b, strong")),
    italic:
      style.fontStyle === "italic" ||
      style.fontStyle === "oblique" ||
      Boolean(element.closest("i, em")),
    underline:
      decoration.includes("underline") || Boolean(element.closest("u")),
    strikeThrough:
      decoration.includes("line-through") ||
      Boolean(element.closest("s, strike, del")),
    insertUnorderedList: Boolean(element.closest("ul")),
    insertOrderedList: Boolean(element.closest("ol")),
  };
}

/**
 * Word-style rich text editor with icon toolbar.
 * Persists HTML (bold, italic, lists, alignment, etc.).
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write description...",
  dir = "ltr",
  minHeightClassName = "min-h-[9rem]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});

  const syncActive = () => {
    setActive(getFormatState(editorRef.current));
  };

  const emitChange = () => {
    const html = editorRef.current?.innerHTML ?? "";
    const normalized =
      html === "<br>" || html === "<div><br></div>" || html === "<p><br></p>"
        ? ""
        : html;
    onChange(normalized);
    syncActive();
  };

  const run = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const next = value || "";
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value]);

  const tools: Array<ToolDef | "divider"> = [
    { id: "bold", label: "Bold", icon: Bold, command: "bold" },
    { id: "italic", label: "Italic", icon: Italic, command: "italic" },
    {
      id: "underline",
      label: "Underline",
      icon: Underline,
      command: "underline",
    },
    {
      id: "strikeThrough",
      label: "Strikethrough",
      icon: Strikethrough,
      command: "strikeThrough",
    },
    "divider",
    {
      id: "heading",
      label: "Heading",
      icon: Heading2,
      action: () => run("formatBlock", "h3"),
    },
    {
      id: "insertUnorderedList",
      label: "Bullets",
      icon: List,
      command: "insertUnorderedList",
    },
    {
      id: "insertOrderedList",
      label: "Numbering",
      icon: ListOrdered,
      command: "insertOrderedList",
    },
    "divider",
    { id: "undo", label: "Undo", icon: Undo2, command: "undo" },
    { id: "redo", label: "Redo", icon: Redo2, command: "redo" },
  ];

  const isEmpty = !value || value.replace(/<[^>]+>/g, "").trim() === "";

  return (
    <div className="w-full border border-gray-200 bg-white focus-within:border-black transition">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-[#FAFAF8] px-1.5 py-1">
        {tools.map((tool, index) => {
          if (tool === "divider") {
            return <ToolbarDivider key={`d-${index}`} />;
          }
          const Icon = tool.icon;
          return (
            <ToolbarButton
              key={tool.id}
              label={tool.label}
              active={Boolean(tool.command && active[tool.command])}
              onMouseDown={() => {
                if (tool.action) tool.action();
                else if (tool.command) run(tool.command, tool.value);
              }}
            >
              <Icon size={14} strokeWidth={2} />
            </ToolbarButton>
          );
        })}
      </div>

      <div className="relative">
        {isEmpty && (
          <span
            className={`pointer-events-none absolute top-2 px-2 text-xs text-gray-400 ${
              dir === "rtl" ? "right-0 text-right" : "left-0"
            }`}
          >
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          dir={dir}
          onInput={emitChange}
          onKeyUp={syncActive}
          onMouseUp={syncActive}
          onBlur={emitChange}
          className={`${EDITOR_BODY_CLASS} ${minHeightClassName} ${
            dir === "rtl" ? "text-right" : "text-left"
          }`}
        />
      </div>
    </div>
  );
}
