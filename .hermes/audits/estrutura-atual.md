# Auditoria Estrutural — GymFlow

**Data:** 2026-07-30
**Objetivo:** Mapear arquitetura atual antes de integrar agente modular de hipertrofia.

---

## 1. Mapa da Arquitetura

```
GymFlow/
├── index.tsx                          # Entry point (ReactDOM + Service Worker)
├── App.tsx                            # State manager + router (508 linhas)
├── types.ts                           # Todos os tipos TypeScript (86 linhas)
├── metadata.json                      # Metadados do app
├── package.json                       # Dependências principais
├── tsconfig.json                      # Config TS (ES2022, React JSX)
├── firebase.json                      # Config Firebase Hosting
├── firestore.rules                    # Regras de segurança Firestore
├── firestore.indexes.json             # Índices Firestore (vazio)
├── .firebaserc                        # Projeto: gymflow-pedro-dieb
├── .env.example                       # Template de variáveis de ambiente
├── vite.config.ts                     # Config Vite
│
├── components/
│   ├── Dashboard.tsx                  # Tela inicial (auth, backup, navegação)
│   ├── ProgramList.tsx                # CRUD de programas + gerador IA
│   ├── ProgramDaysManager.tsx         # Gerenciar dias/splits + export PDF
│   ├── WorkoutTracker.tsx             # Tela principal de treino (656 linhas!)
│   ├── WorkoutCalendar.tsx            # Calendário de sessões passadas
│   ├── Profile.tsx                    # Perfil do usuário
│   └── WeeklyReview.tsx               # Análise semanal via IA (Gemini)
│
├── services/
│   ├── firebase.ts                    # Init Firebase Auth + Firestore
│   └── geminiService.ts               # 5 funções de IA (Gemini)
│
├── utils/
│   ├── loadSuggestion.ts              # Sugestão de próxima carga (+2.5-5%)
│   ├── workoutHistory.ts              # Busca de exercício anterior (fuzzy match)
│   └── workoutOrder.ts                # Ordenação de dias de treino
│
├── data/
│   └── workoutTemplates.ts            # Template Fase 1 hardcoded (335 linhas)
│
└── .hermes/
    ├── audits/                        # (este arquivo e futuros)
    └── skills/fitness/gymflow-coach/  # Skill de coaching existente
```

---

## 2. Modelos de Dados

### 2.1 Exercise (exercício planejado/editável)
```typescript
interface Exercise {
  id: string;
  name: string;
  sets: string;           // "3", "3-4", "2-3"
  reps: string;           // "8-12", "10-15"
  weight: string;         // carga atual
  completed: boolean;
  performedReps: string[]; // array de reps por série ["12","10","8"]
  notes: string;
  rir: string;            // "3", "2-3"
  cadence: string;        // "3-1-1", "2-1-2"
  restSeconds: number;    // 60, 90, 120
  linkedToNext: boolean;  // superset link
}
```

### 2.2 Program (programa/mesociclo)
```typescript
interface Program {
  id: string;
  name: string;
  startDate: string;
  endDate: string;        // "" = ativo
  workouts: WorkoutMap;   // { "D1 - Peito": [Exercise], "D2 - Perna": [...] }
  objectives: string;     // texto livre com regras, RIR, prioridades
}
```

### 2.3 WorkoutSession (sessão concluída — snapshot)
```typescript
interface WorkoutSession {
  id: string;
  programId: string;
  programName: string;
  dayTab: string;
  completedAt: string;       // ISO date
  durationSeconds: number;
  generalNotes: string;
  exercises: CompletedExerciseSnapshot[];
}
```

### 2.4 WorkoutHistory (histórico aninhado)
```typescript
interface WorkoutHistory {
  [programId: string]: {
    [dayTab: string]: WorkoutSession[];
  };
}
```

### 2.5 UserProfile
```typescript
interface UserProfile {
  displayName: string;
  weight: string;
  height: string;
  age: string;
  goal: string;
}
```

### 2.6 WeeklyReviewData (gerado por IA)
```typescript
interface WeeklyReviewData {
  summary: string;
  consistencyScore: number;
  highlight: string;
  improvementArea: string;
  motivationalQuote: string;
}
```

### 2.7 Backup JSON (formato de exportação)
```typescript
interface GymFlowBackup {
  version: 1;
  exportedAt: string;
  programs: Program[];
  workoutNotes: WorkoutNotes;
  workoutHistory: WorkoutHistory;
  userProfile: UserProfile;
}
```

---

## 3. Fluxos Principais

### Fluxo A: Criar e executar programa
1. Dashboard → ProgramList → Criar (manual/IA/Fase1)
2. ProgramDaysManager → selecionar dia → WorkoutTracker
3. WorkoutTracker: marcar sets, reps, carga, RIR, cadência, notas
4. Finalizar → snapshot salvo em WorkoutHistory

### Fluxo B: Análise e revisão
1. WeeklyReview: compila dados → chama Gemini → exibe análise
2. WorkoutCalendar: visualiza sessões passadas por data
3. WorkoutTracker: mostra exercício anterior (findPreviousExerciseSnapshot)

