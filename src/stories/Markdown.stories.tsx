import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MarkdownRenderer, MarkdownEditor } from "../components/markdown";

const meta: Meta = {
  title: "Components/Markdown",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

const SAMPLE = `# Release notes

A **markdown** renderer with _GFM_, ~~strikethrough~~, and \`inline code\`.

## Features

- [x] Tables, task lists, autolinks
- [x] Syntax-highlighted code blocks
- [x] Mermaid diagrams
- [ ] Your idea here

> Themed with the design tokens — try the dark/light toggle.

### A code block

\`\`\`ts
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

### A table

| Source | Mentions | Reach |
| --- | --- | --- |
| Reuters | 333 | High |
| AFP | 276 | Medium |
| Al Jazeera | 190 | Medium |

### A diagram

\`\`\`mermaid
flowchart LR
  A[Fetch] --> B{New?}
  B -- yes --> C[Classify]
  B -- no --> D[Skip]
  C --> E[(Save)]
\`\`\`

[Read more](https://example.com).
`;

export const Renderer: Story = {
  render: () => <div className="mx-auto max-w-3xl"><MarkdownRenderer content={SAMPLE} /></div>,
};

export const Editor: Story = {
  render: () => {
    const [value, setValue] = useState(SAMPLE);
    return <MarkdownEditor value={value} onChange={setValue} className="mx-auto max-w-4xl" />;
  },
};

export const EditorArabicRTL: Story = {
  name: "Editor — Arabic / RTL",
  render: () => {
    const [value, setValue] = useState("# مرحبًا\n\nمحرر **ماركداون** بمعاينة مباشرة.\n\n- عنصر\n- عنصر آخر\n");
    return <MarkdownEditor value={value} onChange={setValue} language="ar" className="mx-auto max-w-4xl" />;
  },
};
