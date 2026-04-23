import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Heading2 } from "lucide-react";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichEditor = ({ content, onChange, placeholder }: RichEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "内容を入力..." }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

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
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[160px] px-3 py-2 text-sm text-foreground prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
};

export default RichEditor;
