# Plano de Integração — Agente de Hipertrofia no GymFlow

**Data:** 2026-07-30
**Baseado em:** `estrutura-atual.md`, `myfit.md`, `liftosaur.md`, `wger.md`, `comparativo.md`

---

## Premissas

1. Não criar outro projeto — tudo dentro de `GymFlow/`
2. Não reescrever a aplicação — expandir, não substituir
3. Não trocar Firebase/Firestore
4. Não substituir a interface atual — o agente é uma camada de inteligência, não de UI
5. Não instalar dependências ainda — validar o plano primeiro
6. Aproveitar código existente ao máximo
7. Implementar em etapas pequenas e testáveis

---

## 1. Quais Arquivos Atuais Devem Ser Modificados

| Arquivo | Modificação | Etapa |
|---------|------------|-------|
| `types.ts` | Adicionar `MesocycleConfig`, `MuscleGroup`, `VolumeMetrics`, `ProgressionConfig` | 1 |
| `types.ts` | Adicionar `weeklyRIR`, `progressionMode`, `repRangeMin/Max` ao `Exercise` | 1 |
| `App.tsx` | Extrair `estimateVolume()` para `utils/volume.ts` (hoje duplicado) | 1 |
| `utils/loadSuggestion.ts` | Adicionar RIR gating: só sugerir aumento se RIR alvo foi atingido | 2 |
| `utils/workoutHistory.ts` | Adicionar `getProgressionDelta()` — diferença entre sessão atual e anterior | 3 |
| `services/geminiService.ts` | Adicionar `analyzeWorkout()` com contexto de hipertrofia | 4 |
| `data/workoutTemplates.ts` | Refatorar `createPhaseOneProgram()` para incluir `MesocycleConfig` | 5 |

---

## 2. Quais Arquivos Novos São Realmente Necessários

### Etapa 1 — Fundação (mínimo viável)

| Arquivo | Função | Tamanho estimado |
|---------|--------|-----------------|
| `utils/volume.ts` | `estimateVolume()`, `volumePerMuscle()`, `volumeByWeek()` | ~60 linhas |
| `utils/muscleGroups.ts` | Mapa de exercício → grupo muscular (lookup table) | ~80 linhas |

### Etapa 2 — Progressão

| Arquivo | Função | Tamanho estimado |
|---------|--------|-----------------|
| `utils/progression.ts` | `shouldIncreaseLoad()`, `suggestNextWeight()`, `calculateOverloadPct()` | ~70 linhas |

### Etapa 3 — Análise

| Arquivo | Função | Tamanho estimado |
|---------|--------|-----------------|
| `services/ai/analyzer.ts` | `analyzeVolume()`, `detectPlateau()`, `generateRecommendations()` | ~120 linhas |
| `services/ai/coach.ts` | `generateWeeklyReport()`, `suggestAdjustments()` | ~100 linhas |

### Etapa 4 — Scripts Hermes

| Arquivo | Função | Tamanho estimado |
|---------|--------|-----------------|
| `.hermes/skills/hipertrofia/SKILL.md` | Skill do Hermes com workflows de coaching | ~150 linhas |
| `.hermes/skills/hipertrofia/scripts/analyze_export.py` | Análise offline do backup JSON | ~100 linhas |

### Total: ~580 linhas de código novo (menos de 10% do código existente)

---

## 3. Como Separar Lógica Científica de Interface

```
┌─────────────────────────────────────────────────┐
│  UI Layer (components/)                         │
│  WorkoutTracker, WeeklyReview, Calendar         │
│  NÃO muda — só consome dados mais ricos         │
├─────────────────────────────────────────────────┤
│  State Layer (App.tsx hooks)                    │
│  Passa dados expandidos (MesocycleConfig, etc)  │
├─────────────────────────────────────────────────┤
│  SERVICES (nova camada)                         │
│  services/ai/analyzer.ts  ← IA + ciência        │
│  services/ai/coach.ts     ← recomendações       │
│  services/geminiService.ts ← prompts melhorados │
├─────────────────────────────────────────────────┤
│  UTILS (lógica pura, sem React)                 │
│  utils/volume.ts          ← cálculos            │
│  utils/muscleGroups.ts    ← classificação        │
│  utils/progression.ts     ← regras de progressão │
├─────────────────────────────────────────────────┤
│  DATA (tipos + templates)                       │
│  types.ts                 ← modelos expandidos   │
│  data/workoutTemplates.ts ← templates c/ meso   │
├─────────────────────────────────────────────────┤
│  HERMES SKILL (fora do bundle React)            │
│  .hermes/skills/hipertrofia/  ← scripts Python  │
│  .hermes/skills/gymflow-coach/ ← já existe      │
└─────────────────────────────────────────────────┘
```

