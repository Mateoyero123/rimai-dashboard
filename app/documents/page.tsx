'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Send, Loader2, Trash2, FileText, ImageIcon, Upload,
  X, Copy, Check, FileUp, RotateCcw, ScrollText,
  FileDown, Pencil, Save, ChevronRight, PanelRight, Printer
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
    text.includes('CONTRATO') || text.includes('CARTA') ||
    text.includes('PODER') || text.includes('ACTA') ||
    text.includes('PROMESA') || (text.includes('# ') && text.includes('##'))
  )
}

// ── Markdown → HTML para impresión ───────────────────────────────────────────
// Convierte el markdown del documento a HTML limpio para el PDF/print

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---+$/gm, '<hr/>')
    .replace(/^\| (.+) \|$/gm, (_, row) => {
      const cells = row.split(' | ').map((c: string) => `<td>${c}</td>`).join('')
      return `<tr>${cells}</tr>`
    })
    .replace(/(<tr>.*<\/tr>\n?)+/gs, (table) => `<table>${table}</table>`)
    .replace(/^(?!<[h|t|u|o|p|d])(.*\S.*)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
}

function downloadPDF(content: string, filename = 'documento-rimai') {
  const html = markdownToHtml(content)
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return

  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #000;
      background: #fff;
      padding: 2.5cm 3cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    h1 {
      font-size: 14pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      margin: 18pt 0 12pt;
      letter-spacing: 0.5pt;
    }
    h2 {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 14pt 0 6pt;
      border-bottom: 1px solid #000;
      padding-bottom: 3pt;
    }
    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin: 10pt 0 4pt;
    }
    p {
      margin-bottom: 8pt;
      text-align: justify;
    }
    hr {
      border: none;
      border-top: 1px solid #333;
      margin: 14pt 0;
    }
    strong { font-weight: bold; }
    em { font-style: italic; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
      font-size: 11pt;
    }
    td, th {
      border: 1px solid #444;
      padding: 5pt 8pt;
      text-align: left;
    }
    .footer {
      margin-top: 40pt;
      font-size: 8pt;
      color: #666;
      text-align: center;
      border-top: 1px solid #ccc;
      padding-top: 6pt;
    }
    @media print {
      body { padding: 0; }
      .footer { position: fixed; bottom: 0; width: 100%; }
      @page { margin: 2.5cm 3cm; size: A4; }
    }
  </style>
