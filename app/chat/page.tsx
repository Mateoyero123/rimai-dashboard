'use client'
import { useState } from 'react'
import { Search, Clock, MessageSquare } from 'lucide-react'

type Message = { role: 'user' | 'ai'; text: string; time: string }
interface Conversation {
  id: string; user: string; plan: string; area: string
  lastMessage: string; time: string; messages: number
  thread: Message[]
}

const mockConversations: Conversation[] = [
  {
    id: 'c1', user: 'Ana Torres', plan: 'Pro', area: 'laboral',
    lastMessage: '¿Cuántos días de vacaciones me corresponden?', time: 'hace 5 min', messages: 4,
    thread: [
      { role: 'user', text: '¿Cuántos días de vacaciones me corresponden?', time: '14:32' },
      { role: 'ai', text: 'Según el Art. 69 del Código de Trabajo ecuatoriano, todo trabajador tiene derecho a un mínimo de 15 días de vacaciones anuales remuneradas. A partir del quinto año de servicio se añade un día adicional por cada año extra.', time: '14:32' },
      { role: 'user', text: '¿Y si llevo 8 años en la empresa?', time: '14:33' },
      { role: 'ai', text: 'Con 8 años de servicio te corresponden 15 días base + 3 días adicionales (años 6, 7 y 8) = 18 días de vacaciones anuales.', time: '14:33' },
    ],
  },
  {
    id: 'c2', user: 'Carlos Mendez', plan: 'Free', area: 'civil',
    lastMessage: '¿Qué pasa si mi arrendador no devuelve el depósito?', time: 'hace 23 min', messages: 7,
    thread: [
      { role: 'user', text: '¿Qué pasa si mi arrendador no devuelve el depósito?', time: '14:14' },
      { role: 'ai', text: 'El Art. 30 de la Ley de Inquilinato obliga al arrendador a devolver el depósito dentro de los 30 días posteriores a la terminación del contrato. Si no lo hace, puedes demandar ante el juez de inquilinato e incluso reclamar intereses.', time: '14:15' },
    ],
  },
  {
    id: 'c3', user: 'María Vega', plan: 'Firma', area: 'mercantil',
    lastMessage: '¿Cómo constituyo una compañía limitada en Ecuador?', time: 'hace 1h', messages: 12,
    thread: [
      { role: 'user', text: '¿Cómo constituyo una compañía limitada en Ecuador?', time: '13:20' },
      { role: 'ai', text: 'Para constituir una Compañía de Responsabilidad Limitada (Cía. Ltda.) en Ecuador necesitas: mínimo 2 socios, capital mínimo de USD 400, escritura pública ante notario, aprobación de la Superintendencia de Compañías y registro en el Registro Mercantil.', time: '13:21' },
    ],
  },
  {
    id: 'c4', user: 'Pedro Alvarado', plan: 'Free', area: 'familia',
    lastMessage: '¿Cómo pido la pensión alimenticia?', time: 'hace 2h', messages: 3,
    thread: [
      { role: 'user', text: '¿Cómo pido la pensión alimenticia?', time: '12:37' },
      { role: 'ai', text: 'Puedes presentar una demanda de alimentos en la Unidad Judicial de Familia de tu cantón. Necesitas cédula, partida de nacimiento del menor y comprobante de los ingresos del demandado si lo tienes. El juez fija la pensión en base a la tabla del MIES.', time: '12:38' },
    ],
  },
  {
    id: 'c5', user: 'Sofía Ruiz', plan: 'Pro', area: 'laboral',
    lastMessage: '¿Me pueden despedir estando embarazada?', time: 'hace 3h', messages: 9,
    thread: [
      { role: 'user', text: '¿Me pueden despedir estando embarazada?', time: '11:45' },
      { role: 'ai', text: 'No. El Art. 153 del Código de Trabajo garantiza estabilidad laboral a la mujer embarazada desde la concepción hasta un año después del parto. Si te despiden en ese período, el empleador debe pagar un año de remuneración adicional como indemnización especial, más las demás indemnizaciones de ley.', time: '11:46' },
    ],
  },
]

const areaColor: Record<string, string> = {
  laboral: 'bg-blue-900/50 text-blue-300', civil: 'bg-purple-900/50 text-purple-300',
  mercantil: 'bg-amber-900/50 text-amber-300', familia: 'bg-pink-900/50 text-pink-300',
}
const planColor: Record<string, string> = {
  Free: 'bg-gray-800 text-gray-400', Pro: 'bg-rimai-900 text-rimai-300', Firma: 'bg-violet-900 text-violet-300',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function ChatPage() {
  const [selected, setSelected] = useState(mockConversations[0])
  const [search, setSearch] = useState('')

  const filtered = mockConversations.filter(c =>
    c.user.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* Conversation list */}
      <aside className="w-72 border-r border-[#2d1f5e] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d1f5e]">
          <h1 className="text-sm font-semibold text-white mb-3">Conversaciones</h1>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-rimai-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-rimai-600 focus:outline-none focus:border-rimai-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className={`w-full text-left px-4 py-3 border-b border-[#2d1f5e] transition-colors ${selected.id === c.id ? 'bg-rimai-900/40 border-l-2 border-l-rimai-500' : 'hover:bg-[#1a1335]'}`}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-white">{c.user}</span>
                <span className="text-xs text-rimai-500">{c.time}</span>
              </div>
              <p className="text-xs text-rimai-400 truncate mb-2">{c.lastMessage}</p>
              <div className="flex gap-1.5 items-center">
                <span className={`text-xs px-1.5 py-0.5 rounded ${planColor[c.plan]}`}>{c.plan}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${areaColor[c.area] ?? 'bg-gray-800 text-gray-400'}`}>{c.area}</span>
                <span className="text-xs text-rimai-600 ml-auto flex items-center gap-1">
                  <MessageSquare size={10} /> {c.messages}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation view (read-only) */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-5 py-3 border-b border-[#2d1f5e] flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-rimai-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {initials(selected.user)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{selected.user}</p>
            <p className="text-xs text-rimai-400">{selected.messages} mensajes · {selected.area}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded shrink-0 ${planColor[selected.plan]}`}>{selected.plan}</span>
        </div>

        {/* Messages (read-only) */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-px bg-[#2d1f5e]" />
            <span className="text-xs text-rimai-600 flex items-center gap-1.5">
              <Clock size={11} /> Conversación de {selected.user}
            </span>
            <div className="flex-1 h-px bg-[#2d1f5e]" />
          </div>

          {selected.thread.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-rimai-800 flex items-center justify-center text-xs font-bold text-rimai-200 shrink-0 mt-1">R</div>
              )}
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-[#1a1335] border border-[#2d1f5e] text-rimai-100 rounded-tr-sm'
                  : 'bg-rimai-900/40 border border-rimai-800/40 text-rimai-100 rounded-tl-sm'
                }`}>
                {msg.role === 'ai' && (
                  <p className="text-xs text-rimai-400 mb-1.5 font-medium">RimAI · Asistente Legal</p>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className="text-xs mt-1.5 text-rimai-600 text-right">{msg.time}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200 shrink-0 mt-1">
                  {initials(selected.user)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Read-only notice */}
        <div className="px-5 py-3 border-t border-[#2d1f5e] shrink-0">
          <p className="text-xs text-rimai-600 text-center">
            Vista de solo lectura · Para probar el agente ve a{' '}
            <a href="/playground" className="text-rimai-400 hover:text-rimai-300 underline underline-offset-2">
              Playground
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
