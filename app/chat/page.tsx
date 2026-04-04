'use client'
import { useState } from 'react'
import { Search, MessageSquare } from 'lucide-react'
import { sendChatMessage } from '@/lib/api'

const mockConversations = [
  { id: 'c1', user: 'Ana Torres',     plan: 'Pro',   area: 'laboral',   lastMessage: '¿Cuántos días de vacaciones me corresponden?',         time: 'hace 5 min',  messages: 4 },
  { id: 'c2', user: 'Carlos Mendez',  plan: 'Free',  area: 'civil',     lastMessage: '¿Qué pasa si mi arrendador no devuelve el depósito?',  time: 'hace 23 min', messages: 7 },
  { id: 'c3', user: 'María Vega',     plan: 'Firma', area: 'mercantil', lastMessage: '¿Cómo constituyo una compañía limitada en Ecuador?',   time: 'hace 1h',     messages: 12 },
  { id: 'c4', user: 'Pedro Alvarado', plan: 'Free',  area: 'familia',   lastMessage: '¿Cómo pido la pensión alimenticia?',                   time: 'hace 2h',     messages: 3 },
  { id: 'c5', user: 'Sofía Ruiz',     plan: 'Pro',   area: 'laboral',   lastMessage: '¿Me pueden despedir estando embarazada?',              time: 'hace 3h',     messages: 9 },
]

const areaColor: Record<string, string> = {
  laboral: 'bg-blue-900/50 text-blue-300', civil: 'bg-purple-900/50 text-purple-300',
  mercantil: 'bg-amber-900/50 text-amber-300', familia: 'bg-pink-900/50 text-pink-300',
}
const planColor: Record<string, string> = {
  Free: 'bg-gray-800 text-gray-400', Pro: 'bg-rimai-900 text-rimai-300', Firma: 'bg-violet-900 text-violet-300',
}

export default function ChatPage() {
  const [selected, setSelected] = useState(mockConversations[0])
  const [search, setSearch] = useState('')
  const [testMsg, setTestMsg] = useState('')
  const [testReply, setTestReply] = useState('')
  const [testing, setTesting] = useState(false)

  const filtered = mockConversations.filter(c =>
    c.user.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  )

  async function handleTest() {
    if (!testMsg.trim()) return
    setTesting(true)
    try {
      const res = await sendChatMessage(`admin-${Date.now()}`, testMsg)
      setTestReply(res.response)
    } catch { setTestReply('Error conectando con el backend') }
    finally { setTesting(false) }
  }

  return (
    <div className="flex h-screen">
      {/* Lista */}
      <div className="w-72 border-r border-[#2d1f5e] flex flex-col">
        <div className="p-4 border-b border-[#2d1f5e]">
          <h1 className="text-base font-semibold text-white mb-3">Conversaciones</h1>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-rimai-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-rimai-600 focus:outline-none focus:border-rimai-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className={`w-full text-left px-4 py-3 border-b border-[#2d1f5e] transition-colors ${selected.id === c.id ? 'bg-rimai-900/40' : 'hover:bg-[#1a1335]'}`}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-white">{c.user}</span>
                <span className="text-xs text-rimai-500">{c.time}</span>
              </div>
              <p className="text-xs text-rimai-400 truncate mb-2">{c.lastMessage}</p>
              <div className="flex gap-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded ${planColor[c.plan]}`}>{c.plan}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${areaColor[c.area] || 'bg-gray-800 text-gray-400'}`}>{c.area}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-[#2d1f5e] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-rimai-700 flex items-center justify-center text-sm font-bold text-white">{selected.user[0]}</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{selected.user}</p>
            <p className="text-xs text-rimai-400">{selected.messages} mensajes · {selected.area}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${planColor[selected.plan]}`}>{selected.plan}</span>
        </div>

        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <p className="text-center text-xs text-rimai-600">Conversación de {selected.user}</p>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-rimai-800 flex items-center justify-center text-xs text-white shrink-0">{selected.user[0]}</div>
            <div className="bg-[#1a1335] rounded-lg rounded-tl-none px-4 py-3 max-w-lg">
              <p className="text-sm text-rimai-200">{selected.lastMessage}</p>
              <p className="text-xs text-rimai-500 mt-1">{selected.time}</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <div className="bg-rimai-800/60 rounded-lg rounded-tr-none px-4 py-3 max-w-lg">
              <p className="text-xs text-rimai-400 mb-1">🐺 RimAI</p>
              <p className="text-sm text-white">Respuesta del agente legal basada en la legislación ecuatoriana vigente. Cita los artículos relevantes del Código de Trabajo, Civil o la Constitución según corresponda.</p>
            </div>
          </div>
        </div>

        {/* Test en vivo */}
        <div className="px-6 py-4 border-t border-[#2d1f5e]">
          <p className="text-xs text-rimai-500 mb-2">Probar RimAI en vivo</p>
          <div className="flex gap-2">
            <input value={testMsg} onChange={e => setTestMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTest()}
              placeholder="Escribe una consulta legal..."
              className="flex-1 bg-[#12093a] border border-[#2d1f5e] rounded-lg px-4 py-2 text-sm text-white placeholder-rimai-600 focus:outline-none focus:border-rimai-500" />
            <button onClick={handleTest} disabled={testing}
              className="px-4 py-2 bg-rimai-700 hover:bg-rimai-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
              {testing ? '...' : 'Enviar'}
            </button>
          </div>
          {testReply && (
            <div className="mt-3 bg-[#1a1335] border border-[#2d1f5e] rounded-lg p-3">
              <p className="text-xs text-rimai-400 mb-1">🐺 RimAI:</p>
              <p className="text-sm text-rimai-200 whitespace-pre-wrap line-clamp-6">{testReply}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
