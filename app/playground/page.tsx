'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Trash2, ChevronDown, ChevronUp, FlaskConical, RotateCcw, Copy, Check } from 'lucide-react'
import { sendChatMessage, clearChatSession } from '@/lib/api'

type Role = 'user' | 'ai'
interface Message { id: string; role: Role; text: string; ts: Date }

const SYSTEM_PRESETS = [
  {
    label: 'Default RimAI',
    value: '',
    description: 'Prompt base del agente legal',
  },
  {
    label: 'Conciso',
    value: 'Responde de forma muy breve y directa. Máximo 3 oraciones. Sin explicaciones largas.',
    description: 'Respuestas cortas sin rodeos',
  },
  {
    label: 'Didáctico',
    value: 'Explica cada concepto como si el usuario fuera un estudiante de primer año de derecho. Usa ejemplos simples del día a día ecuatoriano.',
    description: 'Explicaciones con ejemplos cotidianos',
  },
  {
    label: 'Técnico-jurídico',
    value: 'Responde con lenguaje jurídico técnico. Cita artículos específicos, jurisprudencia y doctrina. El usuario es un abogado litigante.',
    description: 'Para audiencia de abogados',
  },
  {
    label: 'Laboral exclusivo',
    value: 'Solo responde consultas sobre derecho laboral ecuatoriano. Si la pregunta no es laboral, indica amablemente que solo puedes ayudar con temas laborales.',
    description: 'Especializado en derecho laboral',
  },
  {
    label: 'Personalizado',
    value: '__custom__',
    description: 'Escribe tu propio prompt',
  },
]

const AREAS = ['general', 'laboral', 'civil', 'penal', 'mercantil', 'familia', 'tributario']

function uid() { return Math.random().toString(36).slice(2) }
function fmtTime(d: Date) { return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }

