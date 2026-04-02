"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, Heading2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface RichEditorProps {
  value?: Record<string, unknown>;
  onChange?: (value: Record<string, unknown>) => void;
}

export function RichEditor({ value, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: value ?? { type: "doc", content: [] },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON() as Record<string, unknown>);
    },
  });

  if (!editor) return null;

  function insertImage() {
    const url = window.prompt("Image URL");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="rounded-md border bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive("bold")}
          className={editor.isActive("bold") ? "bg-accent" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive("italic")}
          className={editor.isActive("italic") ? "bg-accent" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-pressed={editor.isActive("heading", { level: 2 })}
          className={editor.isActive("heading", { level: 2 }) ? "bg-accent" : ""}
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-pressed={editor.isActive("bulletList")}
          className={editor.isActive("bulletList") ? "bg-accent" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-pressed={editor.isActive("orderedList")}
          className={editor.isActive("orderedList") ? "bg-accent" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button type="button" variant="ghost" size="icon" onClick={insertImage}>
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-4 focus-within:outline-none [&_.ProseMirror]:min-h-32 [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
