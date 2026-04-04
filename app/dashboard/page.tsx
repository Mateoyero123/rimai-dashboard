'use client'
import { useEffect, useState } from 'react'
import { MessageSquare, FileText, Users, BookOpen, CheckCircle, AlertCircle } from 'lucide-react'
import { getHealth, getCorpusStats } from '@/lib/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const chartData = [
  { day: 'Lun', consultas: 12 }, { day: 'Mar', consultas: 28 },
  { day: 'Mié', consultas: 19 }, { day: 'Jue', consultas: 41 },
  { day: 'Vie', consultas: 35 }, { day: 'Sáb', consultas: 22 },
  { day: 'Dom', consultas: 18 },
]

const recent = [
  { text: 'Usuario preguntó sobre vacaciones laborales', time: 'hace 2 min' },
  { text: 'Contrato de trabajo generado exitosamente', time: 'hace 15 min' },
  { text: 'Nueva ingesta: Código de Trabajo (1,847 chunks)', time: 'hace 1h' },
  { text: 'Usuario convirtió a plan Pro', time: 'hace 2h' },
  { text: 'Matching con abogado laboral en Quito', time: 'hace 3h' },
]

export default function DashboardPage() {
  const [health, setHealth] = useState<any>(null)
  const [corpus, setCorpus] = useState<any>(null)

  useEffect(() => {
    getHealth().then(setHealth).catch(console.error)
    getCorpusStats().then(setCorpus).catch(console.error)
  }, [])

  const ok = health?.status === 'ok'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
        <p className="text-rimai-400 text-sm">Panel de control RimAI 🐺</p>
      </div>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-6 border ${ok ? 'bg-green-900/20 border-green-700/40' : 'bg-red-900/20 border-red-700/40'}`}>
        {ok ? <CheckCircle size={15} className="text-green-400" /> : <AlertCircle size={15} className="text-red-400" />}
        <span className="text-sm text-white">Backend {ok ? 'operativo' : 'offline'} — <span className="text-rimai-300">{health?.model || '...'}</span></span>
        <span className="ml-auto text-xs text-rimai-500">Railway</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: MessageSquare, label: 'Consultas semana', value: '175', sub: '+23%', color: 'bg-rimai-700' },
          { icon: Users, label: 'Usuarios activos', value: '48', sub: '12 Pro', color: 'bg-purple-700' },
          { icon: BookOpen, label: 'Chunks legales', value: corpus?.total_chunks?.toLocaleString() || '—', sub: `${Object.keys(corpus?.by_category || {}).length} leyes`, color: 'bg-indigo-700' },
          { icon: FileText, label: 'Documentos', value: '34', sub: 'Esta semana', color: 'bg-violet-700' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="card">
            <div className={`p-2 rounded-lg ${color} w-fit mb-3`}><Icon size={17} className="text-white" /></div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm text-rimai-300">{label}</p>
            <p className="text-xs text-rimai-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2">
          <div className="flex justify-between mb-4">
            <p className="text-sm font-semibold text-white">Consultas diarias</p>
            <span className="text-xs text-rimai-500">7 días</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6d58ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6d58ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#8b7bff', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b7bff', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1335', border: '1px solid #2d1f5e', borderRadius: 8 }} labelStyle={{ color: '#e8e4ff' }} />
              <Area type="monotone" dataKey="consultas" stroke="#6d58ff" strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">Corpus</p>
          <div className="space-y-3">
            {corpus ? Object.entries(corpus.by_category as Record<string,number>).map(([cat, count]) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rimai-300 capitalize">{cat.replace(/_/g,' ')}</span>
                  <span className="text-white">{count}</span>
                </div>
                <div className="h-1.5 bg-[#12093a] rounded-full">
                  <div className="h-full bg-rimai-600 rounded-full" style={{ width: `${Math.min((count/corpus.total_chunks)*300,100)}%` }} />
                </div>
              </div>
            )) : <p className="text-rimai-500 text-sm">Cargando...</p>}
          </div>
        </div>
      </div>
      <div className="card">
        <p className="text-sm font-semibold text-white mb-4">Actividad reciente</p>
        {recent.map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#2d1f5e] last:border-0">
            <div className="w-1.5 h-1.5 rounded-full bg-rimai-500 shrink-0" />
            <p className="text-sm text-rimai-200 flex-1">{item.text}</p>
            <span className="text-xs text-rimai-500">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
