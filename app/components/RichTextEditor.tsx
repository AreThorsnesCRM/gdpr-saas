"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
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

  // Sync ekstern content-endring (f.eks. ved lasting)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content])

  if (!editor) return null

  function insertMergeField(value: string) {
    editor?.chain().focus().insertContent(value).run()
  }

  const btnCls = (active: boolean) =>
    `px-2 py-1 rounded text-xs font-medium transition-colors ${
      active
        ? "bg-slate-800 text-white"
        : "text-gray-600 hover:bg-gray-100"
    }`

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
        {/* Formatering */}
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnCls(editor.isActive("bold"))}>
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnCls(editor.isActive("italic"))}>
          <em>I</em>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnCls(editor.isActive("heading", { level: 2 }))}>
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btnCls(editor.isActive("heading", { level: 3 }))}>
          H3
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnCls(editor.isActive("bulletList"))}>
          • Liste
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnCls(editor.isActive("orderedList"))}>
          1. Liste
        </button>

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
