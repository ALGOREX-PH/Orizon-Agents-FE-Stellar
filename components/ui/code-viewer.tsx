"use client";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import html from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

SyntaxHighlighter.registerLanguage("html", html);
SyntaxHighlighter.registerLanguage("markup", html);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("python", python);

const LANG_MAP: Record<string, string> = {
  html: "markup",
  js: "javascript",
  ts: "typescript",
  tsx: "tsx",
  css: "css",
  python: "python",
  py: "python",
};

export function CodeViewer({
  language,
  code,
  maxHeight = 560,
}: {
  language: string;
  code: string;
  maxHeight?: number;
}) {
  const lang = LANG_MAP[language.toLowerCase()] ?? "markup";
  return (
    <div
      className="relative overflow-auto rounded-sm border border-border bg-[#060010]"
      style={{ maxHeight }}
    >
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem 1.25rem",
          background: "transparent",
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
        wrapLongLines
        showLineNumbers
        lineNumberStyle={{
          minWidth: "2.2em",
          opacity: 0.4,
          userSelect: "none",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
