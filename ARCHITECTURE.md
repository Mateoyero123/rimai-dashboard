# RimAI — Arquitectura del sistema

## Stack
- Backend: FastAPI + Python en Railway
- Frontend: Next.js 14 + Tailwind en Vercel
- DB: Supabase (PostgreSQL + pgvector)
- LLM: Claude claude-sonnet-4-6 (Anthropic)
- Embeddings: text-embedding-3-small (OpenAI, 1536 dims)

---

## Backend — Estructura de carpetas

```
RimAI2/
├── api/
│   ├── main.py                    # FastAPI init, CORS, registro de routers
│   └── routes/
│       ├── chat.py                # /api/v1/chat
│       ├── documents.py           # /api/v1/documents
│       ├── health.py              # /health
│       ├── ingestion.py           # /api/v1/internal/ingestion
│       ├── lawyers.py             # /api/v1/lawyers
│       └── team.py                # /api/v1/internal/team
├── agents/
│   ├── orchestrator.py            # Router principal por intent
│   ├── legal_advisor.py           # Asesor legal conversacional con RAG
│   ├── document_generator.py      # Generación directa de documentos legales
│   ├── document_builder.py        # Constructor conversacional con tool_use + vision
│   └── lawyer_matcher.py          # Matching usuario-abogado
├── team_agents/
│   ├── base.py                    # BaseTeamAgent (clase abstracta)
│   ├── legal/agent.py             # LegalTeamAgent
│   ├── comercial/agent.py         # ComercialAgent
│   ├── data/agent.py              # DataAgent
│   └── dev/agent.py               # DevAgent
├── rag/
│   ├── ingestion.py               # Chunking + embeddings
│   └── retrieval.py               # Búsqueda semántica en corpus legal
├── core/
│   ├── config.py                  # Settings (pydantic-settings)
│   ├── database.py                # Cliente Supabase
│   ├── logger.py                  # Logging estructurado
│   └── file_processor.py          # Procesamiento PDF/DOCX/imágenes
├── frontend-client/
│   ├── rimai-client.ts            # Cliente HTTP TypeScript
│   └── useRimAIChat.ts            # React hook para chat
├── scripts/
│   └── supabase_setup.sql         # Esquema inicial de Supabase
├── requirements.txt
├── Dockerfile
└── Makefile
```

---

## Backend — Agentes de producto

### RimAIOrchestrator (`agents/orchestrator.py`)
Router principal. Detecta intent y delega a agente especializado.
- `detect_intent(message)` → `IntentDetection` (legal_question | document_generation | find_lawyer | greeting | unclear)
- `process(message, user_city)` → `AsyncIterator[str]` (streaming)
- Estado: `detected_legal_area`, `pending_document_type`

### LegalAdvisorAgent (`agents/legal_advisor.py`)
Asesor legal conversacional con RAG sobre el corpus legal ecuatoriano.
- `ask(query, category_filter?)` → `AsyncIterator[str]` (streaming)
- `ask_simple(query, category_filter?)` → `str`
- `clear_history()`
- `get_history_for_intent()` → últimas 6 mensajes para contexto
- `get_sources(query)` → `list[LegalChunk]`
- Historial: mantiene últimos 20 mensajes en memoria

### DocumentGeneratorAgent (`agents/document_generator.py`)
Genera documentos legales directamente dado tipo + campos.
- `generate(DocumentRequest)` → `DocumentResult`
- `get_required_fields(doc_type)` → `dict[str, str]`
- **DocumentType**: contrato_trabajo_indefinido, contrato_trabajo_plazo_fijo, contrato_arrendamiento, carta_renuncia, acta_finiquito, poder_simple, carta_cobro, contrato_compraventa_mueble, promesa_compraventa
- Flags: `NOTARY_REQUIRED`, `LAWYER_RECOMMENDED` (sets de tipos)

### DocumentBuilderAgent (`agents/document_builder.py`)
Constructor conversacional de documentos con Claude tool_use + vision.
- `chat(message, file_ids?)` → `AsyncIterator[str]` (streaming + tool calling)
- `clear_history()`
- Tool registrado: `generate_document(document_type, fields)`
- Extrae texto de PDF/DOCX, procesa imágenes vía Vision
- Historial: máximo 20 mensajes

