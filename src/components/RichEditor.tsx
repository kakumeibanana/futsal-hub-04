import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, Heading2, ImageIcon, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichEditor = ({ content, onChange, placeholder }: RichEditorProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "内容を入力..." }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("news-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("news-images").getPublicUrl(path);
      editor.chain().focus().setImage({ src: data.publicUrl }).run();
      onChange(editor.getHTML());
      // ギャラリーにも自動追加
      await supabase.from("gallery_images").insert({ url: data.publicUrl });
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded text-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))}>
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))}>
          <Italic size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))}>
          <Heading2 size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))}>
          <List size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))}>
          <ListOrdered size={14} />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`${btnClass(false)} disabled:opacity-50`}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[160px] px-3 py-2 text-sm text-foreground [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-2"
      />
    </div>
  );
};

export default RichEditor;
