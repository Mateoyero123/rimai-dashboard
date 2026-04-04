'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'

const users = [
  { id: 1, name: 'Ana Torres',     email: 'ana@gmail.com',      plan: 'Pro',   city: 'Quito',     queries: 28,  joined: '2026-03-15' },
  { id: 2, name: 'Carlos Mendez',  email: 'carlos@gmail.com',   plan: 'Free',  city: 'Guayaquil', queries: 3,   joined: '2026-04-01' },
  { id: 3, name: 'María Vega',     email: 'maria@empresa.com',  plan: 'Firma', city: 'Cuenca',    queries: 145, joined: '2026-02-20' },
  { id: 4, name: 'Pedro Alvarado', email: 'pedro@gmail.com',    plan: 'Free',  city: 'Quito',     queries: 3,   joined: '2026-04-03' },
  { id: 5, name: 'Sofía Ruiz',     email: 'sofia@gmail.com',    plan: 'Pro',   city: 'Ibarra',    queries: 41,  joined: '2026-03-28' },
  { id: 6, name: 'Luis Paredes',   email: 'luis@gmail.com',     plan: 'Free',  city: 'Loja',      queries: 2,   joined: '2026-04-02' },
]

const planColor: Record<string, string> = {
  Free: 'bg-gray-800 text-gray-400',
  Pro: 'bg-rimai-900 text-rimai-300 border border-rimai-700',
  Firma: 'bg-violet-900 text-violet-300 border border-violet-700',
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search)
    const matchPlan = filter === 'all' || u.plan.toLowerCase() === filter
    return matchSearch && matchPlan
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Usuarios</h1>
        <p className="text-rimai-400 text-sm">Gestión de usuarios y planes</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: users.length, color: 'text-white' },
          { label: 'Free',  value: users.filter(u => u.plan === 'Free').length,  color: 'text-gray-400' },
          { label: 'Pro',   value: users.filter(u => u.plan === 'Pro').length,   color: 'text-rimai-300' },
          { label: 'Firma', value: users.filter(u => u.plan === 'Firma').length, color: 'text-violet-300' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-rimai-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-2.5 text-rimai-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario..."
            className="w-full bg-[#1a1335] border border-[#2d1f5e] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-rimai-600 focus:outline-none focus:border-rimai-500" />
        </div>
        {['all', 'free', 'pro', 'firma'].map(p => (
          <button key={p} onClick={() => setFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === p ? 'bg-rimai-700 text-white' : 'bg-[#1a1335] text-rimai-400 hover:text-white border border-[#2d1f5e]'}`}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2d1f5e]">
              {['Usuario', 'Email', 'Plan', 'Ciudad', 'Consultas', 'Registro'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-rimai-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} className={`border-b border-[#2d1f5e] hover:bg-[#12093a] transition-colors ${i === filtered.length - 1 ? 'border-0' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-rimai-800 flex items-center justify-center text-xs font-bold text-white">{u.name[0]}</div>
                    <span className="text-sm text-white">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-rimai-400">{u.email}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${planColor[u.plan]}`}>{u.plan}</span></td>
                <td className="px-4 py-3 text-sm text-rimai-400">{u.city}</td>
                <td className="px-4 py-3 text-sm text-white font-medium">{u.queries}</td>
                <td className="px-4 py-3 text-xs text-rimai-500">{u.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