### LawyerMatcherAgent (`agents/lawyer_matcher.py`)
Analiza caso legal y busca abogados compatibles en Supabase.
- `analyze_case(user_description)` → `CaseAnalysis`
- `match(user_description, city?)` → `MatchResult`
- **LegalArea**: laboral, civil, familia, penal, mercantil, tributario, administrativo, inmobiliario, migratorio, otro
- **CaseUrgency**: alta (<7 días), media (7-30 días), baja (sin urgencia)
- **LawyerProfile**: id, full_name, specializations[], city, hourly_rate, rating, reviews_count, bio_short, response_time_hours
- Consulta tabla `lawyers` en Supabase, rankea por rating

---

## Backend — Agentes de equipo interno

Todos heredan de `BaseTeamAgent` (`team_agents/base.py`).

**Modelos compartidos:**
- `TeamAgentTask`: task_id, team, description, context{}, priority, requested_by?, created_at
- `TeamAgentResult`: task_id, team, status (completed|failed|needs_human), output, actions_taken[], follow_ups[], escalate_to_human, escalation_reason

### LegalTeamAgent (`team_agents/legal/agent.py`)
Compliance, verificación jurídica, fuentes legales.
- `verify_rag_response(user_query, rag_response, chunks_used)` → str
- `draft_disclaimer(context_type)` → str (plataforma | documento | consulta_penal | consulta_tributaria)
- `review_document_template(template_content, doc_type)` → str
- `build_legal_source_map(legal_area)` → str
- `check_platform_compliance()` → str (LOPDP, Ley Comercio Electrónico, Código de Ética)
- `execute_task(task)` → TeamAgentResult

### ComercialAgent (`team_agents/comercial/agent.py`)
Lead scoring, conversión, churn, seguimientos.
- `score_lead(user_id)` → dict (score 0-100, category, reasons, urgency)
- `draft_follow_up(user_id, channel)` → str (email | whatsapp | in_app)
- `generate_weekly_report()` → str (Markdown con métricas y acciones)
- `execute_task(task)` → TeamAgentResult
- Tablas: `profiles`, `query_logs`, `conversations`

### DataAgent (`team_agents/data/agent.py`)
Salud del RAG, gaps del corpus, analítica de uso.
- `analyze_rag_health()` → str (cobertura, queries de baja similitud, alertas)
- `identify_corpus_gaps()` → str (gaps críticos, alta demanda, estratégicos)
- `generate_usage_report(days=7)` → str (volumen, distribución, patrones)
- `execute_task(task)` → TeamAgentResult
- Tablas: `legal_chunks`, `messages`, `conversations`

### DevAgent (`team_agents/dev/agent.py`)
Revisión de código, triaje de bugs, documentación, deuda técnica.
- `review_code(code, file_type, focus)` → str (focus: security | performance | rag-quality | general)
- `triage_bug(bug_report, error_logs)` → str (diagnóstico, hipótesis, reproducción, fix, prioridad)
- `generate_module_docs(file_path)` → str
- `analyze_tech_debt(file_path)` → str (scores: legibilidad, testing, error handling, seguridad, performance)
- `execute_task(task)` → TeamAgentResult

---

## Backend — Endpoints API

**Base URL producción:** `https://rimai-backend-production.up.railway.app`

### Health
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health/` | `{ status, env, model }` |
| GET | `/health/ready` | `{ status: "ready"\|"degraded", checks: {...} }` |

### Chat (`/api/v1/chat`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/chat/stream` | SSE streaming. Body: `{ session_id, message, user_city?, user_id? }` |
| POST | `/api/v1/chat/message` | JSON no-streaming. Returns `{ session_id, response }` |
| DELETE | `/api/v1/chat/{session_id}` | Limpia historial de sesión |