**Regra:** `utils/` nunca importa de `components/` ou `services/`. `services/` importa de `utils/` e `types.ts`. `components/` importa de `services/` e `utils/`.

---

## 4. Como Armazenar Perfil, Programa, Sessões e Revisões

### 4.1 Estrutura Firestore (já existe — expandir)

```
artifacts/{appId}/users/{uid}/
├── programs/{programId}          ← JÁ EXISTE (Program completo)
│   └── + MesocycleConfig         ← NOVO (embedado no Program)
├── notes/general_notes           ← JÁ EXISTE
├── profile/main                  ← JÁ EXISTE (UserProfile)
│   └── + trainingLevel, injuries ← NOVO (expandir)
├── history/workout_sessions      ← JÁ EXISTE (WorkoutHistory)
│   └── + perSession volume       ← NOVO (calculado, não armazenado)
└── reviews/{reviewId}            ← NOVO (WeeklyReviewData[])
```

### 4.2 MesocycleConfig embedado no Program
```typescript
interface Program {
  // ... campos existentes ...
  mesocycle?: {
    weekProgression: number[];     // RIR por semana
    currentWeek: number;
    deloadWeek?: number;
    startOverloadPct: number;
    volumeAdjustments?: Record<MuscleGroup, number>; // ajustes de volume
  };
}
```

**Decisão:** `MesocycleConfig` vai embedado no `Program`, não como coleção separada. Evita joins e mantém atomicidade.

### 4.3 WeeklyReview como subcoleção
```
reviews/{autoId}
├── programId: string
├── weekNumber: number
├── generatedAt: timestamp
├── consistencyScore: number
├── volumeByMuscle: Record<string, number>
├── loadTrends: LoadTrend[]
├── recommendations: Recommendation[]
└── aiRawResponse: string
```

---

## 5. Como Calcular Volume

### 5.1 Volume da Sessão (já existe — extrair)
```typescript
function estimateSessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce((total, ex) => {
    const weight = parseFloat(ex.weight);
    if (!isFinite(weight)) return total;
    const totalReps = ex.performedReps.reduce((sum, r) => sum + parseFloat(r || '0'), 0);
    return total + weight * totalReps;
  }, 0);
}
```
**Ação:** Mover de `WorkoutCalendar.tsx` e `ProgramDaysManager.tsx` (duplicado!) para `utils/volume.ts`.

### 5.2 Volume por Grupo Muscular (NOVO)
```typescript
function volumeByMuscleGroup(
  planExercises: Exercise[],
  muscleMap: Record<string, MuscleGroup>
): Record<MuscleGroup, number> {
  // Soma sets × peso médio por grupo muscular
}
```

### 5.3 Volume Semanal (NOVO)
```typescript
function weeklyVolume(
  program: Program,
  history: WorkoutHistory,
  week: number
): Record<MuscleGroup, number> {
  // Soma volume de todas as sessões da semana
}
```

---

## 6. Como Implementar Progressão

### 6.1 Modelo de Dupla Progressão (padrão ouro para hipertrofia)
```
1. Atingiu o topo da faixa de reps em TODAS as séries?
   → SIM: aumenta carga em +overloadPct%
   → NÃO: mantém carga, tenta adicionar reps

2. Atingiu o RIR alvo em TODAS as séries?
   → SIM: ok, segue o fluxo
   → NÃO (RIR abaixo do alvo = muito pesado): reduz carga
   → NÃO (RIR acima do alvo = muito leve): acelera progressão
```

