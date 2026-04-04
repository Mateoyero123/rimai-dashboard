'use client'
// app/lawyers/page.tsx
import { useState } from 'react'
import { Scale, Star, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react'
import { matchLawyers } from '@/lib/api'

const mockLawyers = [
  { id: 1, name: 'Dr. Carlos Mendoza', city: 'Quito', areas: ['laboral', 'civil'], rate: 80, rating: 4.8, reviews: 23, verified: true, active: true },
  { id: 2, name: 'Dra. María Rodríguez', city: 'Guayaquil', areas: ['familia', 'civil'], rate: 70, rating: 4.9, reviews: 41, verified: true, active: true },
  { id: 3, name: 'Dr. Andrés Cabrera', city: 'Quito', areas: ['mercantil', 'tributario'], rate: 100, rating: 4.7, reviews: 17, verified: true, active: true },
  { id: 4, name: 'Dra. Lucía Vargas', city: 'Cuenca', areas: ['laboral'], rate: 60, rating: 4.5, reviews: 8, verified: false, active: true },
]

const areaColors: Record<string, string> = {
  laboral: 'bg-blue-900/50 text-blue-300',
  civil: 'bg-purple-900/50 text-purple-300',
  mercantil: 'bg-amber-900/50 text-amber-300',
  familia: 'bg-pink-900/50 text-pink-300',
  tributario: 'bg-green-900/50 text-green-300',
}

export default function LawyersPage() {
  const [testCase, setTestCase] = useState('')
  const [matchResult, setMatchResult] = useState<Record<string, unknown> | null>(null)
  const [matching, setMatching] = useState(false)

  async function handleMatch() {
    if (!testCase.trim()) return
    setMatching(true)
    try {
      const res = await matchLawyers(testCase)
      setMatchResult(res)
    } catch (e) {
      setMatchResult({ error: 'Error en matching' })
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Marketplace de Abogados</h1>
        <p className="text-rimai-400 text-sm">Gestión del directorio y matching</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de abogados */}
        <div className="lg:col-span-2 space-y-3">
          {mockLawyers.map(lawyer => (
            <div key={lawyer.id} className="card card-hover flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-rimai-800 flex items-center justify-center text-base font-bold text-white shrink-0">
                {lawyer.name.split(' ')[1][0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">{lawyer.name}</p>
                  {lawyer.verified
                    ? <CheckCircle size={13} className="text-green-400" />
                    : <XCircle size={13} className="text-rimai-600" />
                  }
                </div>
                <div className="flex items-center gap-3 text-xs text-rimai-400 mb-2">
                  <span className="flex items-center gap-1"><MapPin size={11} />{lawyer.city}</span>
                  <span className="flex items-center gap-1"><Star size={11} className="text-amber-400" />{lawyer.rating} ({lawyer.reviews})</span>
                  <span>${lawyer.rate}/hora</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {lawyer.areas.map(a => (
                    <span key={a} className={`text-xs px-1.5 py-0.5 rounded ${areaColors[a] || 'bg-gray-800 text-gray-400'}`}>{a}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded text-center ${lawyer.active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {lawyer.active ? 'Activo' : 'Inactivo'}
                </span>
                {!lawyer.verified && (
                  <button className="text-xs px-2 py-0.5 rounded bg-rimai-900 text-rimai-300 border border-rimai-700 hover:bg-rimai-800">
                    Verificar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Test matching */}
        <div className="card h-fit">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Scale size={15} className="text-rimai-400" />
            Probar matching
          </h2>
          <textarea
            value={testCase}
            onChange={e => setTestCase(e.target.value)}
            placeholder="Describe el caso legal del usuario para probar el matching..."
            rows={4}
            className="w-full bg-[#12093a] border border-[#2d1f5e] rounded-lg px-3 py-2 text-sm text-white placeholder-rimai-600 focus:outline-none focus:border-rimai-500 resize-none mb-3"
          />
          <button
            onClick={handleMatch}
            disabled={matching}
            className="w-full py-2 bg-rimai-700 hover:bg-rimai-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {matching ? 'Analizando...' : 'Ejecutar matching'}
          </button>

          {matchResult && (
            <div className="mt-3 bg-[#12093a] rounded-lg p-3 border border-[#2d1f5e]">
              <p className="text-xs text-rimai-400 mb-2">Resultado:</p>
              <pre className="text-xs text-rimai-200 overflow-auto max-h-48">
                {JSON.stringify(matchResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
