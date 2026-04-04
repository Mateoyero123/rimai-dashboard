'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Send, Loader2, Trash2, FileText, Image, Upload,
  X, Copy, Check, FileUp, RotateCcw, ScrollText
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { uploadDocumentFile, streamBuilderMessage, clearBuilderSession } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'user' | 'ai'

interface Message {
  id: string
  role: Role
  text: string
  ts: Date
  isDocument?: boolean
}

interface UploadedFile {
  file_id: string
  filename: string
  content_type: string   // "text" | "image"
  size_bytes: number
  preview?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }
function fmtTime(d: Date) { return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
function fmtBytes(b: number) { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB` }

const ACCEPTED = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp'

const EXAMPLE_STARTS = [
  'Necesito un contrato de arrendamiento',
  'Quiero generar una carta de renuncia',
  'Ayúdame con un contrato de trabajo',
  'Necesito un acta de finiquito',
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [sessionId]                 = useState(() => `builder-${Date.now()}`)
  const [files, setFiles]           = useState<UploadedFile[]>([])
  const [uploading, setUploading]   = useState(false)
  const [copied, setCopied]         = useState<string | null>(null)
  const [dragOver, setDragOver]     = useState(false)
  const [pendingFileIds, setPendingFileIds] = useState<string[]>([])

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── File upload ─────────────────────────────────────────────────────────────

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      const results = await Promise.all(
        Array.from(fileList).map(f => uploadDocumentFile(f, sessionId))
      )
      setFiles(prev => [...prev, ...results])
      setPendingFileIds(prev => [...prev, ...results.map(r => r.file_id)])
    } catch {
      // silently fail — user will see no file added
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function removeFile(fileId: string) {
    setFiles(prev => prev.filter(f => f.file_id !== fileId))
    setPendingFileIds(prev => prev.filter(id => id !== fileId))
  }

  // ── Chat send ───────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const attachedIds = [...pendingFileIds]
    setPendingFileIds([])

    const userMsg: Message = { id: uid(), role: 'user', text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Placeholder for streaming AI response
    const aiId = uid()
    const aiMsg: Message = { id: aiId, role: 'ai', text: '', ts: new Date() }
    setMessages(prev => [...prev, aiMsg])

    let accumulated = ''

    await streamBuilderMessage(
      sessionId,
      text,
      attachedIds,
      (token) => {
        accumulated += token
        // Detect if response contains a generated document (markdown with headers)
        const isDoc = accumulated.includes('# ') || accumulated.includes('CONTRATO') || accumulated.includes('CARTA')
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, text: accumulated, isDocument: isDoc } : m)
        )
      },
      () => {
        setLoading(false)
        inputRef.current?.focus()
      },
      (_err) => {
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, text: '⚠️ Error conectando con el backend.' } : m)
        )
        setLoading(false)
      },
    )
  }

  async function handleClear() {
    await clearBuilderSession(sessionId).catch(() => null)
    setMessages([])
    setFiles([])
    setPendingFileIds([])
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text).catch(() => null)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Left panel: files ─────────────────────────────────────────────── */}
      <aside className="w-72 border-r border-[#2d1f5e] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d1f5e] flex items-center gap-2">
          <ScrollText size={15} className="text-rimai-400" />
          <h2 className="text-sm font-semibold text-white flex-1">Documentos adjuntos</h2>
        </div>

        {/* Drop zone */}
        <div className="p-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-rimai-500 bg-rimai-900/30'
                : 'border-[#2d1f5e] hover:border-rimai-600 hover:bg-[#12093a]'
            }`}
          >
            {uploading ? (
              <Loader2 size={20} className="mx-auto text-rimai-400 animate-spin mb-2" />
            ) : (
              <Upload size={20} className="mx-auto text-rimai-500 mb-2" />
            )}
            <p className="text-xs text-rimai-400 font-medium">
              {uploading ? 'Subiendo...' : 'Arrastra archivos aquí'}
            </p>
            <p className="text-xs text-rimai-600 mt-1">PDF, DOCX, TXT, JPG, PNG</p>
            <p className="text-xs text-rimai-600">Máx 10 MB por archivo</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {files.length === 0 && (
            <p className="text-xs text-rimai-600 text-center py-4">
              Sin archivos adjuntos.<br />Sube una cédula, contrato<br />o cualquier documento.
            </p>
          )}
          {files.map(f => (
            <div key={f.file_id} className="bg-[#12093a] border border-[#2d1f5e] rounded-lg p-2.5 flex gap-2">
              <div className="shrink-0 mt-0.5">
                {f.content_type === 'image'
                  ? <Image size={14} className="text-rimai-400" />
                  : <FileText size={14} className="text-rimai-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-rimai-200 truncate font-medium">{f.filename}</p>
                <p className="text-xs text-rimai-600">{fmtBytes(f.size_bytes)}</p>
                {f.preview && (
                  <p className="text-xs text-rimai-500 mt-1 line-clamp-2 leading-relaxed">{f.preview}</p>
                )}
                {pendingFileIds.includes(f.file_id) && (
                  <span className="inline-block mt-1 text-xs bg-rimai-800/60 text-rimai-300 px-1.5 py-0.5 rounded">
                    listo para enviar
                  </span>
                )}
              </div>
              <button onClick={() => removeFile(f.file_id)} className="shrink-0 text-rimai-600 hover:text-red-400 transition-colors">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Session info + clear */}
        <div className="p-4 border-t border-[#2d1f5e] space-y-3">
          <div className="bg-[#12093a] border border-[#2d1f5e] rounded-lg p-2.5 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-rimai-500">Sesión</span>
              <span className="text-rimai-300 font-mono truncate ml-2">{sessionId.slice(-10)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-rimai-500">Mensajes</span>
              <span className="text-white">{messages.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-rimai-500">Archivos</span>
              <span className="text-white">{files.length}</span>
            </div>
          </div>
          <button onClick={handleClear}
            className="w-full py-2 border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors">
            <RotateCcw size={12} /> Nueva sesión
          </button>
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-5 py-3 border-b border-[#2d1f5e] flex items-center gap-3 shrink-0">
          <div className="flex-1">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <ScrollText size={14} className="text-rimai-400" />
              Constructor de Documentos Legales
            </p>
            <p className="text-xs text-rimai-400">
              Sube archivos y conversa — el agente extrae datos y genera el documento
            </p>
          </div>
          <button onClick={handleClear} title="Nueva sesión"
            className="p-1.5 rounded-lg text-rimai-500 hover:text-rimai-300 hover:bg-[#1a1335] transition-colors">
            <Trash2 size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-rimai-600">
              <FileUp size={40} className="text-rimai-700" />
              <div className="text-center">
                <p className="text-sm text-rimai-400 font-medium">Constructor conversacional</p>
                <p className="text-xs mt-1 max-w-xs">
                  Dile qué documento necesitas. Opcionalmente sube archivos (cédula, contrato anterior)
                  y el agente extrae los datos automáticamente.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-2">
                {EXAMPLE_STARTS.map(q => (
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

              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed relative
                ${msg.role === 'user'
                  ? 'max-w-[60%] bg-rimai-700 text-white rounded-tr-sm'
                  : msg.isDocument
                    ? 'w-full max-w-3xl bg-[#0d0826] border border-rimai-700/60 text-rimai-100 rounded-tl-sm'
                    : 'max-w-[72%] bg-[#1a1335] border border-[#2d1f5e] text-rimai-100 rounded-tl-sm'
                }`}>

                {msg.role === 'ai' && (
                  <p className="text-xs text-rimai-400 mb-1.5 font-medium">
                    {msg.isDocument ? '📄 RimAI · Documento generado' : 'RimAI · Asistente de Documentos'}
                  </p>
                )}

                {msg.isDocument ? (
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-headings:text-rimai-200 prose-headings:font-semibold
                    prose-p:text-rimai-100 prose-strong:text-white
                    prose-hr:border-rimai-700">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}

                <div className="flex items-center justify-between mt-1.5 gap-3">
                  <p className={`text-xs ${msg.role === 'user' ? 'text-rimai-300' : 'text-rimai-600'}`}>
                    {fmtTime(msg.ts)}
                  </p>
                  {msg.role === 'ai' && msg.text && (
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

          {loading && messages[messages.length - 1]?.text === '' && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-rimai-800 flex items-center justify-center text-xs font-bold text-rimai-200 shrink-0 mt-1">R</div>
              <div className="bg-[#1a1335] border border-[#2d1f5e] rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="text-xs text-rimai-400 mb-1.5">RimAI · Asistente de Documentos</p>
                <div className="flex items-center gap-1.5">
                  <Loader2 size={13} className="text-rimai-400 animate-spin" />
                  <span className="text-xs text-rimai-400">Procesando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-[#2d1f5e] shrink-0">
          {pendingFileIds.length > 0 && (
            <div className="mb-2 flex items-center gap-2 text-xs text-rimai-400">
              <FileText size={12} className="text-rimai-500" />
              <span>{pendingFileIds.length} archivo{pendingFileIds.length > 1 ? 's' : ''} se enviarán con el próximo mensaje</span>
            </div>
          )}
          <div className="flex gap-3 items-end bg-[#12093a] border border-[#2d1f5e] rounded-xl px-4 py-3 focus-within:border-rimai-500 transition-colors">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar archivo"
              className="p-1 text-rimai-500 hover:text-rimai-300 transition-colors shrink-0 mb-0.5"
            >
              <Upload size={16} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Dile qué documento necesitas... (Enter envía)"
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
            El agente preguntará los datos que falten y generará el documento cuando tenga todo
          </p>
        </div>
      </div>
    </div>
  )
}