</head>
<body>
  ${html}
  <div class="footer">Borrador generado por RimAI · Para efectos legales definitivos, consulte con un abogado certificado</div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`)
  printWindow.document.close()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [messages, setMessages]             = useState<Message[]>([])
  const [input, setInput]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [sessionId]                         = useState(() => `builder-${Date.now()}`)
  const [files, setFiles]                   = useState<UploadedFile[]>([])
  const [uploading, setUploading]           = useState(false)
  const [copied, setCopied]                 = useState<string | null>(null)
  const [dragOver, setDragOver]             = useState(false)
  const [pendingFileIds, setPendingFileIds] = useState<string[]>([])

  // Canvas
  const [documentContent, setDocumentContent] = useState<string | null>(null)
  const [isEditing, setIsEditing]             = useState(false)
  const [editedContent, setEditedContent]     = useState('')
  const [canvasOpen, setCanvasOpen]           = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docRef       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── File upload ─────────────────────────────────────────────────────────────

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      const results = await Promise.all(Array.from(fileList).map(f => uploadDocumentFile(f, sessionId)))
      setFiles(prev => [...prev, ...results])
      setPendingFileIds(prev => [...prev, ...results.map(r => r.file_id)])
    } catch { /* silent */ }
    finally { setUploading(false) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function removeFile(fileId: string) {
    setFiles(prev => prev.filter(f => f.file_id !== fileId))
    setPendingFileIds(prev => prev.filter(id => id !== fileId))
  }

  // ── Chat ────────────────────────────────────────────────────────────────────

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
          setDocumentContent(accumulated)
          setEditedContent(accumulated)
          setCanvasOpen(true)
        }
        if (docDetected) {
          setDocumentContent(accumulated)
          if (!isEditing) setEditedContent(accumulated)
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: accumulated, isDocument: true } : m))
        } else {
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: accumulated } : m))
        }
      },
      () => { setLoading(false); inputRef.current?.focus() },
      () => {
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: '⚠️ Error conectando con el backend.' } : m))
        setLoading(false)
      },
    )
  }

  async function handleClear() {
    await clearBuilderSession(sessionId).catch(() => null)
    setMessages([]); setFiles([]); setPendingFileIds([])
    setDocumentContent(null); setEditedContent(''); setCanvasOpen(false); setIsEditing(false)
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text).catch(() => null)
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const displayDoc = isEditing ? editedContent : (documentContent ?? '')

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Left: file panel ──────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-[#2d1f5e] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d1f5e] flex items-center gap-2">
          <ScrollText size={15} className="text-rimai-400" />
          <h2 className="text-sm font-semibold text-white flex-1">Archivos adjuntos</h2>
        </div>

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

        <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
          {files.length === 0 && (
            <p className="text-xs text-rimai-600 text-center py-3">Sube una cédula, contrato<br />o cualquier documento.</p>
          )}
          {files.map(f => (
            <div key={f.file_id} className="bg-[#12093a] border border-[#2d1f5e] rounded-lg p-2 flex gap-2">
              <div className="shrink-0 mt-0.5">
                {f.content_type === 'image' ? <ImageIcon size={12} className="text-rimai-400" /> : <FileText size={12} className="text-rimai-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-rimai-200 truncate">{f.filename}</p>
                <p className="text-xs text-rimai-600">{fmtBytes(f.size_bytes)}</p>
                {pendingFileIds.includes(f.file_id) && <span className="text-xs text-rimai-500">· pendiente</span>}
              </div>
              <button onClick={() => removeFile(f.file_id)} className="shrink-0 text-rimai-600 hover:text-red-400"><X size={11} /></button>
            </div>
          ))}
        </div>

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

      {/* ── Center: chat ──────────────────────────────────────────────────── */}
      <div className={`flex flex-col min-w-0 transition-all duration-300 ${canvasOpen ? 'w-[380px] shrink-0' : 'flex-1'}`}>

        <div className="px-4 py-3 border-b border-[#2d1f5e] flex items-center gap-2 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Constructor de Documentos</p>
            <p className="text-xs text-rimai-400">Conversa · el agente recolecta datos y genera</p>
          </div>
          {documentContent && (
            <button onClick={() => setCanvasOpen(v => !v)}
              className={`p-1.5 rounded-lg transition-colors ${canvasOpen ? 'bg-rimai-800 text-rimai-300' : 'text-rimai-500 hover:text-rimai-300 hover:bg-[#1a1335]'}`}>
              <PanelRight size={15} />
            </button>
          )}
          <button onClick={handleClear} className="p-1.5 rounded-lg text-rimai-500 hover:text-rimai-300 hover:bg-[#1a1335] transition-colors">
            <Trash2 size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-rimai-600">
              <FileUp size={36} className="text-rimai-700" />
              <div className="text-center">
                <p className="text-sm text-rimai-400 font-medium">Constructor conversacional</p>
                <p className="text-xs mt-1 max-w-[220px]">Dile qué documento necesitas. El agente te irá pidiendo los datos uno a uno.</p>
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
                  <button onClick={() => setCanvasOpen(true)}
                    className="flex items-center gap-2 text-rimai-300 hover:text-white transition-colors">
                    <FileText size={14} className="text-rimai-400 shrink-0" />
                    <span className="text-xs font-medium">Documento generado — Ver en canvas</span>
                    <ChevronRight size={13} className="text-rimai-500" />
                  </button>
                ) : (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.text}</p>
                )}
                <div className="flex items-center justify-between mt-1 gap-2">
                  <p className={`text-xs ${msg.role === 'user' ? 'text-rimai-300' : 'text-rimai-600'}`}>{fmtTime(msg.ts)}</p>
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
              ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey} placeholder="Dile qué documento necesitas..." rows={1}
              style={{ resize: 'none' }}
              className="flex-1 bg-transparent text-xs text-white placeholder-rimai-600 focus:outline-none min-h-[20px] max-h-28 overflow-y-auto leading-5"
              onInput={e => {
                const el = e.currentTarget; el.style.height = 'auto'
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

      {/* ── Right: Document Canvas (Word-style) ───────────────────────────── */}
      {canvasOpen && documentContent && (
        <div className="flex-1 flex flex-col min-w-0 bg-[#e8e8e8]">

          {/* Toolbar — Word-style */}
          <div className="bg-white border-b border-gray-300 px-4 py-2 flex items-center gap-2 shrink-0 shadow-sm">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <FileText size={15} className="text-gray-500 shrink-0" />
              <p className="text-sm font-medium text-gray-700 truncate">Documento generado</p>
              <span className="text-xs text-gray-400 ml-1">· borrador RimAI</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isEditing ? (
                <button
                  onClick={() => { setDocumentContent(editedContent); setIsEditing(false) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rimai-700 hover:bg-rimai-600 text-white rounded text-xs font-medium transition-colors"
                >
                  <Save size={12} /> Guardar
                </button>
              ) : (
                <button
                  onClick={() => { setEditedContent(displayDoc); setIsEditing(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded text-xs font-medium transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
              )}

              <button
                onClick={() => downloadPDF(displayDoc, 'documento-rimai')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded text-xs font-medium transition-colors"
              >
                <FileDown size={12} /> Descargar PDF
              </button>

              <button
                onClick={() => handleCopy(displayDoc, 'canvas')}
                title="Copiar texto"
                className="p-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 rounded transition-colors"
              >
                {copied === 'canvas' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Document area */}
          <div className="flex-1 overflow-y-auto py-8 px-6">
            {isEditing ? (
              /* Edit mode: plain textarea over white paper */
              <div className="max-w-[21cm] mx-auto bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)] min-h-[29.7cm]">
                <textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="w-full min-h-[29.7cm] bg-transparent text-gray-900 text-[12pt] font-serif leading-relaxed p-[2.5cm] focus:outline-none resize-none"
                  spellCheck={false}
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                />
              </div>
            ) : (
              /* View mode: rendered Word-style document */
              <div
                ref={docRef}
                className="max-w-[21cm] mx-auto bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)] min-h-[29.7cm] px-[3cm] py-[2.5cm]"
              >
                <div
                  className="document-body"
                  style={{
                    fontFamily: "'Times New Roman', Times, serif",
                    fontSize: '12pt',
                    lineHeight: '1.8',
                    color: '#000',
                  }}
                >
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 style={{
                          fontSize: '14pt', fontWeight: 'bold', textAlign: 'center',
                          textTransform: 'uppercase', margin: '18pt 0 12pt',
                          letterSpacing: '0.5pt', fontFamily: 'inherit',
                        }}>{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 style={{
                          fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase',
                          margin: '14pt 0 6pt', borderBottom: '1px solid #000',
                          paddingBottom: '3pt', fontFamily: 'inherit',
                        }}>{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 style={{
                          fontSize: '12pt', fontWeight: 'bold',
                          margin: '10pt 0 4pt', fontFamily: 'inherit',
                        }}>{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p style={{
                          marginBottom: '8pt', textAlign: 'justify',
                          fontFamily: 'inherit', fontSize: '12pt',
                        }}>{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ fontWeight: 'bold' }}>{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em style={{ fontStyle: 'italic', color: '#555' }}>{children}</em>
                      ),
                      hr: () => (
                        <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '14pt 0' }} />
                      ),
                      table: ({ children }) => (
                        <table style={{
                          width: '100%', borderCollapse: 'collapse',
                          margin: '10pt 0', fontSize: '11pt', fontFamily: 'inherit',
                        }}>{children}</table>
                      ),
                      td: ({ children }) => (
                        <td style={{
                          border: '1px solid #444', padding: '5pt 8pt',
                          textAlign: 'left', verticalAlign: 'top',
                        }}>{children}</td>
                      ),
                      th: ({ children }) => (
                        <th style={{
                          border: '1px solid #444', padding: '5pt 8pt',
                          textAlign: 'left', fontWeight: 'bold', background: '#f5f5f5',
                        }}>{children}</th>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote style={{
                          borderLeft: '3px solid #ccc', paddingLeft: '12pt',
                          margin: '10pt 0', color: '#555', fontStyle: 'italic',
                        }}>{children}</blockquote>
                      ),
                    }}
                  >
                    {displayDoc}
                  </ReactMarkdown>
                </div>

                {/* Footer del documento */}
                <div style={{
                  marginTop: '40pt', paddingTop: '8pt',
                  borderTop: '1px solid #ccc', fontFamily: 'inherit',
                }}>
                  <p style={{ fontSize: '8pt', color: '#888', textAlign: 'center', fontFamily: 'inherit' }}>
                    Borrador orientativo generado por RimAI · Para efectos legales definitivos, consulte con un abogado certificado
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
