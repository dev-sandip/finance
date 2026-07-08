"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownReport({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="mb-4 text-xl font-semibold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-3 mt-6 text-base font-semibold">{children}</h2>,
        p: ({ children }) => <p className="my-3 text-sm leading-7">{children}</p>,
        ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-5 text-sm leading-7">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 pl-5 text-sm leading-7">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
