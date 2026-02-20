"use client";

import { memo } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

function MarkdownMessageInner({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-neutral dark:prose-invert max-w-none",
        "prose-p:my-1.5 prose-p:leading-relaxed",
        "prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold",
        "prose-li:my-0.5 prose-ol:my-2 prose-ul:my-2",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:my-3 prose-pre:rounded-xl prose-pre:border prose-pre:border-border/60 prose-pre:bg-muted/50 prose-pre:p-4",
        "prose-a:text-primary prose-a:underline-offset-2 hover:prose-a:text-primary/80",
        "prose-table:my-3 prose-td:border prose-th:border prose-td:border-border/60 prose-th:border-border/60 prose-th:bg-muted/30 prose-td:px-3 prose-th:px-3 prose-td:py-1.5 prose-th:py-1.5 prose-table:text-sm",
        "prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-hr:my-4 prose-hr:border-border/60",
        "text-[14px]",
        className
      )}
    >
      <Markdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
        {content}
      </Markdown>
    </div>
  );
}

export const MarkdownMessage = memo(MarkdownMessageInner);
