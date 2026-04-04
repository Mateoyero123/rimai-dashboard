'use client'
import { useEffect, useState, useRef } from 'react'
import { Upload, BookOpen, Loader2, CheckCircle2, XCircle, FileText, X } from 'lucide-react'
import { getCorpusStats, uploadLegalDocument } from '@/lib/api'

const CATS: Record<string, string> = {
  constitucion: 'Constitución del Ecuador', codigo_civil: 'Código Civil',
  codigo_trabajo: 'Código de Trabajo', codigo_comercio: 'Código de Comercio',
  codigo_penal: 'COIP', lorti: 'Ley Régimen Tributario', ley_cia: 'Ley de Compañías',
  resolucion_cnj: 'Resolución CNJ', jurisprudencia: 'Jurisprudencia', otro: 'Otro',
}

type UploadStage = { label: string; detail: string; durationMs: number }
const STAGES: UploadStage[] = [
  { label: 'Leyendo documento',     detail: 'Extrayendo texto del archivo...',           durationMs: 1200 },
  { label: 'Chunkeando',            detail: 'Dividiendo en fragmentos legales...',        durationMs: 1800 },
  { label: 'Vectorizando',          detail: 'Generando embeddings con OpenAI...',         durationMs: 2400 },
  { label: 'Guardando en Pinecone', detail: 'Persistiendo vectores en la base de datos...', durationMs: 1000 },
]

type JobStatus = 'idle' | 'uploading' | 'done' | 'error'
interface UploadJob {
  id: string
  fileName: string
  category: string
  status: JobStatus
  stage: number       // 0-3 active stage index, 4 = completed
  progress: number    // 0-100
  chunks?: number
  error?: string
  startedAt: Date
}

function uid() { return Math.random().toString(36).slice(2) }

