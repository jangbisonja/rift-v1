"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, Heading2, ImagePlus, Images, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MediaPickerModal } from "@/components/mod/media-picker-modal";
import type { MediaRead } from "@/lib/schemas";
import type { TipTapDoc } from "@/types/tiptap";

interface RichEditorProps {
  value?: TipTapDoc;
  onChange?: (value: TipTapDoc) => void;
  /** Upload a file and return the URL to insert. If provided, shows upload button. */
  onUploadImage?: (file: File) => Promise<string>;
  /** Media items available to pick from (post's attached media). */
  mediaLibrary?: MediaRead[];
}

export function RichEditor({ value, onChange, onUploadImage, mediaLibrary }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image],
    content: value ?? { type: "doc", content: [] },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON() as TipTapDoc);
    },
  });

  if (!editor) return null;

  function insertByUrl() {
    const url = window.prompt("Image URL");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;
    e.target.value = "";
    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      editor?.chain().focus().setImage({ src: url }).run();
    } finally {
      setIsUploading(false);
    }
  }

  function handlePickerSelect(url: string) {
    editor?.chain().focus().setImage({ src: url }).run();
    setShowPicker(false);
  }

  const hasLibrary = mediaLibrary && mediaLibrary.length > 0;

  return (
    <>
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

          {/* Upload image — shown when upload handler provided */}
          {onUploadImage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Upload image"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Pick from library — shown when library is non-empty */}
          {mediaLibrary && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPicker(true)}
              disabled={!hasLibrary}
              title={hasLibrary ? "Pick from media library" : "No media attached yet"}
            >
              <Images className="h-4 w-4" />
            </Button>
          )}

          {/* URL fallback — shown when no upload handler (e.g. used outside admin) */}
          {!onUploadImage && (
            <Button type="button" variant="ghost" size="icon" onClick={insertByUrl} title="Insert image by URL">
              <Link2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isUploading && (
          <p className="px-4 py-1.5 text-xs text-muted-foreground border-b">Uploading…</p>
        )}

        {/* Editor area */}
        <EditorContent
          editor={editor}
          className="prose prose-sm dark:prose-invert max-w-none p-4 focus-within:outline-none [&_.ProseMirror]:min-h-32 [&_.ProseMirror]:outline-none"
        />
      </div>

      {mediaLibrary && (
        <MediaPickerModal
          open={showPicker}
          items={mediaLibrary}
          onSelect={handlePickerSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
