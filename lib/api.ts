/**
 * lib/api.ts
 * Cliente para conectar el dashboard con el backend RimAI en Railway
 */

const API_URL = process.env.NEXT_PUBLIC_RIMAI_API_URL || 'https://rimai-backend-production.up.railway.app'

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function getHealth() {
  return fetchAPI('/health/')
}

export async function getReadiness() {
  return fetchAPI('/health/ready')
}

// ── Chat / Sessions ───────────────────────────────────────────────────────────
export async function sendChatMessage(sessionId: string, message: string, userCity?: string) {
  return fetchAPI('/api/v1/chat/message', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, message, user_city: userCity }),
  })
}

export async function clearChatSession(sessionId: string) {
  return fetchAPI(`/api/v1/chat/${sessionId}`, { method: 'DELETE' })
}

// ── Documents ─────────────────────────────────────────────────────────────────
export async function getDocumentTypes() {
  return fetchAPI('/api/v1/documents/types')
}

export async function generateDocument(documentType: string, fields: Record<string, string>) {
  return fetchAPI('/api/v1/documents/generate', {
    method: 'POST',
    body: JSON.stringify({ document_type: documentType, fields }),
  })
}

// ── Lawyers ───────────────────────────────────────────────────────────────────
export async function matchLawyers(caseDescription: string, city?: string) {
  return fetchAPI('/api/v1/lawyers/match', {
    method: 'POST',
    body: JSON.stringify({ case_description: caseDescription, city }),
  })
}

// ── Corpus / RAG ──────────────────────────────────────────────────────────────
export async function getCorpusStats() {
  return fetchAPI('/api/v1/internal/ingestion/stats')
}

export async function getCorpusCategories() {
  return fetchAPI('/api/v1/internal/ingestion/categories')
}

export async function uploadLegalDocument(file: File, category: string, sourceName: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)
  formData.append('source_name', sourceName)

  const res = await fetch(`${API_URL}/api/v1/internal/ingestion/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Upload error: ${res.status}`)
  return res.json()
}

// ── Document Builder ──────────────────────────────────────────────────────────
export async function uploadDocumentFile(file: File, sessionId?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (sessionId) formData.append('session_id', sessionId)

  const res = await fetch(`${API_URL}/api/v1/documents/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Upload error: ${res.status}`)
  return res.json() as Promise<{ file_id: string; filename: string; content_type: string; size_bytes: number; preview?: string }>
}

export async function streamBuilderMessage(
  sessionId: string,
  message: string,
  fileIds: string[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  const res = await fetch(`${API_URL}/api/v1/documents/builder/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message, file_ids: fileIds }),
  })

  if (!res.ok || !res.body) {
    onError(`Error ${res.status}`)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6)
      if (payload === '[DONE]') { onDone(); return }
      onToken(payload.replace(/\\n/g, '\n'))
    }
  }
  onDone()
}

export async function clearBuilderSession(sessionId: string) {
  return fetchAPI(`/api/v1/documents/builder/${sessionId}`, { method: 'DELETE' })
}

// ── Team Agents ───────────────────────────────────────────────────────────────
export async function runTeamTask(team: string, description: string, context?: Record<string, unknown>) {
  return fetchAPI('/api/v1/internal/team/task', {
    method: 'POST',
    body: JSON.stringify({ team, description, context: context || {} }),
  })
}

export async function getWeeklyReport() {
  return fetchAPI('/api/v1/internal/team/comercial/weekly-report')
}

export async function getRagHealth() {
  return fetchAPI('/api/v1/internal/team/data/rag-health')
}

export async function getCorpusGaps() {
  return fetchAPI('/api/v1/internal/team/data/corpus-gaps')
}
