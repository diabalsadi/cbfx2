"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import styles from "./RichEditor.module.scss";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      className={`${styles.toolBtn} ${active ? styles.active : ""}`}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export default function RichEditor({ content, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image,
      Youtube.configure({ controls: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    immediatelyRender: false,
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url && editor) editor.chain().focus().toggleLink({ href: url }).run();
  };

  const addYoutube = () => {
    const url = window.prompt("Enter YouTube URL:");
    if (url && editor) editor.commands.setYoutubeVideo({ src: url });
  };

  if (!editor) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <b>B</b>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <i>I</i>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <u>U</u>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <s>S</s>
          </ToolbarButton>
        </div>
        <div className={styles.divider} />
        <div className={styles.toolGroup}>
          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            title="Heading 3"
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("paragraph")}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Paragraph"
          >
            P
          </ToolbarButton>
        </div>
        <div className={styles.divider} />
        <div className={styles.toolGroup}>
          <ToolbarButton
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="Align Left"
          >
            ⬅
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            title="Align Center"
          >
            ⬛
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="Align Right"
          >
            ➡
          </ToolbarButton>
        </div>
        <div className={styles.divider} />
        <div className={styles.toolGroup}>
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            1. List
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            &ldquo;&rdquo;
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
          >{`</>`}</ToolbarButton>
        </div>
        <div className={styles.divider} />
        <div className={styles.toolGroup}>
          <ToolbarButton
            active={editor.isActive("link")}
            onClick={addLink}
            title="Insert Link"
          >
            🔗
          </ToolbarButton>
          <ToolbarButton active={false} onClick={addImage} title="Insert Image">
            🖼
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={addYoutube}
            title="Embed YouTube"
          >
            ▶
          </ToolbarButton>
        </div>
        <div className={styles.divider} />
        <div className={styles.toolGroup}>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
          >
            ↩
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
          >
            ↪
          </ToolbarButton>
        </div>
      </div>
      <EditorContent editor={editor} className={styles.editor} />
    </div>
  );
}