export default function PlaygroundPage() {
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [sessionId]                     = useState(() => `playground-${Date.now()}`)
  const [showConfig, setShowConfig]     = useState(true)
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [customPrompt, setCustomPrompt] = useState('')
  const [area, setArea]                 = useState('general')
  const [copied, setCopied]             = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const activePreset = SYSTEM_PRESETS[selectedPreset]
  const isCustom = activePreset.value === '__custom__'
  const systemPromptDisplay = isCustom ? customPrompt : activePreset.value

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function addMessage(msg: Message) {
    setMessages(prev => [...prev, msg])
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = `${text}${area !== 'general' ? `\n\n[Área: ${area}]` : ''}${systemPromptDisplay ? `\n\n[Instrucción adicional: ${systemPromptDisplay}]` : ''}`

    addMessage({ id: uid(), role: 'user', text, ts: new Date() })
    setInput('')
    setLoading(true)

    try {
      const res = await sendChatMessage(sessionId, userMsg)
      addMessage({ id: uid(), role: 'ai', text: res.response, ts: new Date() })
    } catch {
      addMessage({ id: uid(), role: 'ai', text: '⚠️ Error conectando con el backend de RimAI.', ts: new Date() })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleClear() {
    await clearChatSession(sessionId).catch(() => null)
    setMessages([])
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text).catch(() => null)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Config panel ────────────────────────────────────────────────────── */}
      <aside className={`border-r border-[#2d1f5e] flex flex-col shrink-0 transition-all duration-200 ${showConfig ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 border-b border-[#2d1f5e] flex items-center gap-2">
          <FlaskConical size={15} className="text-rimai-400" />
          <h2 className="text-sm font-semibold text-white flex-1">Configuración</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* System prompt preset */}
          <div>
            <label className="text-xs text-rimai-400 font-medium mb-2 block">Prompt del sistema</label>
            <div className="space-y-1.5">
              {SYSTEM_PRESETS.map((p, i) => (
                <button key={i} onClick={() => setSelectedPreset(i)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${selectedPreset === i
                    ? 'bg-rimai-900/60 border-rimai-600 text-white'
                    : 'bg-[#12093a] border-[#2d1f5e] text-rimai-400 hover:border-rimai-700 hover:text-rimai-200'
                  }`}>
                  <p className="font-medium">{p.label}</p>
                  <p className="text-rimai-500 mt-0.5">{p.description}</p>
                </button>
              ))}
            </div>

            {isCustom && (
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Escribe el prompt del sistema personalizado..."
                rows={4}
                className="mt-2 w-full bg-[#12093a] border border-[#2d1f5e] focus:border-rimai-500 rounded-lg px-3 py-2 text-xs text-white placeholder-rimai-600 focus:outline-none resize-none"
              />
            )}

            {systemPromptDisplay && !isCustom && (
              <div className="mt-2 bg-[#12093a] border border-[#2d1f5e] rounded-lg p-2.5">
                <p className="text-xs text-rimai-500 italic leading-relaxed">{systemPromptDisplay}</p>
              </div>
            )}
          </div>

          {/* Area filter */}
          <div>
            <label className="text-xs text-rimai-400 font-medium mb-2 block">Área legal</label>
            <div className="flex flex-wrap gap-1.5">
              {AREAS.map(a => (
                <button key={a} onClick={() => setArea(a)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors capitalize ${area === a
                    ? 'bg-rimai-700 border-rimai-500 text-white'
                    : 'bg-[#12093a] border-[#2d1f5e] text-rimai-400 hover:border-rimai-600'
                  }`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Session info */}
          <div>
            <label className="text-xs text-rimai-400 font-medium mb-2 block">Sesión activa</label>
            <div className="bg-[#12093a] border border-[#2d1f5e] rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-rimai-500">ID</span>
                <span className="text-rimai-300 font-mono truncate ml-2">{sessionId.slice(-12)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rimai-500">Mensajes</span>
                <span className="text-white">{messages.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rimai-500">Área</span>
                <span className="text-white capitalize">{area}</span>
              </div>
            </div>
          </div>

          <button onClick={handleClear}
            className="w-full py-2 border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors">
            <RotateCcw size={12} /> Limpiar sesión
          </button>
        </div>
      </aside>

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-5 py-3 border-b border-[#2d1f5e] flex items-center gap-3 shrink-0">
          <button onClick={() => setShowConfig(v => !v)}
            className="p-1.5 rounded-lg text-rimai-400 hover:text-white hover:bg-[#1a1335] transition-colors"
            title={showConfig ? 'Ocultar config' : 'Mostrar config'}>
            {showConfig ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <FlaskConical size={14} className="text-rimai-400" /> Playground — Agente Legal RimAI
            </p>
            <p className="text-xs text-rimai-400">
              Preset: <span className="text-rimai-300">{activePreset.label}</span>
              {area !== 'general' && <> · Área: <span className="text-rimai-300 capitalize">{area}</span></>}
            </p>
          </div>
          <button onClick={handleClear} title="Limpiar chat"
            className="p-1.5 rounded-lg text-rimai-500 hover:text-rimai-300 hover:bg-[#1a1335] transition-colors">
            <Trash2 size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-rimai-600">
              <FlaskConical size={40} className="text-rimai-700" />
              <div className="text-center">
                <p className="text-sm text-rimai-400 font-medium">Playground activo</p>
                <p className="text-xs mt-1">Configura el prompt a la izquierda y envía una consulta legal.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-sm w-full mt-2">
                {['¿Cuánto es la multa por despido intempestivo?', '¿Qué documentos necesito para constituir una empresa?', '¿Cómo calculo la liquidación de un empleado?', '¿Qué dice la ley sobre el trabajo en feriados?'].map(q => (
                  <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                    className="text-left text-xs bg-[#12093a] border border-[#2d1f5e] hover:border-rimai-600 text-rimai-400 hover:text-rimai-200 px-3 py-2 rounded-lg transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-rimai-800 flex items-center justify-center text-xs font-bold text-rimai-200 shrink-0 mt-1">R</div>
              )}
              <div className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative
                ${msg.role === 'user'
                  ? 'bg-rimai-700 text-white rounded-tr-sm'
                  : 'bg-[#1a1335] border border-[#2d1f5e] text-rimai-100 rounded-tl-sm'
                }`}>
                {msg.role === 'ai' && (
                  <p className="text-xs text-rimai-400 mb-1.5 font-medium">RimAI · Asistente Legal</p>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-between mt-1.5 gap-3">
                  <p className={`text-xs ${msg.role === 'user' ? 'text-rimai-300' : 'text-rimai-600'}`}>
                    {fmtTime(msg.ts)}
                  </p>
                  {msg.role === 'ai' && (
                    <button onClick={() => handleCopy(msg.text, msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-rimai-500 hover:text-rimai-300">
                      {copied === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200 shrink-0 mt-1">U</div>
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
                  <span className="text-xs text-rimai-400">Procesando consulta legal...</span>
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
              placeholder="Escribe una consulta para probar el agente... (Enter envía)"
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
            Preset activo: <span className="text-rimai-500">{activePreset.label}</span>
            {area !== 'general' && <> · Área: <span className="text-rimai-500 capitalize">{area}</span></>}
          </p>
        </div>
      </div>
    </div>
  )
}
