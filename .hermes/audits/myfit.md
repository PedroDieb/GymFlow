# Auditoria — MyFit (WhyAsh5114/MyFit)

**Fonte:** https://github.com/WhyAsh5114/MyFit
**Licença:** AGPL-3.0
**Stack:** SvelteKit + Prisma + CockroachDB + tRPC
**Estrelas:** 139
**Inspiração:** RP Hypertrophy App (Renaissance Periodization)

---

## 1. Visão Geral

MyFit é um tracker de treino web inspirado diretamente no app RP Hypertrophy. Suporta logging detalhado de reps, carga e RIR, com fórmulas de progressão automática embutidas. É o projeto externo mais relevante para o GymFlow por modelar explicitamente conceitos de hipertrofia científica.

---

## 2. Estrutura de Dados (Prisma Schema)

### 2.1 Mesocycle (Mesociclo)
```prisma
model Mesocycle {
  id                         String
  name                       String
  userId                     String
  exerciseSplitId            String?
  RIRProgression             Int[]       // Ex: [3, 2, 2, 1, 1, 4] — RIR por semana
  startOverloadPercentage    Float       // % de aumento inicial
  lastSetToFailure           Boolean     // Última série até falha?
  forceRIRMatching           Boolean     // Forçar matching de RIR em todas as séries
  mesocycleCyclicSetChanges  MesocycleCyclicSetChange[]  // Progressão automática de volume
}
```

**Destaque:** `RIRProgression` é um array de inteiros — cada posição = semana do mesociclo. Ex: `[3, 2, 2, 1, 1]` = 5 semanas com RIR 3→2→2→1→1.

### 2.2 MesocycleCyclicSetChange (Progressão de Volume)
```prisma
model MesocycleCyclicSetChange {
  muscleGroup          MuscleGroup
  setIncreaseAmount    Int        // Quantas séries adicionar por incremento
  maxVolume            Int        // Teto de volume (MRV)
  regardlessOfProgress Boolean    // Aumentar mesmo sem progresso?
}
```
Permite definir regras como "adicionar 1 série de peito a cada 2 semanas até máximo de 16 séries".

### 2.3 MesocycleExerciseTemplate (Exercício no Mesociclo)
```prisma
model MesocycleExerciseTemplate {
  name                 String
  targetMuscleGroup    MuscleGroup
  sets                 Int
  setType              SetType         // Enum: NORMAL, TOP_BACKOFF, MYO_REP
  repRangeStart        Int
  repRangeEnd          Int
  changeType           ChangeType?     // Como progredir
  changeAmount         Float?
  overloadPercentage   Float?
  lastSetToFailure     Boolean?
  forceRIRMatching     Boolean?
  minimumWeightChange  Float?
  topRepRangeStart     Int?            // Range da série top (top/backoff)
  topRepRangeEnd       Int?
}
```

### 2.4 WorkoutExerciseSet (Série Executada)
```prisma
model WorkoutExerciseSet {
  setIndex    Int
  reps        Int          // Tipagem forte! (não string)
  load        Float        // Tipagem forte!
  RIR         Int          // Tipagem forte!
  skipped     Boolean
  miniSets    WorkoutExerciseMiniSet[]
}
```

### 2.5 WorkoutExerciseMiniSet (Myo-Rep Match)
```prisma
model WorkoutExerciseMiniSet {
  miniSetIndex  Int
  reps          Int
  load          Float
  RIR           Int
  parentSet     WorkoutExerciseSet
}
```

---

## 3. Conceitos Relevantes para o GymFlow

### 3.1 Progressão em Duas Camadas
MyFit separa claramente:
- **Progressão de intensidade (carga/reps):** `changeType`, `changeAmount`, `overloadPercentage`, `minimumWeightChange`
- **Progressão de volume (séries):** `MesocycleCyclicSetChange` com `setIncreaseAmount` e `maxVolume`

### 3.2 Tipos de Set (SetType)
- `NORMAL`: séries tradicionais (todas com mesma carga)
- `TOP_BACKOFF`: série top pesada + backoff sets mais leves (método RP)
- `MYO_REP`: myo-reps com mini-sets (técnica avançada de intensidade)

### 3.3 RIR Matching
`forceRIRMatching`: quando ativo, todas as séries do exercício devem atingir o mesmo RIR. Se a primeira série foi RIR 2 e a segunda foi RIR 1, o sistema ajusta.

### 3.4 Minimum Weight Change
Evita progressões insignificantes (ex: aumentar 0.25 kg numa máquina que só aceita incrementos de 2.5 kg).

---

## 4. Classificação para o GymFlow

| Componente | Classificação | Justificativa |
|-----------|--------------|---------------|
| Modelo Mesocycle + RIRProgression array | **Reimplementar** | Conceito essencial. Adaptar ao `Program` do GymFlow. |
| MesocycleExerciseTemplate (rep ranges + changeType) | **Reimplementar** | Adaptar ao `Exercise` existente, adicionando campos de progressão. |
| WorkoutExerciseSet (reps/load/RIR tipados) | **Reimplementar** | No GymFlow são strings — ideal migrar para números. |
| MesocycleCyclicSetChange | **Adaptar como conceito** | Progressão de volume automática. Pode ser simplificada. |
| TOP_BACKOFF e MYO_REP set types | **Não utilizar na Fase 1** | Avançado. Pode vir depois. |
| Mini-sets (myo-rep match) | **Não utilizar na Fase 1** | Avançado. |
| Prisma/CockroachDB | **Não utilizar** | GymFlow usa Firebase. |

---

## 5. O que Aproveitar

### 5.1 Conceitos (sem copiar código — AGPL-3.0)
- Estrutura de mesociclo com progressão de RIR por semana
- Separação entre progressão de carga e progressão de volume
- Tipagem forte para reps/load/RIR (number, não string)
- Conceito de `minimumWeightChange` para evitar micro-progressões
- `setType` como extensão futura

### 5.2 O que NÃO copiar
- Código fonte (AGPL-3.0 — incompatível se GymFlow não for open source)
- Estrutura exata de tabelas/relacionamentos
- UI/components específicos

---

## 6. API / Formato de Exportação
MyFit usa tRPC para comunicação frontend-backend. Não tem API REST pública documentada. Exportação via interface web.

---

## 7. Status da Licença
⚠️ **AGPL-3.0** — requer que qualquer trabalho derivado também seja open source sob AGPL-3.0. **Não copiar código diretamente.** Usar apenas como referência conceitual.
