"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, ImageDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@togo-framework/ui-core";
import { DataTable } from "@togo-framework/ui-data-table";

// Standalone syntax highlighting for CodeBlock — registers just the languages we use
// (keeps the bundle lean; reuses the highlight.js the kit already depends on).
import hljs from "highlight.js/lib/core";
import hlBash from "highlight.js/lib/languages/bash";
import hlGo from "highlight.js/lib/languages/go";
import hlTs from "highlight.js/lib/languages/typescript";
import hlJs from "highlight.js/lib/languages/javascript";
import hlJson from "highlight.js/lib/languages/json";
import hlYaml from "highlight.js/lib/languages/yaml";
import hlSql from "highlight.js/lib/languages/sql";
import hlGraphql from "highlight.js/lib/languages/graphql";
import hlPwsh from "highlight.js/lib/languages/powershell";
import hlDockerfile from "highlight.js/lib/languages/dockerfile";

const HL_LANGS: Record<string, any> = {
  bash: hlBash, go: hlGo, typescript: hlTs, javascript: hlJs, json: hlJson,
  yaml: hlYaml, sql: hlSql, graphql: hlGraphql, powershell: hlPwsh, dockerfile: hlDockerfile,
};
for (const [name, def] of Object.entries(HL_LANGS)) {
  try { if (!hljs.getLanguage(name)) hljs.registerLanguage(name, def); } catch { /* noop */ }
}
const HL_ALIAS: Record<string, string> = {
  sh: "bash", shell: "bash", zsh: "bash", console: "bash",
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", mjs: "javascript",
  yml: "yaml", ps: "powershell", ps1: "powershell", gql: "graphql", docker: "dockerfile",
};
/** Highlight a raw code string to hljs HTML; returns null if the language is unknown. */
function highlightToHtml(code: string, lang?: string): string | null {
  const key = lang ? HL_ALIAS[lang] ?? lang : undefined;
  try {
    if (key && hljs.getLanguage(key)) return hljs.highlight(code, { language: key }).value;
  } catch { /* fall through */ }
  return null;
}

export interface MarkdownRendererProps {
  content: string;
  language?: "en" | "ar";
  className?: string;
}

// ── Markdown table → kit DataTable (sortable + CSV export) ──────────────────────
function hastText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  if (Array.isArray(node.children)) return node.children.map(hastText).join("");
  return "";
}
function parseTable(node: any): { headers: string[]; rows: string[][] } {
  const kids = node?.children ?? [];
  const thead = kids.find((c: any) => c.tagName === "thead");
  const tbody = kids.find((c: any) => c.tagName === "tbody");
  const hRow = (thead?.children ?? []).find((c: any) => c.tagName === "tr");
  const headers = (hRow?.children ?? []).filter((c: any) => c.tagName === "th").map((c: any) => hastText(c).trim());
  const rows = (tbody?.children ?? []).filter((c: any) => c.tagName === "tr").map((tr: any) =>
    (tr.children ?? []).filter((c: any) => c.tagName === "td").map((c: any) => hastText(c).trim()));
  return { headers, rows };
}

/** MarkdownTable — renders a GFM table via the kit's DataTable (sortable, searchable,
 * CSV export). Exported so apps can reuse the markdown-table → DataTable mapping. */
export function MarkdownTable({ node, language = "en" }: { node: any; language?: "en" | "ar" }) {
  const { headers, rows } = React.useMemo(() => parseTable(node), [node]);
  if (!headers.length) {
    return <div className="my-3 overflow-x-auto rounded-lg border border-border"><table className="w-full text-start text-sm" /></div>;
  }
  const columns: ColumnDef<Record<string, string>>[] = headers.map((h, i) => ({
    accessorKey: `c${i}`,
    header: h,
    meta: { header_en: h, header_ar: h },
  }));
  const data = rows.map((r, i) => {
    const o: Record<string, string> = { _id: String(i) };
    r.forEach((c, j) => { o[`c${j}`] = c; });
    return o;
  });
  return (
    <div className="my-3">
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => (r as { _id: string })._id}
        language={language}
        showGlobalSearch={rows.length > 8}
        showCsvExport
        showDensityToggle={false}
        pageSize={rows.length > 25 ? 25 : 1000}
      />
    </div>
  );
}

// ── Code block — styled header + copy + PNG export ──────────────────────────────
/** CodeBlock — a fenced code block with a language label, Copy, and download-as-PNG.
 * Exported so apps can render standalone code with the same chrome. */