### 6.2 Função Principal
```typescript
function getNextLoadSuggestion(
  currentExercise: Exercise,
  previousSnapshot: CompletedExerciseSnapshot | null,
  config: ProgressionConfig
): LoadSuggestion {
  // 1. Verifica se completou todas as séries dentro do rep range
  // 2. Verifica RIR vs target
  // 3. Retorna sugestão: aumentar, manter, ou reduzir
}
```
**Ação:** Expandir `utils/loadSuggestion.ts` (hoje só faz +2.5% a +5% cegamente).

### 6.3 Minimum Weight Change
```typescript
const EQUIPMENT_STEPS: Record<string, number> = {
  barbell: 2.5,
  dumbbell: 2,    // 1 kg por haltere = 2 kg total
  machine: 2.5,   // maioria das máquinas
  cable: 2.5,
  bodyweight: 1,
};
```

---

## 7. Como Validar o Treino

### 7.1 Validações em Tempo Real (UI)
- RIR fora do range esperado → warning visual (amarelo)
- Volume semanal acima do MRV → alerta (vermelho)
- Exercício sem classificação de grupo muscular → reminder

### 7.2 Validações Pós-Treino (Analyzer)
- `detectPlateau()`: mesma carga por 3+ sessões → sugerir variação
- `checkVolumeRamp()`: aumento de volume >20% em uma semana → alerta
- `checkDeloadDue()`: se RIR médio caiu 2+ pontos em 2 semanas → sugerir deload
- `checkSymmetry()`: volume de agonista/antagonista desbalanceado → alerta

### 7.3 Validação pelo Hermes (offline)
O script `analyze_export.py` valida o backup JSON contra os landmarks científicos e gera relatório.

---

## 8. Como o Hermes Acessará os Dados

### 8.1 Via JSON Export (caminho primário — já funciona)
1. Usuário exporta backup pelo app GymFlow
2. Salva em `~/Documentos/Github/GymFlow/backup/`
3. Hermes roda `read_data.py` → `analyze.py` → relatório
4. Skill `gymflow-coach` já implementa esse fluxo

### 8.2 Via Firebase (caminho futuro)
Se configurarmos Firebase Admin SDK com service account:
1. Hermes lê Firestore diretamente
2. Não precisa de export manual
3. ⚠️ Requer service account key (segurança)

### 8.3 Via Script Python (já existe)
```bash
python3 ~/.hermes/skills/fitness/gymflow-coach/scripts/read_data.py
python3 ~/.hermes/skills/fitness/gymflow-coach/scripts/analyze.py backup.json
```

---

## 9. Como Evitar Que o LLM Tome Decisões Matemáticas Sem Verificação

**Regra de ouro:** O LLM (Gemini ou Hermes) NUNCA calcula. Ele apenas interpreta resultados pré-calculados.

### 9.1 Arquitetura de Segurança Matemática

```
                  ┌──────────────┐
                  │   DADOS BRUTOS │
                  │ (Firestore/JSON)│
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  utils/*.ts   │  ← CÁLCULOS DETERMINÍSTICOS
                  │  volume.ts    │     (TypeScript, testável)
                  │  progression.ts│
                  │  analyzer.ts  │
                  └──────┬───────┘
                         │ resultados numéricos
                  ┌──────▼───────┐
                  │  LLM (Gemini) │  ← SÓ INTERPRETA
                  │  "Seu volume   │     (nunca calcula)
                  │   de peito     │
                  │   está em 12   │
                  │   séries/sem"  │
                  └──────────────┘
```

### 9.2 Implementação
- `services/ai/analyzer.ts`: funções puras que retornam números. Testáveis com Jest.
- `services/ai/coach.ts`: recebe números do analyzer, monta prompt para o LLM.
- O LLM recebe: "Volume peito: 12 sets (MAV: 10-16). RIR médio: 2.3. Progressão: +5%."
- O LLM NUNCA recebe dados brutos de sets/reps para calcular sozinho.

### 9.3 Validação em 3 Camadas
1. **TypeScript:** tipos fortes impedem `"12"` onde deveria ser `12`
2. **Testes unitários:** `volume.test.ts`, `progression.test.ts`
3. **Analyzer determinístico:** mesmos inputs = mesmos outputs, sempre

