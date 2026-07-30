# Comparativo — Liftosaur vs MyFit vs wger vs GymFlow

**Objetivo:** Identificar o que cada projeto externo contribui para o GymFlow, evitando duplicação e violação de licença.

---

## 1. Tabela Comparativa

| Característica | GymFlow (atual) | MyFit | Liftosaur | wger |
|---------------|-----------------|-------|-----------|------|
| **Linguagem** | TypeScript | TypeScript | TypeScript | Python |
| **Framework** | React + Vite | SvelteKit | React Native | Django + Angular |
| **Banco** | Firebase Firestore | CockroachDB + Prisma | AsyncStorage local | PostgreSQL |
| **Licença** | Privado (?) | AGPL-3.0 | AGPL-3.0 | AGPL-3.0 |
| **RIR tracking** | ✅ (string) | ✅ (Int, tipado) | ❌ (usa RPE) | ❌ |
| **Mesociclo** | ❌ | ✅ (completo) | ✅ (via scripts) | ❌ |
| **Progressão auto** | Parcial (+2.5-5% carga) | ✅ (changeType/Amount) | ✅ (Liftoscript DSL) | ❌ |
| **Volume landmarks** | ❌ | ✅ (cyclic set changes) | ❌ | ❌ |
| **Deload** | ❌ | ✅ (RIR array) | ✅ (via script) | ❌ |
| **Top/Backoff sets** | ❌ | ✅ | ❌ | ❌ |
| **Myo-reps** | ❌ | ✅ | ❌ | ❌ |
| **Catálogo exercícios** | Manual (template) | Básico | 200+ tipos | 200+ com imagens |
| **Classificação muscular** | ❌ | ✅ (MuscleGroup enum) | ✅ (synergists) | ✅ |
| **Histórico** | ✅ (snapshot) | ✅ (completo) | ✅ (com script engine) | ✅ (log básico) |
| **Export JSON** | ✅ | Via web | ✅ (JSON interno) | ✅ (REST API) |
| **API pública** | ❌ | ❌ (tRPC interno) | ❌ | ✅ (REST) |
| **PWA** | ✅ | ✅ | ✅ | ❌ (web app) |
| **Self-hosted** | ❌ (Firebase) | ✅ | N/A (app nativo) | ✅ |

---

## 2. Matriz de Aproveitamento

### 2.1 O que MyFit contribui (MAIOR RELEVÂNCIA)

| Conceito | Como aplicar no GymFlow | Prioridade |
|----------|------------------------|-----------|
| `Mesocycle.RIRProgression: Int[]` | Adicionar `weekProgression` ao `Program` | 🔴 Alta |
| `MesocycleExerciseTemplate` (repRanges + changeType) | Adicionar `progressionMode` ao `Exercise` | 🔴 Alta |
| `MesocycleCyclicSetChange` (volume auto) | Criar `utils/volumeProgression.ts` | 🟡 Média |
| Tipagem forte (reps/load/RIR como number) | Migrar campos de string → number no `Exercise` | 🟡 Média |
| `minimumWeightChange` | Adicionar ao `Exercise` ou como config global | 🟢 Baixa |
| `TOP_BACKOFF` / `MYO_REP` set types | Postergar para Fase 3+ | ⚪ Futuro |

### 2.2 O que Liftosaur contribui

| Conceito | Como aplicar no GymFlow | Prioridade |
|----------|------------------------|-----------|
| Exercise database (200+ tipos com músculos) | Expandir `data/exerciseDb.ts` ou consumir wger API | 🟡 Média |
| Arredondamento de carga por equipamento | `utils/loadSuggestion.ts` com step de equipamento | 🟢 Baixa |
| Expressões de peso (ex: "80% 1RM") | Campo `weightMode: 'absolute' | 'percentage'` | 🟢 Baixa |
| RPE ↔ %1RM | Se adicionar RPE no futuro | ⚪ Futuro |
| Liftoscript DSL | ❌ Não — complexo demais | ⚫ Não |

### 2.3 O que wger contribui

| Conceito | Como aplicar no GymFlow | Prioridade |
|----------|------------------------|-----------|
| Catálogo de exercícios com imagens | Consumir REST API (opcional, baixa prioridade) | 🟢 Baixa |
| Classificação de músculos | Referência para `utils/muscleGroups.ts` | 🟡 Média |
| Estrutura Workout→Day→Set | GymFlow já tem. Confirmar alinhamento. | ⚪ N/A |

---

## 3. O Que NÃO Usar de Nenhum Projeto

| Razão | Projetos afetados |
|-------|------------------|
| **Licença AGPL-3.0** — todo código é contaminante | MyFit, Liftosaur, wger |
| **Stack incompatível** — Python/Django, SvelteKit, React Native | MyFit (Svelte), wger (Django), Liftosaur (RN) |
| **Complexidade excessiva** — Liftoscript DSL | Liftosaur |
| **Funcionalidades não prioritárias** — nutrição, myo-reps, top/backoff | MyFit (avançado), wger (nutrição) |

---

## 4. Decisões de Arquitetura

### 4.1 Mesociclo → Programa
O `Program` do GymFlow será expandido com:
```typescript
interface MesocycleConfig {
  weekProgression: number[];   // RIR por semana (ex: [3, 2, 2, 1])
  currentWeek: number;         // semana atual (1-indexed)
  deloadWeek?: number;         // última semana antes do deload (ex: 5)
  startOverloadPct: number;    // % de aumento inicial (ex: 2.5)
}
```

### 4.2 Progressão por Exercício
Campos a adicionar ao `Exercise`:
```typescript
interface ExerciseProgression {
  progressionMode: 'weight' | 'reps' | 'density' | 'sets';
  minWeightChange: number;     // incremento mínimo (ex: 2.5 para kg)
  overloadPct: number;         // % de aumento quando completar (ex: 2.5)
  repRangeMin: number;         // faixa mínima de reps
  repRangeMax: number;         // faixa máxima de reps
  targetRIR: number;           // RIR alvo para esta semana
}
```

### 4.3 Volume por Grupo Muscular
Novo utilitário `utils/volume.ts`:
```typescript
function calculateWeeklyVolume(
  program: Program,
  muscleGroups: MuscleGroupMap
): Record<MuscleGroup, number>
```

---

## 5. Resumo: O Que Realmente Vamos Usar

| Fonte | O que | Como |
|-------|-------|-----|
| **MyFit** | Estrutura de mesociclo com RIR array | Expandir `types.ts` com `MesocycleConfig` |
| **MyFit** | Separação progressão carga vs volume | Criar `utils/progression.ts` |
| **MyFit** | Tipagem forte para reps/load/RIR | Migrar campos string→number no Exercise |
| **Liftosaur** | Catálogo de músculos sinergistas | Referência para `utils/muscleGroups.ts` |
| **wger** | Classificação anatômica de músculos | Referência para `utils/muscleGroups.ts` |
| **Todos** | Conceitos, não código | Reimplementação independente |