export function CodeBlock({ lang, children }: { lang?: string; children?: React.ReactNode }) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const codeRef = React.useRef<HTMLElement>(null);
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    const text = codeRef.current?.textContent ?? "";
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); });
  };
  const downloadPng = async () => {
    if (!boxRef.current) return;
    const { toPng } = await import("html-to-image");
    const bg = getComputedStyle(boxRef.current).backgroundColor;
    const url = await toPng(boxRef.current, { pixelRatio: 2, backgroundColor: bg });
    const a = document.createElement("a");
    a.href = url; a.download = `code.${lang || "txt"}.png`; a.click();
  };

  // Standalone use (e.g. on a landing page) passes a raw string → highlight it here.
  // MarkdownRenderer passes already-highlighted nodes (rehype-highlight) → render as-is.
  const raw =
    typeof children === "string" ? children
    : Array.isArray(children) && children.every((c) => typeof c === "string") ? children.join("")
    : null;
  const html = raw != null ? highlightToHtml(raw.replace(/\n$/, ""), lang) : null;

  return (
    <div className="tg-code my-3 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{lang || "code"}</span>
        <span className="flex items-center gap-1">
          <button onClick={copy} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? "Copied" : "Copy"}
          </button>
          <button onClick={downloadPng} aria-label="Download as PNG" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <ImageDown className="h-3 w-3" />PNG
          </button>
        </span>
      </div>
      <div ref={boxRef} className="bg-muted/40 p-3">
        <pre dir="ltr" className="overflow-x-auto text-[0.8rem] leading-relaxed [&>code]:bg-transparent [&>code]:p-0">
          {html != null
            ? <code ref={codeRef} className={cn("hljs", lang && `language-${lang}`)} dangerouslySetInnerHTML={{ __html: html }} />
            : <code ref={codeRef} className={cn("hljs", lang && `language-${lang}`)}>{children}</code>}
        </pre>
      </div>
    </div>
  );
}

// ── Mermaid diagram block (rendered client-side, lazily) ────────────────────────
let _mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
function loadMermaid() {
  if (!_mermaidPromise) {
    _mermaidPromise = import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
      return m.default;
    });
  }
  return _mermaidPromise;
}

let _mermaidSeq = 0;
function MermaidBlock({ code }: { code: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then(async (mermaid) => {
        const id = `tg-mermaid-${++_mermaidSeq}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => !cancelled && setError(String(e?.message || e)));
    return () => { cancelled = true; };
  }, [code]);
  if (error) {
    return (
      <pre className="overflow-auto rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
        Mermaid error: {error}
        {"\n\n"}{code}
      </pre>
    );
  }
  return <div ref={ref} className="my-3 flex justify-center overflow-x-auto rounded-lg border border-border bg-card p-3" />;
}

/** MarkdownRenderer — GFM markdown with highlighted code, mermaid diagrams, and
 * token-themed prose (headings/lists/tables/code/quote/links). RTL-aware. */
export function MarkdownRenderer({ content, language = "en", className }: MarkdownRendererProps) {
  const isRTL = language === "ar";
  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={cn("tg-md text-sm leading-relaxed text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          h1: (p) => <h1 className="mb-3 mt-5 text-2xl font-bold" {...p} />,
          h2: (p) => <h2 className="mb-2 mt-5 border-b border-border pb-1 text-xl font-semibold" {...p} />,
          h3: (p) => <h3 className="mb-2 mt-4 text-lg font-semibold" {...p} />,
          p: (p) => <p className="my-2.5" {...p} />,
          a: (p) => <a className="font-medium text-primary underline-offset-2 hover:underline" {...p} />,
          ul: (p) => <ul className="my-2.5 list-disc space-y-1 ps-6" {...p} />,
          ol: (p) => <ol className="my-2.5 list-decimal space-y-1 ps-6" {...p} />,
          li: (p) => <li className="marker:text-muted-foreground" {...p} />,
          blockquote: (p) => <blockquote className="my-3 border-s-4 border-primary/40 ps-4 text-muted-foreground" {...p} />,
          hr: () => <hr className="my-5 border-border" />,
          // GFM tables render through the kit DataTable (sortable + CSV export).
          table: (p: any) => <MarkdownTable node={p.node} language={language} />,
          code(props) {
            const { children, className: cls, node, ...rest } = props as any;
            const text = String(children ?? "");
            const lang = /language-(\w+)/.exec(cls || "")?.[1];
            const inline = !node || node.position?.start.line === node.position?.end.line;
            if (lang === "mermaid") return <MermaidBlock code={text.replace(/\n$/, "")} />;
            if (inline && !cls) return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...rest}>{children}</code>;
            // Block code → styled CodeBlock (copy + PNG export). pre passes through.
            return <CodeBlock lang={lang}>{children}</CodeBlock>;
          },
          pre: (p: any) => <>{p.children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
