'use client'
import { useState, useRef, useEffect } from 'react'
import { Search, Send, Loader2, Scale, Trash2 } from 'lucide-react'
import { sendChatMessage, clearChatSession } from '@/lib/api'

/* ── Types ──────────────────────────────────────────────────────────────────── */
type Role = 'user' | 'ai'
interface Message { id: string; role: Role; text: string; ts: Date }
interface Conversation {
  id: string; user: string; plan: string; area: string
  lastMessage: string; time: string; messages: number
}

/* ── Mock conversations ─────────────────────────────────────────────────────── */
const mockConversations: Conversation[] = [
  { id: 'c1', user: 'Ana Torres',     plan: 'Pro',   area: 'laboral',   lastMessage: '¿Cuántos días de vacaciones me corresponden?',        time: 'hace 5 min',  messages: 4 },
  { id: 'c2', user: 'Carlos Mendez',  plan: 'Free',  area: 'civil',     lastMessage: '¿Qué pasa si mi arrendador no devuelve el depósito?', time: 'hace 23 min', messages: 7 },
  { id: 'c3', user: 'María Vega',     plan: 'Firma', area: 'mercantil', lastMessage: '¿Cómo constituyo una compañía limitada en Ecuador?',  time: 'hace 1h',     messages: 12 },
  { id: 'c4', user: 'Pedro Alvarado', plan: 'Free',  area: 'familia',   lastMessage: '¿Cómo pido la pensión alimenticia?',                  time: 'hace 2h',     messages: 3 },
  { id: 'c5', user: 'Sofía Ruiz',     plan: 'Pro',   area: 'laboral',   lastMessage: '¿Me pueden despedir estando embarazada?',             time: 'hace 3h',     messages: 9 },
]

const SEED: Record<string, Message[]> = {
  c1: [{ id: 's1', role: 'user', text: '¿Cuántos días de vacaciones me corresponden?', ts: new Date(Date.now() - 5 * 60000) }],
  c2: [{ id: 's2', role: 'user', text: '¿Qué pasa si mi arrendador no devuelve el depósito?', ts: new Date(Date.now() - 23 * 60000) }],
  c3: [{ id: 's3', role: 'user', text: '¿Cómo constituyo una compañía limitada en Ecuador?', ts: new Date(Date.now() - 60 * 60000) }],
  c4: [{ id: 's4', role: 'user', text: '¿Cómo pido la pensión alimenticia?', ts: new Date(Date.now() - 120 * 60000) }],
  c5: [{ id: 's5', role: 'user', text: '¿Me pueden despedir estando embarazada?', ts: new Date(Date.now() - 180 * 60000) }],
}

