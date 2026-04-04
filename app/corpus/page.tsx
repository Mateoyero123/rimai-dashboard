'use client'
import { useEffect, useState, useRef } from 'react'
import { Upload, BookOpen, Loader } from 'lucide-react'
import { getCorpusStats, uploadLegalDocument } from '@/lib/api'

const CATS: Record<string, string> = {
  constitucion: 'Constitución del Ecuador', codigo_civil: 'Código Civil',
  codigo_trabajo: 'Código de Trabajo', codigo_comercio: 'Código de Comercio',
  codigo_penal: 'COIP', lorti: 'Ley Régimen Tributario', ley_cia: 'Ley de Compañías',
  resolucion_cnj: 'Resolución CNJ', jurisprudencia: 'Jurisprudencia', otro: 'Otro',
}

export default function CorpusPage() {
  const [stats, setStats] = useState<{ total_chunks: number; by_category: Record<string, number> } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [category, setCategory] = useState('codigo_trabajo')
  const [sourceName, setSourceName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { getCorpusStats().then(setStats).catch(console.error) }, [])

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true); setResult(null)
    try {
      const res = await uploadLegalDocument(file, category, sourceName || file.name)
      setResult({ ok: true, msg: `✅ ${res.stats.chunks_new} chunks nuevos de "${file.name}"` })
      getCorpusStats().then(setStats)
    } catch { setResult({ ok: false, msg: '❌ Error al ingestar el documento' }) }
    finally { setUploading(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Corpus Legal</h1>
        <p className="text-rimai-400 text-sm">Gestiona el conocimiento de RimAI</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total chunks', value: stats?.total_chunks?.toLocaleString() || '—' },
          { label: 'Cuerpos legales', value: Object.keys(stats?.by_category || {}).length },
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
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Upload size={15} className="text-rimai-400" /> Ingestar documento
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-rimai-400 mb-1 block">Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rimai-500">
                {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-rimai-400 mb-1 block">Nombre descriptivo</label>
              <input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="ej: Código de Trabajo 2024"
                className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg px-3 py-2 text-sm text-white placeholder-rimai-600 focus:outline-none focus:border-rimai-500" />
            </div>
            <div>
              <label className="text-xs text-rimai-400 mb-1 block">Archivo PDF o DOCX</label>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc"
                className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg px-3 py-2 text-sm text-rimai-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-rimai-700 file:text-white file:text-xs file:cursor-pointer" />
            </div>
            <button onClick={handleUpload} disabled={uploading}
              className="w-full py-2.5 bg-rimai-700 hover:bg-rimai-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              {uploading ? <><Loader size={14} className="animate-spin" /> Ingestando...</> : <><Upload size={14} /> Ingestar</>}
            </button>
            {result && (
              <div className={`p-3 rounded-lg text-sm ${result.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                {result.msg}
              </div>
            )}
          </div>
        </div>

        {/* Breakdown */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen size={15} className="text-rimai-400" /> Por categoría
          </h2>
          <div className="space-y-3">
            {stats ? Object.entries(stats.by_category).sort(([,a],[,b]) => b - a).map(([cat, count]) => (
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
            )) : <p className="text-rimai-500 text-sm">Cargando...</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
