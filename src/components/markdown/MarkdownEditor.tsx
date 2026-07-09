"use client";

import * as React from "react";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link2, Code, Code2, Quote, Eye, Pencil, Columns2 } from "lucide-react";
import { cn } from "@togo-framework/ui-core";
import { Button } from "@togo-framework/ui-core";
import { Textarea } from "@togo-framework/ui-core";
import { MarkdownRenderer } from "./MarkdownRenderer";

export type MarkdownView = "write" | "preview" | "split";

export interface MarkdownEditorProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  view?: MarkdownView;
  defaultView?: MarkdownView;
  onViewChange?: (view: MarkdownView) => void;
  language?: "en" | "ar";
  placeholder?: string;
  minRows?: number;
  className?: string;
}

type Action =
  | { wrap: string }
  | { wrap: string; end: string }
  | { line: string }
  | { insert: string };

const TOOLBAR: { icon: React.ElementType; title: { en: string; ar: string }; act: Action }[] = [
  { icon: Bold,        title: { en: "Bold", ar: "غامق" },           act: { wrap: "**" } },
  { icon: Italic,      title: { en: "Italic", ar: "مائل" },         act: { wrap: "_" } },
  { icon: Heading1,    title: { en: "Heading 1", ar: "عنوان 1" },   act: { line: "# " } },
  { icon: Heading2,    title: { en: "Heading 2", ar: "عنوان 2" },   act: { line: "## " } },
  { icon: Heading3,    title: { en: "Heading 3", ar: "عنوان 3" },   act: { line: "### " } },
  { icon: List,        title: { en: "Bulleted list", ar: "قائمة" }, act: { line: "- " } },
  { icon: ListOrdered, title: { en: "Numbered list", ar: "قائمة مرقمة" }, act: { line: "1. " } },
  { icon: Quote,       title: { en: "Quote", ar: "اقتباس" },        act: { line: "> " } },
  { icon: Link2,       title: { en: "Link", ar: "رابط" },           act: { wrap: "[", end: "](https://)" } },
  { icon: Code,        title: { en: "Inline code", ar: "كود" },     act: { wrap: "`" } },
  { icon: Code2,       title: { en: "Code block", ar: "كتلة كود" }, act: { wrap: "\n```\n", end: "\n```\n" } },
];

const VIEWS: { key: MarkdownView; icon: React.ElementType; en: string; ar: string }[] = [
  { key: "write", icon: Pencil, en: "Write", ar: "كتابة" },
  { key: "preview", icon: Eye, en: "Preview", ar: "معاينة" },
  { key: "split", icon: Columns2, en: "Split", ar: "تقسيم" },
];

/** MarkdownEditor — toolbar (bold/italic/headings/lists/link/code/quote) + a textarea
 * with a Write / Preview / Split view toggle (Split shows a live MarkdownRenderer).
 * Dependency-light (no CodeMirror/Monaco). Controlled or uncontrolled. RTL + EN/AR. */
export function MarkdownEditor({
  value, defaultValue = "", onChange, view, defaultView = "split", onViewChange,
  language = "en", placeholder, minRows = 10, className,
}: MarkdownEditorProps) {
  const isRTL = language === "ar";
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [internal, setInternal] = React.useState(defaultValue);
  const text = value ?? internal;
  const setText = (v: string) => { setInternal(v); onChange?.(v); };

  const [internalView, setInternalView] = React.useState<MarkdownView>(defaultView);
  const activeView = view ?? internalView;
  const setView = (v: MarkdownView) => { setInternalView(v); onViewChange?.(v); };

  function apply(act: Action) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const sel = text.slice(start, end);
    let next = text, caret = end;
    if ("wrap" in act) {
      const open = act.wrap, close = ("end" in act ? act.end : act.wrap);
      next = text.slice(0, start) + open + sel + close + text.slice(end);
      caret = start + open.length + sel.length + close.length;
    } else if ("line" in act) {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      next = text.slice(0, lineStart) + act.line + text.slice(lineStart);
      caret = end + act.line.length;
    } else if ("insert" in act) {
      next = text.slice(0, start) + act.insert + text.slice(end);
      caret = start + act.insert.length;
    }
    setText(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caret, caret); });
  }

  const t = (en: string, ar: string) => (isRTL ? ar : en);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={cn("flex flex-col overflow-hidden rounded-xl border border-border bg-card", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5">
        {TOOLBAR.map(({ icon: Icon, title, act }, i) => (
          <Button key={i} type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
            title={t(title.en, title.ar)} aria-label={t(title.en, title.ar)}
            disabled={activeView === "preview"} onClick={() => apply(act)}>
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        <div className="ms-auto flex items-center gap-0.5">
          {VIEWS.map(({ key, icon: Icon, en, ar }) => (
            <Button key={key} type="button" size="sm" variant={activeView === key ? "secondary" : "ghost"}
              className="h-7 gap-1.5 px-2" onClick={() => setView(key)}>
              <Icon className="h-3.5 w-3.5" />{t(en, ar)}
            </Button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className={cn("min-h-0 flex-1", activeView === "split" && "grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 rtl:md:divide-x-reverse")}>
        {activeView !== "preview" && (
          <Textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder ?? t("Write markdown…", "اكتب ماركداون…")}
            rows={minRows}
            dir={isRTL ? "rtl" : "ltr"}
            className="min-h-[12rem] resize-y rounded-none border-0 font-mono text-sm focus-visible:ring-0"
          />
        )}
        {activeView !== "write" && (
          <div className="min-h-[12rem] overflow-auto p-4">
            {text.trim()
              ? <MarkdownRenderer content={text} language={language} />
              : <p className="text-sm text-muted-foreground">{t("Nothing to preview yet.", "لا شيء للمعاينة بعد.")}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
