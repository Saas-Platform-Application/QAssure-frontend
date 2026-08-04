import { useEffect, useMemo, useState, type ReactElement } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import FontFamily from "@tiptap/extension-font-family";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Eraser,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  RemoveFormatting,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  minHeightClassName?: string;
}

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: Record<string, string>) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: any }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: { chain: any }) => {
          return chain().setMark("textStyle", { fontSize: null }).run();
        },
    } as any;
  },
});

const ToolButton = ({
  isActive,
  onClick,
  title,
  children,
}: {
  isActive?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}): ReactElement => (
  <button
    type="button"
    onMouseDown={(event) => {
      // Keep editor selection/focus while clicking toolbar actions.
      event.preventDefault();
    }}
    onClick={onClick}
    title={title}
    className={cn(
      "h-8 w-8 rounded border text-[#334155] flex items-center justify-center",
      isActive
        ? "bg-[#112868]/10 border-[#112868]/20"
        : "border-transparent hover:border-[rgba(0,0,0,0.08)] hover:bg-white",
    )}
  >
    {children}
  </button>
);

export const RichTextEditor = ({
  label,
  value,
  onChange,
  placeholder = "Start writing...",
  required = false,
  error,
  minHeightClassName = "min-h-[300px]",
}: RichTextEditorProps): ReactElement => {
  const [showMoreTools, setShowMoreTools] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || "",
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML(), currentEditor.getText());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  const activeBlock = useMemo((): string => {
    if (!editor) return "paragraph";
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    return "paragraph";
  }, [editor, editor?.state]);

  const activeFontFamily = editor?.getAttributes("textStyle").fontFamily || "Verdana";
  const activeFontSize = editor?.getAttributes("textStyle").fontSize || "12pt";

  const applyBlockStyle = (value: string): void => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "paragraph") {
      chain.setParagraph().run();
      return;
    }
    const level = Number(value.replace("h", ""));
    if ([1, 2, 3].includes(level)) {
      chain.setHeading({ level: level as 1 | 2 | 3 }).run();
    }
  };

  return (
    <div className="flex flex-col gap-2 pb-1">
      <label className="flex items-center gap-1 text-[13px] font-medium text-[#0e1b2a]">
        <span>{label}</span>
        {required && <span className="text-[#e02424]">*</span>}
      </label>
      <div
        className={cn(
          "border rounded-md overflow-hidden bg-white",
          error ? "border-[#ef4444]" : "border-[rgba(0,0,0,0.08)]",
        )}
      >
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[rgba(0,0,0,0.08)] bg-[#f8fafc]">
          <ToolButton
            title="Plain Text"
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .unsetAllMarks()
                .clearNodes()
                .setParagraph()
                .unsetColor()
                .run()
            }
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </ToolButton>
          <div className="h-5 w-px bg-[rgba(0,0,0,0.08)] mx-1" />
          <ToolButton
            title="Bold"
            isActive={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton
            title="Italic"
            isActive={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton
            title="Underline"
            isActive={editor?.isActive("underline")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolButton>
          <div className="h-5 w-px bg-[rgba(0,0,0,0.08)] mx-1" />
          <ToolButton
            title="Align Left"
            isActive={editor?.isActive({ textAlign: "left" })}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton
            title="Align Center"
            isActive={editor?.isActive({ textAlign: "center" })}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton
            title="Align Right"
            isActive={editor?.isActive({ textAlign: "right" })}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="w-3.5 h-3.5" />
          </ToolButton>
          <ToolButton
            title="Justify"
            isActive={editor?.isActive({ textAlign: "justify" })}
            onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </ToolButton>
          <div className="h-5 w-px bg-[rgba(0,0,0,0.08)] mx-1" />
          <select
            value={activeBlock}
            onChange={(event) => applyBlockStyle(event.target.value)}
            className="h-8 px-2 rounded border border-[rgba(0,0,0,0.08)] bg-white text-xs text-[#334155]"
            title="Block style"
          >
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <select
            value={activeFontFamily}
            onChange={(event) =>
              editor?.chain().focus().setFontFamily(event.target.value).run()
            }
            className="h-8 px-2 rounded border border-[rgba(0,0,0,0.08)] bg-white text-xs text-[#334155]"
            title="Font family"
          >
            <option value="Verdana">Verdana</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Tahoma">Tahoma</option>
          </select>
          <select
            value={activeFontSize}
            onChange={(event) =>
              (editor as any)?.chain().focus().setFontSize(event.target.value).run()
            }
            className="h-8 px-2 rounded border border-[rgba(0,0,0,0.08)] bg-white text-xs text-[#334155]"
            title="Font size"
          >
            <option value="10pt">10pt</option>
            <option value="11pt">11pt</option>
            <option value="12pt">12pt</option>
            <option value="14pt">14pt</option>
            <option value="16pt">16pt</option>
            <option value="18pt">18pt</option>
            <option value="24pt">24pt</option>
          </select>
          <div className="h-5 w-px bg-[rgba(0,0,0,0.08)] mx-1" />
          <input
            type="color"
            title="Text Color"
            className="h-8 w-8 rounded border border-[rgba(0,0,0,0.08)] bg-white cursor-pointer"
            onChange={(event) =>
              editor?.chain().focus().setColor(event.target.value).run()
            }
          />
          <input
            type="color"
            title="Background Color"
            className="h-8 w-8 rounded border border-[rgba(0,0,0,0.08)] bg-white cursor-pointer"
            onChange={(event) =>
              editor
                ?.chain()
                .focus()
                .setHighlight({ color: event.target.value })
                .run()
            }
          />
          <ToolButton
            title="More Options"
            onClick={() => setShowMoreTools((prev) => !prev)}
          >
            {showMoreTools ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </ToolButton>
        </div>
        {showMoreTools && (
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[rgba(0,0,0,0.08)] bg-[#f1f5f9]">
            <ToolButton
              title="Bullet List"
              isActive={editor?.isActive("bulletList")}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Numbered List"
              isActive={editor?.isActive("orderedList")}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Decrease Indent"
              onClick={() =>
                editor?.chain().focus().liftListItem("listItem").run()
              }
            >
              <IndentDecrease className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Increase Indent"
              onClick={() =>
                editor?.chain().focus().sinkListItem("listItem").run()
              }
            >
              <IndentIncrease className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Blockquote"
              isActive={editor?.isActive("blockquote")}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Insert Link"
              isActive={editor?.isActive("link")}
              onClick={() => {
                if (!editor) return;
                const selection = editor.state.selection;
                const url = window.prompt("Enter URL");
                if (url) {
                  const normalizedUrl = /^https?:\/\//i.test(url)
                    ? url
                    : `https://${url}`;

                  const isSelectionEmpty = selection.empty;
                  const from = selection.from;
                  const to = selection.to;

                  if (isSelectionEmpty) {
                    editor
                      .chain()
                      .focus()
                      .setTextSelection({ from, to })
                      .insertContent(normalizedUrl)
                      .setTextSelection({
                        from,
                        to: from + normalizedUrl.length,
                      })
                      .setLink({ href: normalizedUrl })
                      .run();
                    return;
                  }

                  editor
                    .chain()
                    .focus()
                    .setTextSelection({ from, to })
                    .extendMarkRange("link")
                    .setLink({ href: normalizedUrl })
                    .run();
                }
              }}
            >
              <Link2 className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Remove Link"
              onClick={() => editor?.chain().focus().unsetLink().run()}
            >
              <Link2 className="w-3.5 h-3.5 opacity-60" />
            </ToolButton>
            <ToolButton
              title="Highlight"
              isActive={editor?.isActive("highlight")}
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Strike"
              isActive={editor?.isActive("strike")}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Clear Formatting"
              onClick={() =>
                editor?.chain().focus().unsetAllMarks().clearNodes().run()
              }
            >
              <Eraser className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </ToolButton>
            <ToolButton
              title="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </ToolButton>
          </div>
        )}
        <EditorContent
          editor={editor}
          className={cn(
            "p-3 text-sm text-[#0f1724] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:leading-6 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#9aa6b2] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_h1]:text-[30px] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:leading-tight [&_.ProseMirror_h1]:my-2 [&_.ProseMirror_h2]:text-[24px] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:leading-tight [&_.ProseMirror_h2]:my-2 [&_.ProseMirror_h3]:text-[20px] [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:leading-tight [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[#cbd5e1] [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-[#475569] [&_.ProseMirror_a]:text-[#084cc8] [&_.ProseMirror_a]:underline",
            minHeightClassName,
          )}
        />
      </div>
      {error && <p className="text-sm text-[#ef4444]">{error}</p>}
    </div>
  );
};

