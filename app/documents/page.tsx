'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Send, Loader2, Trash2, FileText, ImageIcon, Upload,
  X, Copy, Check, FileUp, RotateCcw, ScrollText,
  Download, Pencil, Save, ChevronRight, PanelRight
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
  content_type: string
  size_bytes: number
  preview?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }
function fmtTime(d: Date) { return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) }
function fmtBytes(b: number) { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB` }

const ACCEPTED = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp'

const EXAMPLE_STARTS = [
  'Necesito un contrato de arrendamiento',
  'Quiero generar una carta de renuncia',
  'Ayúdame con un contrato de trabajo',
  'Necesito un acta de finiquito',
]

function isDocumentContent(text: string) {
  return text.length > 300 && (
    text.includes('CONTRATO') ||
    text.includes('CARTA') ||
    text.includes('PODER') ||
    text.includes('ACTA') ||
    text.includes('PROMESA') ||
    (text.includes('# ') && text.includes('##'))
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [messages, setMessages]           = useState<Message[]>([])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [sessionId]                       = useState(() => `builder-${Date.now()}`)
  const [files, setFiles]                 = useState<UploadedFile[]>([])
  const [uploading, setUploading]         = useState(false)
  const [copied, setCopied]               = useState<string | null>(null)
  const [dragOver, setDragOver]           = useState(false)
  const [pendingFileIds, setPendingFileIds] = useState<string[]>([])

  // Canvas state
  const [documentContent, setDocumentContent] = useState<string | null>(null)
  const [isEditing, setIsEditing]             = useState(false)
  const [editedContent, setEditedContent]     = useState('')
  const [canvasOpen, setCanvasOpen]           = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLTextAreaElement>(null)
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
    } catch { /* silent */ }
    finally { setUploading(false) }
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

    setMessages(prev => [...prev, { id: uid(), role: 'user', text, ts: new Date() }])
    setInput('')
    setLoading(true)

    const aiId = uid()
    setMessages(prev => [...prev, { id: aiId, role: 'ai', text: '', ts: new Date() }])

    let accumulated = ''
    let docDetected = false

    await streamBuilderMessage(
      sessionId, text, attachedIds,
      (token) => {
        accumulated += token
        const isDoc = isDocumentContent(accumulated)

        if (isDoc && !docDetected) {
          docDetected = true
          // Abrir canvas con el documento
          setDocumentContent(accumulated)
          setEditedContent(accumulated)
          setCanvasOpen(true)
        }

        if (docDetected) {
          // Actualizar canvas en tiempo real
          setDocumentContent(accumulated)
          if (!isEditing) setEditedContent(accumulated)
          // En el chat solo mostramos el indicador
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, text: accumulated, isDocument: true } : m
          ))
        } else {
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, text: accumulated } : m
          ))
        }
      },
      () => { setLoading(false); inputRef.current?.focus() },
      (_err) => {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, text: '⚠️ Error conectando con el backend.' } : m
        ))
        setLoading(false)
      },
    )
  }

  async function handleClear() {
    await clearBuilderSession(sessionId).catch(() => null)
    setMessages([])
    setFiles([])
    setPendingFileIds([])
    setDocumentContent(null)
    setEditedContent('')
    setCanvasOpen(false)
    setIsEditing(false)
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text).catch(() => null)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleDownload() {
    const content = isEditing ? editedContent : (documentContent ?? '')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `documento-rimai-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const displayDoc = isEditing ? editedContent : (documentContent ?? '')

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Left panel: files ─────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-[#2d1f5e] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d1f5e] flex items-center gap-2">
          <ScrollText size={15} className="text-rimai-400" />
          <h2 className="text-sm font-semibold text-white flex-1">Archivos adjuntos</h2>
        </div>

        {/* Drop zone */}
        <div className="p-3">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-rimai-500 bg-rimai-900/30' : 'border-[#2d1f5e] hover:border-rimai-600 hover:bg-[#12093a]'
            }`}
          >
            {uploading
              ? <Loader2 size={18} className="mx-auto text-rimai-400 animate-spin mb-1.5" />
              : <Upload size={18} className="mx-auto text-rimai-500 mb-1.5" />
            }
            <p className="text-xs text-rimai-400 font-medium">{uploading ? 'Subiendo...' : 'Arrastra archivos'}</p>
            <p className="text-xs text-rimai-600 mt-0.5">PDF, DOCX, TXT, JPG, PNG</p>
          </div>
          <input ref={fileInputRef} type="file" accept={ACCEPTED} multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
          {files.length === 0 && (
            <p className="text-xs text-rimai-600 text-center py-3">
              Sube una cédula, contrato<br />o cualquier documento.
            </p>
          )}
          {files.map(f => (
            <div key={f.file_id} className="bg-[#12093a] border border-[#2d1f5e] rounded-lg p-2 flex gap-2">
              <div className="shrink-0 mt-0.5">
                {f.content_type === 'image'
                  ? <ImageIcon size={12} className="text-rimai-400" />
                  : <FileText size={12} className="text-rimai-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-rimai-200 truncate">{f.filename}</p>
                <p className="text-xs text-rimai-600">{fmtBytes(f.size_bytes)}</p>
                {pendingFileIds.includes(f.file_id) && (
                  <span className="text-xs text-rimai-400">· pendiente</span>
                )}
              </div>
              <button onClick={() => removeFile(f.file_id)} className="shrink-0 text-rimai-600 hover:text-red-400">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Session */}
        <div className="p-3 border-t border-[#2d1f5e] space-y-2">
          <div className="bg-[#12093a] border border-[#2d1f5e] rounded-lg p-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-rimai-500">Sesión</span>
              <span className="text-rimai-300 font-mono">{sessionId.slice(-8)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-rimai-500">Mensajes</span>
              <span className="text-white">{messages.length}</span>
            </div>
          </div>
          <button onClick={handleClear}
            className="w-full py-1.5 border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors">
            <RotateCcw size={11} /> Nueva sesión
          </button>
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      <div className={`flex flex-col min-w-0 transition-all duration-300 ${canvasOpen ? 'w-[380px] shrink-0' : 'flex-1'}`}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2d1f5e] flex items-center gap-2 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Constructor de Documentos</p>
            <p className="text-xs text-rimai-400">Conversa · el agente recolecta datos y genera</p>
          </div>
          {documentContent && (
            <button onClick={() => setCanvasOpen(v => !v)} title="Ver documento"
              className={`p-1.5 rounded-lg transition-colors ${canvasOpen ? 'bg-rimai-800 text-rimai-300' : 'text-rimai-500 hover:text-rimai-300 hover:bg-[#1a1335]'}`}>
              <PanelRight size={15} />
            </button>
          )}
          <button onClick={handleClear} title="Nueva sesión"
            className="p-1.5 rounded-lg text-rimai-500 hover:text-rimai-300 hover:bg-[#1a1335] transition-colors">
            <Trash2 size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-rimai-600">
              <FileUp size={36} className="text-rimai-700" />
              <div className="text-center">
                <p className="text-sm text-rimai-400 font-medium">Constructor conversacional</p>
                <p className="text-xs mt-1 max-w-[220px]">
                  Dile qué documento necesitas. El agente te irá pidiendo los datos uno a uno.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-1.5 w-full mt-1">
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
            <div key={msg.id} className={`flex gap-2 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-rimai-800 flex items-center justify-center text-xs font-bold text-rimai-200 shrink-0 mt-1">R</div>
              )}

              <div className={`rounded-xl px-3 py-2.5 text-sm leading-relaxed relative
                ${msg.role === 'user'
                  ? 'max-w-[85%] bg-rimai-700 text-white rounded-tr-sm'
                  : msg.isDocument
                    ? 'w-full bg-[#1a1335] border border-rimai-700/40 text-rimai-100 rounded-tl-sm'
                    : 'max-w-[85%] bg-[#1a1335] border border-[#2d1f5e] text-rimai-100 rounded-tl-sm'
                }`}>

                {msg.role === 'ai' && !msg.isDocument && (
                  <p className="text-xs text-rimai-400 mb-1 font-medium">RimAI · Documentos</p>
                )}

                {msg.isDocument ? (
                  <button
                    onClick={() => setCanvasOpen(true)}
                    className="flex items-center gap-2 text-rimai-300 hover:text-white transition-colors"
                  >
                    <FileText size={14} className="text-rimai-400 shrink-0" />
                    <span className="text-xs font-medium">Documento generado — Ver en canvas</span>
                    <ChevronRight size={13} className="text-rimai-500" />
                  </button>
                ) : (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.text}</p>
                )}

                <div className="flex items-center justify-between mt-1 gap-2">
                  <p className={`text-xs ${msg.role === 'user' ? 'text-rimai-300' : 'text-rimai-600'}`}>
                    {fmtTime(msg.ts)}
                  </p>
                  {msg.role === 'ai' && !msg.isDocument && msg.text && (
                    <button onClick={() => handleCopy(msg.text, msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-rimai-500 hover:text-rimai-300">
                      {copied === msg.id ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                    </button>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200 shrink-0 mt-1">U</div>
              )}
            </div>
          ))}

          {loading && messages[messages.length - 1]?.text === '' && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-rimai-800 flex items-center justify-center text-xs font-bold text-rimai-200 shrink-0 mt-1">R</div>
              <div className="bg-[#1a1335] border border-[#2d1f5e] rounded-xl rounded-tl-sm px-3 py-2.5">
                <p className="text-xs text-rimai-400 mb-1">RimAI · Documentos</p>
                <div className="flex items-center gap-1.5">
                  <Loader2 size={12} className="text-rimai-400 animate-spin" />
                  <span className="text-xs text-rimai-400">Procesando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#2d1f5e] shrink-0">
          {pendingFileIds.length > 0 && (
            <div className="mb-2 flex items-center gap-1.5 text-xs text-rimai-400">
              <FileText size={11} className="text-rimai-500" />
              <span>{pendingFileIds.length} archivo{pendingFileIds.length > 1 ? 's' : ''} adjunto{pendingFileIds.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex gap-2 items-end bg-[#12093a] border border-[#2d1f5e] rounded-xl px-3 py-2.5 focus-within:border-rimai-500 transition-colors">
            <button onClick={() => fileInputRef.current?.click()}
              className="p-1 text-rimai-500 hover:text-rimai-300 transition-colors shrink-0 mb-0.5">
              <Upload size={14} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Dile qué documento necesitas..."
              rows={1}
              style={{ resize: 'none' }}
              className="flex-1 bg-transparent text-xs text-white placeholder-rimai-600 focus:outline-none min-h-[20px] max-h-28 overflow-y-auto leading-5"
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 112) + 'px'
              }}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="p-1.5 bg-rimai-700 hover:bg-rimai-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Document Canvas ────────────────────────────────────────────────── */}
      {canvasOpen && documentContent && (
        <div className="flex-1 border-l border-[#2d1f5e] flex flex-col min-w-0">

          {/* Canvas header */}
          <div className="px-5 py-3 border-b border-[#2d1f5e] flex items-center gap-2 shrink-0">
            <FileText size={15} className="text-rimai-400 shrink-0" />
            <p className="text-sm font-semibold text-white flex-1">Documento generado</p>

            <div className="flex items-center gap-1">
              {isEditing ? (
                <button onClick={() => { setDocumentContent(editedContent); setIsEditing(false) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rimai-700 hover:bg-rimai-600 text-white rounded-lg text-xs transition-colors">
                  <Save size={12} /> Guardar
                </button>
              ) : (
                <button onClick={() => { setEditedContent(documentContent); setIsEditing(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2d1f5e] hover:border-rimai-600 text-rimai-300 rounded-lg text-xs transition-colors">
                  <Pencil size={12} /> Editar
                </button>
              )}
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2d1f5e] hover:border-rimai-600 text-rimai-300 rounded-lg text-xs transition-colors">
                <Download size={12} /> Descargar
              </button>
              <button onClick={() => handleCopy(displayDoc, 'canvas')}
                className="p-1.5 border border-[#2d1f5e] hover:border-rimai-600 text-rimai-400 hover:text-rimai-200 rounded-lg transition-colors">
                {copied === 'canvas' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Canvas body */}
          <div className="flex-1 overflow-y-auto">
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                className="w-full h-full bg-[#0d0826] text-rimai-100 text-sm font-mono leading-relaxed p-6 focus:outline-none resize-none"
                spellCheck={false}
              />
            ) : (
              <div className="p-6 lg:p-8 max-w-3xl mx-auto">
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-white prose-headings:font-bold prose-headings:border-b prose-headings:border-[#2d1f5e] prose-headings:pb-2
                  prose-h1:text-base prose-h2:text-sm prose-h3:text-xs
                  prose-p:text-rimai-100 prose-p:leading-relaxed
                  prose-strong:text-white prose-strong:font-semibold
                  prose-hr:border-[#2d1f5e]
                  prose-ul:text-rimai-100 prose-li:text-rimai-100">
                  <ReactMarkdown>{displayDoc}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Canvas footer */}
          <div className="px-5 py-2.5 border-t border-[#2d1f5e] shrink-0">
            <p className="text-xs text-rimai-600 text-center">
              Borrador orientativo generado por IA · Consulta con un abogado para efectos legales definitivos
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