### Documents (`/api/v1/documents`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/documents/types` | Lista tipos de documentos con metadata |
| GET | `/api/v1/documents/fields/{document_type}` | Campos requeridos por tipo |
| POST | `/api/v1/documents/generate` | Genera documento. Body: `{ document_type, fields{}, user_id? }` |
| POST | `/api/v1/documents/upload` | Sube archivo al builder. Form: `file, session_id?` |
| POST | `/api/v1/documents/builder/stream` | Constructor conversacional SSE. Body: `{ session_id, message, file_ids[] }` |
| DELETE | `/api/v1/documents/builder/{session_id}` | Limpia sesión del builder |

### Lawyers (`/api/v1/lawyers`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/lawyers/match` | Matching abogados. Body: `{ case_description, city?, user_id? }` |
| POST | `/api/v1/lawyers/analyze` | Análisis de caso sin matching |

### Ingestion (`/api/v1/internal/ingestion`) — requiere `x-internal-key`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/internal/ingestion/categories` | Lista categorías legales |
| POST | `/api/v1/internal/ingestion/upload` | Ingesta PDF/DOCX. Form: `file, category, source_name, year?` |
| GET | `/api/v1/internal/ingestion/stats` | `{ total_chunks, by_category, categories_with_data }` |

### Team Agents (`/api/v1/internal/team`) — requiere `x-internal-key`
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/internal/team/task` | Tarea genérica. Body: `{ team, description, context, priority, requested_by? }` |
| POST | `/api/v1/internal/team/comercial/lead-score/{user_id}` | Score de lead |
| POST | `/api/v1/internal/team/comercial/follow-up/{user_id}` | Draft de seguimiento. Query: `channel=email\|whatsapp\|in_app` |
| GET | `/api/v1/internal/team/comercial/weekly-report` | Reporte semanal de ventas |
| GET | `/api/v1/internal/team/data/rag-health` | Salud del sistema RAG |
| GET | `/api/v1/internal/team/data/corpus-gaps` | Gaps de cobertura del corpus |
| GET | `/api/v1/internal/team/legal/compliance` | Check de compliance de plataforma |
| POST | `/api/v1/internal/team/legal/source-map` | Mapa de fuentes legales. Query: `legal_area=laboral\|civil\|...` |

---

## Backend — Configuración (`core/config.py`)

```python
# App
app_env: str = "development"
app_secret_key: str
app_host: str = "0.0.0.0"
app_port: int = 8000
log_level: str = "INFO"

# Claude
anthropic_api_key: str
claude_model: str = "claude-sonnet-4-6"
claude_max_tokens: int = 4096
claude_temperature: float = 0.1

# OpenAI (embeddings)
openai_api_key: str
embedding_model: str = "text-embedding-3-small"
embedding_dimensions: int = 1536

# Supabase
supabase_url: str
supabase_key: str
supabase_service_key: str
supabase_db_url: str

# RAG
chunk_size: int = 800
chunk_overlap: int = 150
rag_top_k: int = 6

# Stripe (opcional)
stripe_secret_key: str = ""
stripe_webhook_secret: str = ""

@property is_production: bool
```

---

## Frontend — Estructura de carpetas

```
rimai-dashboard/
├── app/
│   ├── layout.tsx               # Layout raíz con Sidebar
│   ├── page.tsx                 # Redirect a /dashboard
│   ├── dashboard/page.tsx       # Overview con métricas
│   ├── chat/page.tsx            # Visor de conversaciones (read-only)
│   ├── playground/page.tsx      # Tester del agente con system prompts
│   ├── corpus/page.tsx          # Ingestión de documentos legales
│   ├── team/page.tsx            # Ejecutor de agentes de equipo
│   ├── users/page.tsx           # (Placeholder)
│   ├── lawyers/page.tsx         # (Placeholder)
│   └── globals.css
├── components/
│   └── layout/
│       └── Sidebar.tsx          # Navegación principal
├── lib/
│   └── api.ts                   # Cliente HTTP hacia backend Railway
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .env.local
```

---

## Frontend — Dashboard páginas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/dashboard` | Overview | Stats cards, gráfico diario (Recharts), breakdown del corpus, actividad reciente |
| `/chat` | Conversation Viewer | Listado + hilo de conversaciones (read-only). Muestra plan, área legal, conteo de mensajes |
| `/playground` | Chat Playground | Panel de config (system prompts, filtro de área, info de sesión) + chat en vivo |
| `/corpus` | Corpus RAG | Upload PDF/DOCX con drag-drop, seguimiento de stages, gráfico por categoría |
| `/team` | Agentes de equipo | 4 secciones (Comercial, Data, Dev, Legal), botones de ejecución, resultados colapsables |
| `/users` | Usuarios | Placeholder |
| `/lawyers` | Abogados | Placeholder |

