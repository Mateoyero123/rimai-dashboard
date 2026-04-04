'use client'
import { useState } from 'react'
import { TrendingUp, Database, Code, Scale, Bot, Loader, ChevronDown, ChevronUp } from 'lucide-react'
import { runTeamTask } from '@/lib/api'

const TEAMS = [
  { id: 'comercial', icon: TrendingUp, color: 'bg-green-800',  label: 'Comercial', desc: 'Lead scoring, reportes, follow-ups',
    tasks: [
      { label: 'Reporte semanal', description: 'Genera el reporte comercial semanal de RimAI con métricas de conversión' },
      { label: 'Leads calientes', description: 'Identifica usuarios free cerca del límite con alta intención de pago' },
    ]},
  { id: 'data', icon: Database, color: 'bg-blue-800', label: 'Data', desc: 'RAG health, gaps del corpus, uso',
    tasks: [
      { label: 'Salud del RAG', description: 'Analiza la salud del sistema RAG y detecta gaps de cobertura legal' },
      { label: 'Gaps del corpus', description: 'Identifica qué leyes o temas faltan en el corpus legal de RimAI' },
      { label: 'Reporte de uso', description: 'Genera el reporte de uso de la plataforma de los últimos 7 días', context: { days: 7 } },
    ]},
  { id: 'dev', icon: Code, color: 'bg-amber-800', label: 'Dev', desc: 'Code review, bugs, documentación',
    tasks: [
      { label: 'Deuda técnica RAG', description: 'Analiza la deuda técnica del módulo de ingesta RAG', context: { file_path: 'rag/ingestion.py' } },
    ]},
  { id: 'legal', icon: Scale, color: 'bg-purple-800', label: 'Legal', desc: 'Compliance, disclaimers, fuentes',
    tasks: [
      { label: 'Compliance LOPDP', description: 'Verifica el cumplimiento de la Ley de Protección de Datos ecuatoriana' },
      { label: 'Fuentes laborales', description: 'Genera mapa de fuentes legales del derecho laboral ecuatoriano', context: { legal_area: 'laboral' } },
    ]},
]

export default function TeamPage() {
  const [results, setResults] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  async function run(team: string, task: { label: string; description: string; context?: Record<string, unknown> }) {
    const key = `${team}-${task.label}`
    setLoading(p => ({ ...p, [key]: true }))
    try {
      const res = await runTeamTask(team as 'comercial' | 'data' | 'dev' | 'legal', task.description, task.context || {})
      setResults(p => ({ ...p, [key]: res.output }))
      setExpanded(p => ({ ...p, [key]: true }))
    } catch { setResults(p => ({ ...p, [key]: 'Error ejecutando tarea' })) }
    finally { setLoading(p => ({ ...p, [key]: false })) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Agentes de Equipo</h1>
        <p className="text-rimai-400 text-sm">Ejecuta tareas internas con los agentes IA de RimAI</p>
      </div>
      <div className="space-y-4">
        {TEAMS.map(team => {
          const Icon = team.icon
          return (
            <div key={team.id} className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${team.color}`}><Icon size={17} className="text-white" /></div>
                <div>
                  <p className="text-sm font-semibold text-white">Equipo {team.label}</p>
                  <p className="text-xs text-rimai-400">{team.desc}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs text-rimai-400">Activo</span>
                </div>
              </div>
              <div className="space-y-2">
                {team.tasks.map(task => {
                  const key = `${team.id}-${task.label}`
                  const isLoading = loading[key]
                  const result = results[key]
                  const isExpanded = expanded[key]
                  return (
                    <div key={key} className="bg-[#12093a] rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{task.label}</p>
                          <p className="text-xs text-rimai-500">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {result && (
                            <button onClick={() => setExpanded(p => ({ ...p, [key]: !isExpanded }))} className="p-1 text-rimai-400 hover:text-white">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                          <button onClick={() => run(team.id, task)} disabled={isLoading}
                            className="px-3 py-1.5 bg-rimai-700 hover:bg-rimai-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5">
                            {isLoading ? <><Loader size={12} className="animate-spin" /> Ejecutando...</> : <><Bot size={12} /> Ejecutar</>}
                          </button>
                        </div>
                      </div>
                      {result && isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="bg-[#0f0a1e] rounded-lg p-3 border border-[#2d1f5e]">
                            <p className="text-xs text-rimai-400 mb-2">Resultado del agente:</p>
                            <p className="text-xs text-rimai-200 whitespace-pre-wrap max-h-60 overflow-y-auto">{result}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
