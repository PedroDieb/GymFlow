# Auditoria — Liftosaur (astashov/liftosaur)

**Fonte:** https://github.com/astashov/liftosaur
**Licença:** AGPL-3.0
**Stack:** TypeScript + React Native + valibot + Lens
**Estrelas:** 639
**Tagline:** "Weightlifting tracker app for coders"

---

## 1. Visão Geral

Liftosaur é um app de tracking de musculação com um diferencial único: **Liftoscript** — uma linguagem de scripting embutida que permite programar regras de progressão de forma declarativa. É essencialmente "treino como código". O app é maduro (639 estrelas, multi-plataforma), mas a complexidade do DSL o torna nichado.

---

## 2. Estrutura de Dados

### 2.1 Tipos Fortes com Valibot
Liftosaur usa a biblioteca `valibot` para validação de tipos em runtime. Todos os modelos são tipados e validados.

### 2.2 ProgramSet (Série Programada)
```typescript
// Conceitos extraídos do código:
IProgramSet {
  weightExpr: string;     // Expressão de peso (ex: "95%", "state.weight + 5lb")
  repsExpr: string;       // Expressão de reps (ex: "8-12", "12")
  rpeExpr?: string;       // Expressão de RPE
  isAmrap: boolean;       // AMRAP (As Many Reps As Possible)
  logRpe?: boolean;       // Registrar RPE após execução
}
```
**Destaque:** O uso de expressões permite lógica como "80% do 1RM" ou "carga da semana passada + 2.5 kg".

### 2.3 HistoryRecord / HistoryEntry
```typescript
IHistoryRecord {
  id: string;
  programId: string;
  dayIndex: number;
  entries: IHistoryEntry[];  // Um entry por exercício
  date: string;              // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
}

IHistoryEntry {
  exercise: IExerciseType;
  sets: ISet[];             // Séries executadas
  variations?: IProgramExerciseVariation[];
}
```

### 2.4 ISet (Série Executada)
```typescript
ISet {
  reps: number;
  weight: IWeight;
  rpe?: number;
  isCompleted: boolean;
}
```

### 2.5 Progress Engine
O módulo `progress.ts` contém a lógica central de progressão:
- `Progress_getEntryId`: busca histórico do exercício
- `Progress_runUpdateScriptForEntry`: executa script de progressão após completar série
- `Progress_createScriptBindings`: cria bindings para o DSL (state, weights, RM, etc.)
- `Progress_getDayData`: compila dados do dia para scripts

### 2.6 Weight System
Sistema sofisticado de pesos:
- `Weight_evaluateWeight`: resolve expressões de peso
- `Weight_rpePct`: converte RPE para % de 1RM
- `Weight_roundConvertTo`: arredonda para incrementos disponíveis
- Suporte a unidades: kg, lb, % (percentual de 1RM)

### 2.7 Exercise Type System
Enum com 200+ exercícios categorizados (`exerciseTypes` const array) e 50+ músculos (`availableMuscles`). Cada exercício tem `targetMuscles`, `synergistMuscles`, equipamento padrão.

---

## 3. Conceitos Relevantes para o GymFlow

### 3.1 Liftoscript — DSL de Progressão
Exemplo de script Liftoscript:
```
# Cada semana, aumentar 5 lb se completou todas as reps
if (completed && reps >= 12) {
  weight = weight + 5lb
}
```
**Avaliação:** Muito poderoso, mas excessivamente complexo para o GymFlow. O conceito de "progressão como regra parametrizável" é mais relevante que o DSL em si.

### 3.2 Weight como Expressão
A ideia de tratar weight como uma expressão avaliável (e não string fixa) é interessante. Permite "80% 1RM", "+2.5 kg da semana passada", etc.

### 3.3 RPE ↔ %1RM
Liftosaur tem conversão bidirecional entre RPE e percentual de 1RM, permitindo calcular carga alvo a partir de RPE alvo.

### 3.4 Exercise Database
Catálogo extenso com 200+ exercícios, cada um com:
- Músculos alvo e sinergistas
- Equipamento padrão
- Tipo de exercício (unilateral, peso corporal, etc.)

---

## 4. Classificação para o GymFlow

| Componente | Classificação | Justificativa |
|-----------|--------------|---------------|
| Modelo ProgramSet (expressões) | **Adaptar como conceito** | Expressões são overkill. Usar parâmetros simples (targetRIR, overloadPct). |
| Weight System (RPE→1RM, arredondamento) | **Reimplementar conceito** | Arredondamento de carga para equipamento disponível. |
| HistoryRecord / Progress Engine | **Adaptar como conceito** | GymFlow já tem WorkoutHistory. Melhorar com delta tracking. |
| Exercise Database (200+ exercícios) | **Reimplementar como referência** | Já temos `exercise-database.md` na skill. Expandir com sinergistas. |
| Liftoscript DSL | **Não utilizar** | Complexidade desnecessária. Regras declarativas bastam. |
| RPE (não RIR) | **Não utilizar** | GymFlow usa RIR. Conceitos similares mas RIR é mais direto. |
| valibot runtime validation | **Não utilizar** | TypeScript basta para GymFlow. |
| React Native / mobile | **Não utilizar** | GymFlow é web. |

---

## 5. O que Aproveitar

### 5.1 Conceitos (sem copiar código — AGPL-3.0)
- Catálogo extenso de exercícios com músculos alvo/sinergistas
- Arredondamento inteligente de carga (para incrementos de equipamento)
- Histórico como fonte para scripts de progressão
- Conversão RPE/RIR ↔ %1RM (se quisermos adicionar no futuro)
- Sistema de expressões para weight/reps como parâmetros (versão simplificada)

### 5.2 O que NÃO copiar
- Liftoscript DSL (AGPL + complexidade)
- Código fonte
- UI/componentes

---

## 6. API / Formato de Exportação
Liftosaur tem `Exporter_toFile` que gera JSON com todo o histórico. Formato interno, não documentado publicamente.

---

## 7. Status da Licença
⚠️ **AGPL-3.0** — mesma restrição do MyFit. **Não copiar código.**