### Fluxo C: Persistência
1. App.tsx: estado central em `useState` + `localStorage`
2. Firebase: `onSnapshot` listeners sincronizam com Firestore
3. Path: `artifacts/{appId}/users/{uid}/programs|notes|profile|history`
4. Offline-first: localStorage sempre atualizado, Firebase espelhado

### Fluxo D: Backup
1. `handleExportBackup`: serializa tudo → JSON → Blob → download
2. `handleImportBackup`: FileReader → JSON.parse → setState + sync Firebase

---

## 4. O que já existe (respondendo às perguntas)

### 4.1 Como os treinos são armazenados?
- **Estrutura de dados:** `Program.workouts` é um mapa `{ dayKey: Exercise[] }`
- **Persistência:** localStorage (`gymflow_programs`) + Firestore (`artifacts/{appId}/users/{uid}/programs/{programId}`)
- **Histórico:** `WorkoutHistory` aninhado por `programId → dayTab → WorkoutSession[]`

### 4.2 Como exercícios, séries, repetições e cargas são representados?
- `Exercise.sets`: string ("3", "3-4", "2-3") — sem tipagem forte de número
- `Exercise.reps`: string ("8-12", "10-15") — ranges textuais
- `Exercise.weight`: string (número como texto, ex: "80", "12.5")
- `Exercise.performedReps`: string[] — array de reps executadas (ex: ["12","10","8"])
- **Problema:** Sets, reps e weight são strings. Cálculos numéricos exigem parsing. Não há validação de tipo.

### 4.3 Já existe registro de RIR ou RPE?
- ✅ **SIM.** `Exercise.rir` (string) — campo presente no tipo, no template e no tracker.
- Pedro já registra RIR nos treinos (ex: "3", "2-3", "1-2").
- O template Fase 1 define progressão de RIR por semana (3→2-3→1-2→4-5 deload).
- ⚠️ RIR é armazenado como string, não validado contra ranges esperados.

### 4.4 Existe estrutura para mesociclos?
- ❌ **NÃO como conceito de primeira classe.**
- `Program` tem `startDate`/`endDate` mas sem noção de semanas, fases ou periodização.
- A estrutura `objectives` (texto livre) é usada como "parking lot" para regras de RIR.
- Não há tracking de qual semana do mesociclo o usuário está.
- Não há conceito de deload automático.

### 4.5 Onde são registrados treinos realizados?
- `WorkoutHistory`: `{ programId: { dayTab: [WorkoutSession] } }`
- `WorkoutSession`: snapshot completo do treino (exercícios, reps, cargas, RIR, notas, duração)
- **Problema:** O histórico é um snapshot do momento — não há ligação reversa com o exercício de origem para tracking de progressão sem fuzzy matching.

