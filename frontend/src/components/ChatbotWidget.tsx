import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! ✨ I\'m your Kenrish Collection assistant. Ask me about our products, services, prices, or anything beauty-related!' }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const history = [...messages, { role: 'user' as const, content: text }]
    setMessages(history)
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = localStorage.getItem('access')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch('/api/chatbot/stream/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
        signal: controller.signal,
      })

      if (!response.body) throw new Error('No stream')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''
      let finished = false

      while (!finished) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            finished = true
            break
          }
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? ''
            if (delta) {
              fullText += delta
              setMessages(prev => {
                const u = [...prev]
                u[u.length - 1] = { role: 'assistant', content: fullText, streaming: true }
                return u
              })
            }
          } catch {
            // Ignore partial or non-JSON lines until the next chunk arrives
          }
        }
      }

      if (buffer.trim() && !finished) {
        const line = buffer.trim()
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data !== '[DONE]') {
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? ''
              if (delta) fullText += delta
            } catch {
              /* ignore */
            }
          }
        }
      }

      setMessages(prev => {
        const u = [...prev]
        u[u.length - 1] = { role: 'assistant', content: fullText || 'Sorry, I couldn\'t generate a response.', streaming: false }
        return u
      })
    } catch (err) {
      if ((err as { name?: string }).name !== 'AbortError') {
        setMessages(prev => {
          const u = [...prev]
          u[u.length - 1] = { role: 'assistant', content: 'Sorry, I\'m having trouble right now. Please try again!', streaming: false }
          return u
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const quickReplies = ['What products do you have?', 'What are your prices?', 'What services do you offer?']

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          open ? 'bg-muted text-foreground scale-90' : 'bg-primary text-primary-foreground hover:scale-110'
        }`}
        aria-label="Chat with us"
      >
        {open ? <X size={20} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-background border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '520px', maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div className="bg-primary px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles size={16} className="text-primary-foreground/80" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Kenrish Assistant</p>
              <p className="text-white/60 text-xs">Powered by AI</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white/60 text-xs">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-muted/20">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={12} className="text-primary" />
                  </div>
                )}
                <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-background border rounded-bl-sm shadow-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-0.5 prose-ul:my-1 prose-li:my-0 prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
                      <div className="overflow-x-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || ' '}</ReactMarkdown>
                      </div>
                      {msg.streaming && <span className="inline-block w-1 h-4 bg-primary animate-pulse rounded ml-0.5" />}
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies (only show if last message is assistant and not streaming) */}
          {messages.length === 1 && !streaming && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
              {quickReplies.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(sendMessage, 50) }}
                  className="shrink-0 btn-modern btn-modern--secondary text-xs px-3 py-1.5 whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t bg-background flex gap-2 items-end">
            <textarea
              ref={inputRef}
              className="flex-1 border rounded-2xl px-3.5 py-2.5 text-sm bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors max-h-24"
              rows={1}
              placeholder="Ask about products, prices…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition-all active:scale-95"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