---

## 10. Como Implementar em Etapas Pequenas

### Etapa 1: Fundação (1-2 horas)
**Objetivo:** Tipagem + utilitários de volume. Zero mudança visual.

| Ação | Arquivos |
|------|----------|
| Adicionar `MuscleGroup`, `MesocycleConfig`, `ProgressionConfig` | `types.ts` |
| Extrair `estimateVolume()` duplicado → `utils/volume.ts` | `utils/volume.ts` (novo), `WorkoutCalendar.tsx`, `ProgramDaysManager.tsx` |
| Criar lookup table exercício → músculo | `utils/muscleGroups.ts` (novo) |
| `npm run build` — verificar que não quebrou nada | — |

### Etapa 2: Progressão Inteligente (1-2 horas)
**Objetivo:** Sugestão de carga que considera RIR.

| Ação | Arquivos |
|------|----------|
| Adicionar `targetRIR`, `weekNumber` ao contexto de progressão | `types.ts` |
| Expandir `getNextLoadSuggestion()` com RIR gating | `utils/loadSuggestion.ts` |
| `npm run build` — verificar | — |

### Etapa 3: Análise de Volume (1-2 horas)
**Objetivo:** Volume por grupo muscular visível no app.

| Ação | Arquivos |
|------|----------|
| `volumeByMuscleGroup()` e `weeklyVolume()` | `utils/volume.ts` |
| Hook `useVolumeAnalytics(program, history)` | `App.tsx` (ou novo hook) |
| Exibir volume na tela de Review (opcional) | `WeeklyReview.tsx` |

### Etapa 4: Serviço de IA Melhorado (2-3 horas)
**Objetivo:** Análises de hipertrofia com contexto científico.

| Ação | Arquivos |
|------|----------|
| `analyzeWorkout()` com prompt enriquecido | `services/geminiService.ts` |
| `generateMesocycleProgression()` com RIR array | `services/ai/coach.ts` (novo) |
| `detectPlateau()`, `checkVolumeRamp()` | `services/ai/analyzer.ts` (novo) |

### Etapa 5: Templates com Mesociclo (1 hora)
**Objetivo:** Programas que já nascem com estrutura de periodização.

| Ação | Arquivos |
|------|----------|
| `createPhaseOneProgram()` com `MesocycleConfig` | `data/workoutTemplates.ts` |
| `createPhaseTwoProgram()` (novo template) | `data/workoutTemplates.ts` |

### Etapa 6: Script Hermes (1 hora)
**Objetivo:** Análise offline completa.

| Ação | Arquivos |
|------|----------|
| Skill de hipertrofia com workflows | `.hermes/skills/hipertrofia/SKILL.md` (novo) |
| Script de análise do export JSON | `.hermes/skills/hipertrofia/scripts/analyze_export.py` |

---

## Resumo: Primeira Alteração Recomendada

**Etapa 1 — Extrair `estimateVolume()` e criar `utils/muscleGroups.ts`**

### Arquivos afetados:
1. **NOVO:** `utils/volume.ts` — função `estimateSessionVolume()` extraída
2. **NOVO:** `utils/muscleGroups.ts` — lookup table exercício → grupo muscular
3. **MODIFICAR:** `types.ts` — adicionar `MuscleGroup` enum
4. **MODIFICAR:** `components/WorkoutCalendar.tsx` — importar de `utils/volume.ts`
5. **MODIFICAR:** `components/ProgramDaysManager.tsx` — importar de `utils/volume.ts`
6. **VERIFICAR:** `npm run build` — garantir zero erros

### O que NÃO muda:
- Nenhuma UI visível
- Nenhum comportamento de usuário
- Firebase/Firestore intactos
- WorkoutTracker intacto

### Por que começar por aqui:
- Resolve duplicação de código (problema #2 da auditoria)
- Estabelece o padrão `utils/` para lógica pura
- Cria a fundação para todas as etapas seguintes
- Zero risco — é refatoração, não funcionalidade nova