### 4.6 Quais serviços acessam o Firestore?
- `services/firebase.ts`: inicialização do app Firebase, Auth, Firestore
- `App.tsx`: 4 listeners `onSnapshot` (programs, notes, profile, history)
- Operações: `setDoc` (create/update), `deleteDoc`, `onSnapshot` (real-time)
- Auth: `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `signOut`

### 4.7 Quais partes já fazem análise ou progressão?
| Funcionalidade | Arquivo | Como funciona |
|---|---|---|
| Sugestão de carga | `utils/loadSuggestion.ts` | `currentLoad * 1.025` a `currentLoad * 1.05` |
| Exercício anterior | `utils/workoutHistory.ts` | Fuzzy match por nome (75% tokens) |
| Análise semanal | `services/geminiService.ts` | Prompt → Gemini → JSON com score |
| Geração de programa | `services/geminiService.ts` | Prompt → Gemini → JSON com workouts |
| Dicas de exercício | `services/geminiService.ts` | Prompt → Gemini → texto |
| Refeição pós-treino | `services/geminiService.ts` | Prompt → Gemini → texto |
| Cálculo de volume | `WorkoutCalendar.tsx` / `ProgramDaysManager.tsx` | `weight × reps` (duplicado em 2 lugares!) |

- ⚠️ O cálculo de volume (`weight × sum(reps)`) está **duplicado** em `WorkoutCalendar.tsx` e `ProgramDaysManager.tsx`.
- ⚠️ A sugestão de carga é puramente mecânica (+2.5% a +5%) — sem considerar RIR, histórico de falha, ou volume landmarks.

### 4.8 Onde a lógica de hipertrofia deve ser integrada?
- **NÃO duplicar:** cálculo de volume, histórico de exercícios, sugestão de carga
- **Ampliar:** `utils/` com funções puras de análise (volume por músculo, progressão, RIR tracking)
- **Novo:** `services/ai/` com camada de coaching que não depende da UI
- **Novo:** `.hermes/skills/hipertrofia/` com conhecimento científico + scripts de análise
- **Integrar:** `types.ts` — expandir `Program` com `mesocycle`, `week`, `deloadWeek`
- **Preservar:** toda a UI existente — o agente não substitui o tracker, o complementa

---

## 5. Problemas Estruturais Identificados

| # | Problema | Impacto | Sugestão |
|---|----------|---------|----------|
| 1 | `sets`, `reps`, `weight`, `rir` são **strings** | Toda operação matemática exige `parseFloat`. Frágil. | Adicionar getters numéricos ou normalizar no parse. |
| 2 | Cálculo de volume **duplicado** em 2 componentes | Divergência de lógica. DRY violado. | Extrair para `utils/volume.ts`. |
| 3 | RIR sem validação | Usuário pode digitar qualquer string. | Validar range 0-5 com warning visual. |
| 4 | Sem tracking de semana do mesociclo | IA não sabe em qual semana o usuário está. | Adicionar `currentWeek` e `deloadWeek` ao `Program`. |
| 5 | `objectives` como texto livre | Regras de periodização misturadas com notas soltas. | Estruturar: `objectives` + `periodization` no Program. |
| 6 | Fuzzy match pra histórico | Pode casar exercícios errados (ex: "supino" vs "supino inclinado"). | Adicionar `exerciseId` estável ou slug. |
| 7 | Sem classificação de grupos musculares | IA não sabe quais músculos cada exercício trabalha. | Adicionar `muscleGroup` ao Exercise ou lookup table. |
| 8 | Sem tracking de progressão por músculo | Não sabe se peito está evoluindo vs estagnado. | Analytics layer em `utils/`. |
| 9 | UserProfile não usado na prática | Dados de perfil não alimentam nenhuma lógica. | Usar peso corporal em métricas relativas (volume/kg). |
| 10 | App.tsx: 508 linhas, state manager monolítico | Difícil adicionar novo estado (mesociclo, analytics). | Extrair para hook `useGymFlow` ou Context. |

---

## 6. Arquivos que Devem Ser Preservados

| Arquivo | Motivo |
|---------|--------|
| `types.ts` | Base de todos os tipos. Só expandir, nunca remover campos. |
| `App.tsx` | State manager central. Extrair lógica, mas preservar fluxo de dados. |
| `services/firebase.ts` | Config de auth e Firestore. Intocável. |
| `firestore.rules` | Segurança. Não modificar sem entender implicações. |
| `components/WorkoutTracker.tsx` | Coração do app. Interface de treino completa. |
| `components/ProgramDaysManager.tsx` | Export PDF + gestão de splits. |
| `components/WorkoutCalendar.tsx` | Visualização de histórico. |
| `data/workoutTemplates.ts` | Template Fase 1 de referência. Pode ser base para novos templates. |

---

## 7. Arquivos que Podem Ser Ampliados

| Arquivo | Ampliação |
|---------|----------|
| `types.ts` | Adicionar `MesocycleConfig`, `MuscleGroup`, `VolumeMetrics` |
| `utils/loadSuggestion.ts` | Adicionar RIR gating à sugestão de carga |
| `utils/workoutHistory.ts` | Adicionar tracking de progressão (delta entre sessões) |
| `services/geminiService.ts` | Adicionar prompt com contexto de hipertrofia + perfil do Pedro |
| `App.tsx` | Adicionar estado de analytics/mesociclo |

---

## 8. Arquivos Novos Estritamente Necessários

### Essenciais (Fase 1 mínima)

| Arquivo | Função |
|---------|--------|
| `utils/volume.ts` | Cálculo de volume (extrair duplicação) |
| `utils/muscleGroups.ts` | Classificação de exercícios por grupo muscular |
| `utils/progression.ts` | Lógica de progressão com RIR gating |
| `types.ts` (ampliado) | Adicionar `MuscleGroup`, `VolumeData` |

### Expansão (Fase 2)

| Arquivo | Função |
|---------|--------|
| `services/ai/coach.ts` | Camada de coaching IA com prompts estruturados |
| `services/ai/analyzer.ts` | Análise de volume, progressão, consistência |
| `.hermes/skills/hipertrofia/SKILL.md` | Skill de hipertrofia do Hermes (já existe `gymflow-coach`) |

### Scripts (Fase 3)

| Arquivo | Função |
|---------|--------|
| `.hermes/skills/hipertrofia/scripts/analyze.py` | Análise offline dos dados exportados |

---

## 9. Resumo para Decisão

| Pergunta | Resposta |
|----------|----------|
| Armazenamento de treinos? | `Program.workouts` (editável) + `WorkoutHistory` (snapshots) |
| Sets/reps/carga? | Strings (frágil mas funcional) |
| RIR/RPE? | ✅ RIR existe como string. RPE não. |
| Mesociclos? | ❌ Não como estrutura. Só via `objectives` texto livre. |
| Treinos realizados? | `WorkoutHistory` snapshot |
| Acesso Firestore? | `services/firebase.ts` + `App.tsx` listeners |
| Análise existente? | Carga (+2.5-5%), volume (duplicado), review IA (Gemini) |
| Onde integrar? | `utils/` para lógica pura, `services/ai/` para IA, `.hermes/` para skill |
