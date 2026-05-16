"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline"
import { SparklesIcon } from "@heroicons/react/24/solid"

type Message = { role: "user" | "assistant"; content: string }
type ContextLevel = "limited" | "full"

export default function AssistantChat() {
  const pathname = usePathname()
  const t = useTranslations("assistant")

  const [open, setOpen] = useState(false)
  const [contextLevel, setContextLevel] = useState<ContextLevel>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("assistantContext") as ContextLevel) ?? "limited"
    }
    return "limited"
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function getPageHint(path: string): string {
    if (path.startsWith("/dashboard")) return t("pageHintDashboard")
    if (path.match(/^\/customers\/[^/]+/)) return t("pageHintCustomer")
    if (path.startsWith("/customers")) return t("pageHintCustomers")
    if (path.match(/^\/agreements\/[^/]+/)) return t("pageHintAgreement")
    if (path.startsWith("/agreements")) return t("pageHintAgreements")
    if (path.startsWith("/templates")) return t("pageHintTemplates")
    if (path.startsWith("/settings")) return t("pageHintSettings")
    if (path.startsWith("/archive")) return t("pageHintArchive")
    return path
  }

  function handleContextChange(level: ContextLevel) {
    setContextLevel(level)
    localStorage.setItem("assistantContext", level)
    setMessages([])
  }

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return
    const userMsg: Message = { role: "user", content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setStreaming(true)

    const assistantMsg: Message = { role: "assistant", content: "" }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-10),
          contextLevel,
          pageHint: getPageHint(pathname),
        }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: err.error ?? "Noe gikk galt. Prøv igjen." },
        ])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: accumulated },
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Tilkoblingsfeil. Prøv igjen." },
      ])
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const suggested = [t("suggested1"), t("suggested2"), t("suggested3")]

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        aria-label={t("openLabel")}
      >
        {open ? <XMarkIcon className="h-6 w-6" /> : <ChatBubbleLeftRightIcon className="h-6 w-6" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "540px" }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold">{t("title")}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={contextLevel}
                onChange={e => handleContextChange(e.target.value as ContextLevel)}
                className="text-xs bg-slate-700 text-white border-0 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                title={t("contextTitle")}
              >
                <option value="limited">{t("contextLimited")}</option>
                <option value="full">{t("contextFull")}</option>
              </select>
              <button onClick={() => setOpen(false)} className="hover:text-gray-300 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className={`px-4 py-1.5 text-xs text-center ${contextLevel === "full" ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-400"}`}>
            {contextLevel === "full" ? t("contextFullInfo") : t("contextLimitedInfo")}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 text-center">{t("welcome")}</p>
                <div className="space-y-2">
                  {suggested.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg px-3 py-2 transition-colors border border-gray-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-slate-800 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  {m.content || (
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder")}
              disabled={streaming}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 max-h-24"
              style={{ lineHeight: "1.4" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="flex-shrink-0 w-9 h-9 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