export default function CorpusPage() {
  const [stats, setStats]     = useState<{ total_chunks: number; by_category: Record<string, number> } | null>(null)
  const [category, setCategory] = useState('codigo_trabajo')
  const [sourceName, setSourceName] = useState('')
  const [jobs, setJobs]       = useState<UploadJob[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { getCorpusStats().then(setStats).catch(console.error) }, [])

  function updateJob(id: string, patch: Partial<UploadJob>) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }

  async function runUpload(file: File, cat: string, src: string) {
    const jobId = uid()
    const job: UploadJob = {
      id: jobId, fileName: file.name, category: cat,
      status: 'uploading', stage: 0, progress: 0, startedAt: new Date(),
    }
    setJobs(prev => [job, ...prev])

    // Animate stages while the real upload runs in parallel
    let stageIndex = 0
    let stageProgress = 0
    const totalMs = STAGES.reduce((a, s) => a + s.durationMs, 0)
    let elapsed = 0

    const tick = setInterval(() => {
      if (stageIndex >= STAGES.length) { clearInterval(tick); return }
      const stageDur = STAGES[stageIndex].durationMs
      stageProgress += 80 // ms per tick
      elapsed += 80

      const globalPct = Math.min((elapsed / totalMs) * 90, 90) // cap at 90% until done
      updateJob(jobId, { stage: stageIndex, progress: Math.round(globalPct) })

      if (stageProgress >= stageDur) {
        stageProgress = 0
        stageIndex++
      }
    }, 80)

    try {
      const res = await uploadLegalDocument(file, cat, src || file.name)
      clearInterval(tick)
      updateJob(jobId, { status: 'done', stage: STAGES.length, progress: 100, chunks: res.stats?.chunks_new })
      getCorpusStats().then(setStats).catch(console.error)
    } catch (err) {
      clearInterval(tick)
      updateJob(jobId, { status: 'error', stage: STAGES.length, progress: 100, error: 'Error al ingestar el documento' })
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    Array.from(files).forEach(f => runUpload(f, category, sourceName || f.name))
    if (fileRef.current) fileRef.current.value = ''
    setSourceName('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Corpus Legal</h1>
        <p className="text-rimai-400 text-sm">Gestiona el conocimiento de RimAI · RAG vectorial</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total chunks', value: stats?.total_chunks?.toLocaleString() ?? '—' },
          { label: 'Cuerpos legales', value: Object.keys(stats?.by_category ?? {}).length || '—' },
          { label: 'Dimensiones', value: '1,536' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
            <p className="text-sm text-rimai-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upload */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Upload size={15} className="text-rimai-400" /> Ingestar documento
          </h2>

          <div>
            <label className="text-xs text-rimai-400 mb-1 block">Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rimai-500">
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-rimai-400 mb-1 block">Nombre descriptivo (opcional)</label>
            <input value={sourceName} onChange={e => setSourceName(e.target.value)}
              placeholder="ej: Código de Trabajo 2024"
              className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg px-3 py-2 text-sm text-white placeholder-rimai-600 focus:outline-none focus:border-rimai-500" />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-rimai-500 bg-rimai-900/20' : 'border-[#2d1f5e] hover:border-rimai-600 hover:bg-[#12093a]'}`}>
            <Upload size={24} className={`mx-auto mb-3 ${dragging ? 'text-rimai-400' : 'text-rimai-600'}`} />
            <p className="text-sm text-rimai-300 font-medium">Arrastra PDFs o DOCX aquí</p>
            <p className="text-xs text-rimai-600 mt-1">o haz clic para seleccionar</p>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" multiple className="hidden"
              onChange={e => handleFiles(e.target.files)} />
          </div>

          {/* Active jobs */}
          {jobs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-rimai-400 font-medium">Procesando en background</p>
              {jobs.map(job => (
                <JobCard key={job.id} job={job} onDismiss={() => setJobs(prev => prev.filter(j => j.id !== job.id))} />
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen size={15} className="text-rimai-400" /> Por categoría
          </h2>
          <div className="space-y-3">
            {stats
              ? Object.entries(stats.by_category).sort(([, a], [, b]) => b - a).map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-rimai-300">{CATS[cat] || cat}</span>
                    <span className="text-white font-medium">{count.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-[#12093a] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rimai-700 to-rimai-500 rounded-full"
                      style={{ width: `${(count / stats.total_chunks) * 100}%` }} />
                  </div>
                </div>
              ))
              : <p className="text-rimai-500 text-sm">Cargando...</p>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Job progress card ──────────────────────────────────────────────────────── */
function JobCard({ job, onDismiss }: { job: UploadJob; onDismiss: () => void }) {
  const isDone  = job.status === 'done'
  const isError = job.status === 'error'
  const isRunning = job.status === 'uploading'
  const activeStage = STAGES[job.stage]

  return (
    <div className="bg-[#12093a] border border-[#2d1f5e] rounded-xl p-3 relative">
      {(isDone || isError) && (
        <button onClick={onDismiss} className="absolute top-2 right-2 text-rimai-600 hover:text-rimai-300">
          <X size={13} />
        </button>
      )}

      <div className="flex items-start gap-2.5 mb-2.5">
        <FileText size={14} className="text-rimai-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{job.fileName}</p>
          <p className="text-xs text-rimai-500">{CATS[job.category] || job.category}</p>
        </div>
        {isDone  && <CheckCircle2 size={15} className="text-green-400 shrink-0" />}
        {isError && <XCircle    size={15} className="text-red-400 shrink-0" />}
        {isRunning && <Loader2  size={15} className="text-rimai-400 animate-spin shrink-0" />}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#1a1335] rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-gradient-to-r from-rimai-700 to-rimai-400'}`}
          style={{ width: `${job.progress}%` }}
        />
      </div>

      {/* Stage labels */}
      <div className="flex justify-between mb-2">
        {STAGES.map((s, i) => (
          <div key={i} className={`flex flex-col items-center gap-0.5 flex-1 ${i < STAGES.length - 1 ? 'mr-1' : ''}`}>
            <div className={`w-2 h-2 rounded-full border transition-colors ${
              isDone || i < job.stage ? 'bg-rimai-500 border-rimai-500'
              : i === job.stage && isRunning ? 'bg-rimai-400 border-rimai-400 shadow-[0_0_6px_rgba(139,92,246,0.8)]'
              : 'bg-transparent border-[#2d1f5e]'
            }`} />
          </div>
        ))}
      </div>

      {/* Current status text */}
      <p className="text-xs text-rimai-500">
        {isDone  ? `✅ ${job.chunks ?? 0} chunks nuevos agregados al corpus` : null}
        {isError ? `❌ ${job.error}` : null}
        {isRunning && activeStage ? activeStage.detail : null}
      </p>

      {/* Stage name below dots */}
      {isRunning && activeStage && (
        <p className="text-xs text-rimai-400 font-medium mt-0.5">{activeStage.label}...</p>
      )}
    </div>
  )
}
