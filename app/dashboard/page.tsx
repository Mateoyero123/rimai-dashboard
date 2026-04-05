'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  MessageSquare, FileText, Users, BookOpen,
  CheckCircle, AlertCircle, RefreshCw, MessageCircle
} from 'lucide-react'
import { getHealth, getCorpusStats, getDashboardStats, type DashboardStats } from '@/lib/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const QUERY_LABELS: Record<string, string> = {
  legal_question: 'Consultas legales',
  document_generation: 'Generación directa',
  document_builder: 'Constructor docs',
  lawyer_match: 'Matching abogados',
}

const ACTIVITY_ICONS: Record<string, string> = {
  chat: '💬',
  document: '📄',
  ingestion: '📚',
  lawyer: '⚖️',
}

export default function DashboardPage() {
  const [health, setHealth]   = useState<any>(null)
  const [corpus, setCorpus]   = useState<any>(null)
  const [stats, setStats]     = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [h, c, s] = await Promise.allSettled([
        getHealth(),
        getCorpusStats(),
        getDashboardStats(),
      ])
      if (h.status === 'fulfilled') setHealth(h.value)
      if (c.status === 'fulfilled') setCorpus(c.value)
      if (s.status === 'fulfilled') setStats(s.value)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const ok = health?.status === 'ok'

  const changeSign = (stats?.queries_change ?? 0) >= 0 ? '+' : ''
  const changeColor = (stats?.queries_change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
          <p className="text-rimai-400 text-sm">Panel de control RimAI 🐺</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2d1f5e] text-rimai-400 hover:text-rimai-200 hover:border-rimai-600 rounded-lg text-xs transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Backend status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-6 border ${ok ? 'bg-green-900/20 border-green-700/40' : 'bg-red-900/20 border-red-700/40'}`}>
        {ok
          ? <CheckCircle size={15} className="text-green-400" />
          : <AlertCircle size={15} className="text-red-400" />
        }
        <span className="text-sm text-white">
          Backend {ok ? 'operativo' : 'offline'} —{' '}
          <span className="text-rimai-300">{health?.model || '...'}</span>
        </span>
        <span className="ml-auto text-xs text-rimai-500">
          Actualizado {lastRefresh.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: MessageSquare,
            label: 'Consultas semana',
            value: loading ? '—' : (stats?.queries_week ?? 0).toLocaleString(),
            sub: stats ? `${changeSign}${stats.queries_change}% vs semana ant.` : 'Cargando...',
            subColor: changeColor,
            color: 'bg-rimai-700',
          },
          {
            icon: Users,
            label: 'Conversaciones',
            value: loading ? '—' : (stats?.users_total ?? 0).toLocaleString(),
            sub: 'Total históricas',
            subColor: 'text-rimai-500',
            color: 'bg-purple-700',
          },
          {
            icon: BookOpen,
            label: 'Chunks legales',
            value: loading ? '—' : (corpus?.total_chunks ?? 0).toLocaleString(),
            sub: `${Object.keys(corpus?.by_category ?? {}).length} categorías`,
            subColor: 'text-rimai-500',
            color: 'bg-indigo-700',
          },
          {
            icon: FileText,
            label: 'Documentos',
            value: loading ? '—' : (stats?.documents_week ?? 0).toLocaleString(),
            sub: 'Esta semana',
            subColor: 'text-rimai-500',
            color: 'bg-violet-700',
          },
        ].map(({ icon: Icon, label, value, sub, subColor, color }) => (
          <div key={label} className="card">
            <div className={`p-2 rounded-lg ${color} w-fit mb-3`}>
              <Icon size={17} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm text-rimai-300">{label}</p>
            <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Corpus breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Consultas diarias */}
        <div className="card lg:col-span-2">
          <div className="flex justify-between mb-4">
            <p className="text-sm font-semibold text-white">Consultas diarias</p>
            <span className="text-xs text-rimai-500">Últimos 7 días · datos reales</span>
          </div>
          {loading ? (
            <div className="h-[190px] flex items-center justify-center">
              <p className="text-rimai-600 text-sm">Cargando...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={stats?.chart_data ?? []}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6d58ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6d58ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#8b7bff', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8b7bff', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1335', border: '1px solid #2d1f5e', borderRadius: 8 }}
                  labelStyle={{ color: '#e8e4ff' }}
                  formatter={(v: number) => [v, 'consultas']}
                />
                <Area type="monotone" dataKey="consultas" stroke="#6d58ff" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Corpus breakdown */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">Corpus legal</p>
          <div className="space-y-3">
            {loading
              ? <p className="text-rimai-500 text-sm">Cargando...</p>
              : corpus
                ? Object.entries(corpus.by_category as Record<string, number>)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-rimai-300 capitalize">{cat.replace(/_/g, ' ')}</span>
                          <span className="text-white">{(count as number).toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-[#12093a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rimai-600 rounded-full"
                            style={{ width: `${Math.min(((count as number) / corpus.total_chunks) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                : <p className="text-rimai-500 text-sm">Sin datos</p>
            }
          </div>
        </div>
      </div>

      {/* Breakdown por tipo + Actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Query breakdown */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">Uso por tipo</p>
          {loading
            ? <p className="text-rimai-500 text-sm">Cargando...</p>
            : Object.keys(stats?.query_breakdown ?? {}).length === 0
              ? <p className="text-rimai-600 text-sm">Sin actividad esta semana</p>
              : (
                <div className="space-y-3">
                  {Object.entries(stats?.query_breakdown ?? {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const total = stats?.queries_week || 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-rimai-300">{QUERY_LABELS[type] || type}</span>
                            <span className="text-white">{count} <span className="text-rimai-500">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-[#12093a] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-rimai-700 to-rimai-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )
          }
        </div>

        {/* Actividad reciente */}
        <div className="card lg:col-span-2">
          <p className="text-sm font-semibold text-white mb-4">Actividad reciente</p>
          {loading
            ? <p className="text-rimai-500 text-sm">Cargando...</p>
            : (stats?.recent_activity ?? []).length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <MessageCircle size={24} className="text-rimai-700" />
                  <p className="text-rimai-600 text-sm">Sin actividad registrada aún.</p>
                  <p className="text-rimai-700 text-xs">Las conversaciones y documentos aparecerán aquí.</p>
                </div>
              )
              : (
                <div>
                  {(stats?.recent_activity ?? []).map((item, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-[#2d1f5e] last:border-0">
                      <span className="text-sm shrink-0 mt-0.5">{ACTIVITY_ICONS[item.type] ?? '•'}</span>
                      <p className="text-sm text-rimai-200 flex-1 leading-snug">{item.text}</p>
                      <span className="text-xs text-rimai-500 shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      </div>
    </div>
  )
}
