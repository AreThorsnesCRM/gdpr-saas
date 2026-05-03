"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import { useEffect } from "react"

const mergeFields = [
  { label: "Kundenavn",  value: "{{kunde_navn}}" },
  { label: "Org.nr",     value: "{{org_nummer}}" },
  { label: "Startdato",  value: "{{startdato}}" },
  { label: "Sluttdato",  value: "{{sluttdato}}" },
  { label: "Firmanavn",  value: "{{firma_navn}}" },
]

type Props = {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: placeholder ?? "Skriv avtaleinnhold her...",
      }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[300px] focus:outline-none px-4 py-3",
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content])

  if (!editor) return null

  function insertMergeField(value: string) {
    editor?.chain().focus().insertContent(value).run()
  }

  const btn = (active: boolean) =>
    `px-2 py-1 rounded text-xs font-medium transition-colors ${
      active ? "bg-slate-800 text-white" : "text-gray-600 hover:bg-gray-100"
    }`

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">

        {/* Overskrifter */}
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btn(editor.isActive("heading", { level: 1 }))}>H1</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive("heading", { level: 2 }))}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btn(editor.isActive("heading", { level: 3 }))}>H3</button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Tekstformatering */}
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive("bold"))}><strong>F</strong></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive("italic"))}><em>K</em></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btn(editor.isActive("underline"))}><span className="underline">U</span></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btn(editor.isActive("strike"))}><span className="line-through">S</span></button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Lister */}
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive("bulletList"))}>• Liste</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive("orderedList"))}>1. Liste</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btn(editor.isActive("blockquote"))}>❝</button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Tekstjustering */}
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={btn(editor.isActive({ textAlign: "left" }))} title="Venstrejustert">⬅</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={btn(editor.isActive({ textAlign: "center" }))} title="Midtstilt">⬛</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={btn(editor.isActive({ textAlign: "right" }))} title="Høyrejustert">➡</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={btn(editor.isActive({ textAlign: "justify" }))} title="Blokkjustert">≡</button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Skillelinje */}
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btn(false)} title="Sett inn skillelinje">— linje</button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Flettefelt */}
        <span className="text-xs text-gray-400 mr-1">Flettefelt:</span>
        {mergeFields.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => insertMergeField(f.value)}
            className="px-2 py-1 rounded text-xs font-mono bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