/* ── Style maps ─────────────────────────────────────────────────────────────── */
const areaColor: Record<string, string> = {
  laboral: 'bg-blue-900/50 text-blue-300',
  civil: 'bg-purple-900/50 text-purple-300',
  mercantil: 'bg-amber-900/50 text-amber-300',
  familia: 'bg-pink-900/50 text-pink-300',
}
const planColor: Record<string, string> = {
  Free: 'bg-gray-800 text-gray-400',
  Pro: 'bg-rimai-900 text-rimai-300',
  Firma: 'bg-violet-900 text-violet-300',
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function fmtTime(d: Date) {
  return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
}
function uid() { return Math.random().toString(36).slice(2) }
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function ChatPage() {
  const [conversations] = useState(mockConversations)
  const [selected, setSelected]     = useState(conversations[0])
  const [search, setSearch]         = useState('')
  const [threads, setThreads]       = useState<Record<string, Message[]>>(SEED)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const messages = threads[selected.id] ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filtered = conversations.filter(c =>
    c.user.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  )

  function addMessage(convId: string, msg: Message) {
    setThreads(prev => ({ ...prev, [convId]: [...(prev[convId] ?? []), msg] }))
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const convId = selected.id
    addMessage(convId, { id: uid(), role: 'user', text, ts: new Date() })
    setInput('')
    setLoading(true)

    try {
      const res = await sendChatMessage(`admin-${convId}`, text)
      addMessage(convId, { id: uid(), role: 'ai', text: res.response, ts: new Date() })
    } catch {
      addMessage(convId, { id: uid(), role: 'ai', text: '⚠️ Error conectando con el backend de RimAI.', ts: new Date() })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleClear() {
    await clearChatSession(`admin-${selected.id}`).catch(() => null)
    setThreads(prev => ({ ...prev, [selected.id]: [] }))
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Conversation list ──────────────────────────────────────────────────── */}
      <aside className="w-72 border-r border-[#2d1f5e] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d1f5e]">
          <h1 className="text-sm font-semibold text-white mb-3">Conversaciones</h1>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-rimai-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-rimai-600 focus:outline-none focus:border-rimai-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className={`w-full text-left px-4 py-3 border-b border-[#2d1f5e] transition-colors ${selected.id === c.id ? 'bg-rimai-900/40 border-l-2 border-l-rimai-500' : 'hover:bg-[#1a1335]'}`}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-white">{c.user}</span>
                <span className="text-xs text-rimai-500">{c.time}</span>
              </div>
              <p className="text-xs text-rimai-400 truncate mb-2">{c.lastMessage}</p>
              <div className="flex gap-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded ${planColor[c.plan]}`}>{c.plan}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${areaColor[c.area] ?? 'bg-gray-800 text-gray-400'}`}>{c.area}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Chat panel ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-5 py-3 border-b border-[#2d1f5e] flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-rimai-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {initials(selected.user)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{selected.user}</p>
            <p className="text-xs text-rimai-400">{selected.messages} mensajes · {selected.area}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded shrink-0 ${planColor[selected.plan]}`}>{selected.plan}</span>
          <button onClick={handleClear} title="Limpiar chat"
            className="p-1.5 rounded-lg text-rimai-500 hover:text-rimai-300 hover:bg-[#1a1335] transition-colors">
            <Trash2 size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-rimai-600">
              <Scale size={36} className="text-rimai-700" />
              <p className="text-sm">Envía un mensaje para iniciar la consulta legal.</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-rimai-800 flex items-center justify-center text-xs font-bold text-rimai-200 shrink-0 mt-1">R</div>
              )}
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-rimai-700 text-white rounded-tr-sm'
                  : 'bg-[#1a1335] border border-[#2d1f5e] text-rimai-100 rounded-tl-sm'
                }`}>
                {msg.role === 'ai' && (
                  <p className="text-xs text-rimai-400 mb-1.5 font-medium">RimAI · Asistente Legal</p>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-rimai-300 text-right' : 'text-rimai-600'}`}>
                  {fmtTime(msg.ts)}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200 shrink-0 mt-1">
                  {initials(selected.user)}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-rimai-800 flex items-center justify-center text-xs font-bold text-rimai-200 shrink-0 mt-1">R</div>
              <div className="bg-[#1a1335] border border-[#2d1f5e] rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="text-xs text-rimai-400 mb-1.5">RimAI · Asistente Legal</p>
                <div className="flex items-center gap-1.5">
                  <Loader2 size={13} className="text-rimai-400 animate-spin" />
                  <span className="text-xs text-rimai-400">Analizando consulta legal...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-[#2d1f5e] shrink-0">
          <div className="flex gap-3 items-end bg-[#12093a] border border-[#2d1f5e] rounded-xl px-4 py-3 focus-within:border-rimai-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribe una consulta legal… (Enter para enviar, Shift+Enter para nueva línea)"
              rows={1}
              style={{ resize: 'none' }}
              className="flex-1 bg-transparent text-sm text-white placeholder-rimai-600 focus:outline-none min-h-[24px] max-h-36 overflow-y-auto leading-6"
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 144) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2 bg-rimai-700 hover:bg-rimai-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-xs text-rimai-600 mt-1.5 text-center">
            RimAI analiza basado en legislación ecuatoriana vigente
          </p>
        </div>
      </div>
    </div>
  )
}