### Playground — System Prompt Presets
Default, Conciso, Didáctico, Técnico-jurídico, Laboral, Custom

### Corpus — Categorías de ingesta (11)
Configurable via dropdown en el UI.

---

## Frontend — Sidebar (`components/layout/Sidebar.tsx`)

| Ruta | Ícono (lucide-react) |
|------|---------------------|
| `/dashboard` | LayoutDashboard |
| `/chat` | MessageSquare |
| `/playground` | FlaskConical |
| `/corpus` | BookOpen |
| `/users` | Users |
| `/lawyers` | Scale |
| `/team` | Bot |

- Indicador de estado: "API Online" (punto verde)
- Indicador de deploy: Railway

---

## Frontend — lib/api.ts

```typescript
const API_URL = process.env.NEXT_PUBLIC_RIMAI_API_URL
             || 'https://rimai-backend-production.up.railway.app'
```

| Función | Método | Endpoint |
|---------|--------|----------|
| `getHealth()` | GET | `/health/` |
| `getReadiness()` | GET | `/health/ready` |
| `sendChatMessage(sessionId, message, userCity?)` | POST | `/api/v1/chat/message` |
| `clearChatSession(sessionId)` | DELETE | `/api/v1/chat/{sessionId}` |
| `getDocumentTypes()` | GET | `/api/v1/documents/types` |
| `generateDocument(documentType, fields)` | POST | `/api/v1/documents/generate` |
| `matchLawyers(caseDescription, city?)` | POST | `/api/v1/lawyers/match` |
| `getCorpusStats()` | GET | `/api/v1/internal/ingestion/stats` |
| `getCorpusCategories()` | GET | `/api/v1/internal/ingestion/categories` |
| `uploadLegalDocument(file, category, sourceName)` | POST | `/api/v1/internal/ingestion/upload` |
| `runTeamTask(team, description, context?)` | POST | `/api/v1/internal/team/task` |
| `getWeeklyReport()` | GET | `/api/v1/internal/team/comercial/weekly-report` |
| `getRagHealth()` | GET | `/api/v1/internal/team/data/rag-health` |
| `getCorpusGaps()` | GET | `/api/v1/internal/team/data/corpus-gaps` |

---

## Frontend — Dependencias clave (package.json)

```json
{
  "next": "14.2.0",
  "react": "^18",
  "recharts": "^2.12.0",
  "lucide-react": "^0.383.0",
  "react-markdown": "^9.0.0",
  "date-fns": "^3.6.0",
  "clsx": "^2.1.0"
}
```

---

## URLs de producción

| Servicio | URL |
|---------|-----|
| Backend API | https://rimai-backend-production.up.railway.app |
| Dashboard | https://rimai-dashboard.vercel.app |

---

## Deploy

| Servicio | Plataforma | Trigger |
|---------|-----------|---------|
| Backend | Railway | `git push` rama main → autodeploy |
| Frontend | Vercel | `git push` rama main → autodeploy |

---

## Para agregar un nuevo agente — checklist

1. Crear `agents/nuevo_agente.py` con la clase del agente
2. Crear `api/routes/nuevo_route.py` con los endpoints FastAPI
3. Registrar el router en `api/main.py`
4. Agregar funciones en `rimai-dashboard/lib/api.ts`
5. Crear `rimai-dashboard/app/nueva-seccion/page.tsx`
6. Agregar la ruta al sidebar en `components/layout/Sidebar.tsx`
