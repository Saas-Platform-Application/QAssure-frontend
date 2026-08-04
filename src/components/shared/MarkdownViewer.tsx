import type { ReactElement } from "react";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export const MarkdownViewer = ({
  content,
  className = "",
}: MarkdownViewerProps): ReactElement => {
  if (!content) return <></>;

  const parseBold = (text: string) => {
    if (!text) return "";
    const parts = text.split("**");
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className="font-bold text-slate-900 select-text">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const parseLine = (line: string, lineIndex: number) => {
    // 1. Check for headings
    if (line.startsWith("### ")) {
      return (
        <h3
          key={lineIndex}
          className="text-base font-bold text-slate-800 mt-3 mb-1 select-text"
        >
          {parseBold(line.slice(4))}
        </h3>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2
          key={lineIndex}
          className="text-lg font-bold text-slate-800 mt-4 mb-2 select-text"
        >
          {parseBold(line.slice(3))}
        </h2>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h1
          key={lineIndex}
          className="text-xl font-bold text-slate-800 mt-4 mb-2 select-text"
        >
          {parseBold(line.slice(2))}
        </h1>
      );
    }

    // 2. Check for bullet lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const cleanLine = line.trim().startsWith("- ")
        ? line.trim().slice(2)
        : line.trim().slice(2);
      return (
        <li
          key={lineIndex}
          className="ml-5 text-xs text-slate-700 list-disc leading-relaxed select-text"
        >
          {parseBold(cleanLine)}
        </li>
      );
    }

    // 3. Regular paragraph
    return (
      <p
        key={lineIndex}
        className="text-xs text-slate-700 leading-relaxed min-h-[1em] mb-1 select-text"
      >
        {parseBold(line)}
      </p>
    );
  };

  // Split content by newline and process each line
  const lines = content.split("\n");

  return (
    <div className={`flex flex-col gap-1 select-text ${className}`}>
      {lines.map((line, index) => parseLine(line, index))}
    </div>
  );
};
