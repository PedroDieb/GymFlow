# Auditoria — wger (wger-project/wger)

**Fonte:** https://github.com/wger-project/wger
**Licença:** AGPL-3.0
**Stack:** Python + Django REST Framework + Angular
**Estrelas:** 6,551
**Tagline:** "Self hosted FLOSS fitness/workout, nutrition and weight tracker"

---

## 1. Visão Geral

wger é o projeto mais maduro e estabelecido dos três (6.5k estrelas, 10+ anos de desenvolvimento). É um sistema completo de gestão de fitness: exercícios, treinos, nutrição, peso corporal. Self-hosted com Django backend + REST API.

---

## 2. Estrutura de Dados (Modelos Django)

### 2.1 Exercise (Catálogo de Exercícios)
- Base de dados extensa de exercícios
- Cada exercício tem: nome, descrição, categoria, músculos (primário/secundário), equipamento
- Imagens e vídeos associados
- API REST pública para consulta

### 2.2 Workout / Routine
- Workout = template de treino (similar ao `Program` do GymFlow)
- Contém múltiplos dias (Days)
- Cada dia contém sets de exercícios

### 2.3 Set / Setting
- `reps`: número de repetições
- `weight`: carga
- `sets`: número de séries
- `order`: ordem no treino
- `comment`: notas

### 2.4 Workout Session (Log)
- Sessão executada a partir de um Workout
- Registra data, duração, notas
- Contém `WorkoutLog` entries com reps/weight reais

### 2.5 Progression
- wger NÃO tem sistema de progressão automática
- Não tem RIR, RPE, ou mesociclos
- Progressão é manual (usuário ajusta sets/reps/weight)

### 2.6 Nutrition
- Sistema completo de tracking nutricional
- Base de dados de alimentos
- Planos de refeição

---

## 3. Conceitos Relevantes para o GymFlow

### 3.1 REST API
wger expõe uma REST API completa documentada em:
`https://wger.de/api/v2/`

Endpoints relevantes:
- `GET /api/v2/exercise/` — catálogo de exercícios
- `GET /api/v2/exerciseimage/` — imagens de exercícios
- `GET /api/v2/exercisevideo/` — vídeos
- `GET /api/v2/muscle/` — lista de músculos
- `GET /api/v2/equipment/` — equipamentos

**Isso é relevante porque o GymFlow poderia consumir essa API para obter dados de exercícios**, em vez de manter um catálogo próprio. Porém, wger requer self-hosting ou usar a instância pública (wger.de).

### 3.2 Exercise Database
wger tem o catálogo de exercícios mais completo dos três projetos:
- 200+ exercícios
- Com imagens e vídeos
- Classificação por músculo e equipamento
- Licença de dados pode ser diferente do código (verificar)

### 3.3 Estrutura Workout → Day → Set
Similar ao GymFlow (`Program → WorkoutMap → Exercise[]`), mas com hierarquia mais explícita de 3 níveis.

---

## 4. Classificação para o GymFlow

| Componente | Classificação | Justificativa |
|-----------|--------------|---------------|
| Exercise Database (catálogo + imagens) | **Integrar por API** | Consumir `wger.de/api/v2/` para buscar exercícios e imagens. |
| Workout → Day → Set hierarquia | **Não utilizar** | GymFlow já tem estrutura equivalente. |
| REST API pública | **Integrar por API** | Usar como fonte de dados de exercícios. Opcional. |
| Sistema de progressão | **Não utilizar** | wger não tem progressão automática. |
| Tracking nutricional | **Não utilizar na Fase 1** | Fora do escopo imediato. |
| Django Admin / self-hosting | **Não utilizar** | GymFlow usa Firebase. |

---

## 5. O que Aproveitar

### 5.1 API de Exercícios (baixo acoplamento)
Se o GymFlow precisar de um catálogo de exercícios com imagens, consumir a API do wger é melhor que construir do zero. Exemplo:
```
GET https://wger.de/api/v2/exercise/?language=pt&limit=50
```

### 5.2 Estrutura de Dados de Músculos
A classificação de músculos do wger (com imagens anatômicas) é referência útil para o `muscleGroups.ts` do GymFlow.

### 5.3 O que NÃO copiar
- Código (AGPL-3.0)
- UI (Angular — stack completamente diferente)
- Sistema de autenticação (Django — GymFlow usa Firebase Auth)

---

## 6. API / Formato de Exportação
- REST API documentada em `/api/v2/`
- Export de treinos em formato JSON via API
- Suporte a CSV para dados nutricionais

---

## 7. Status da Licença
⚠️ **AGPL-3.0 para código.** Os dados de exercícios podem ter licença diferente (CC-BY-SA ou similar). Verificar antes de usar.

---

## 8. Nota sobre API
A instância pública `wger.de` está disponível, mas para uso em produção seria recomendado self-host. A API é gratuita para uso moderado. Isso adiciona uma dependência externa que pode não valer a pena para o GymFlow — o catálogo de exercícios que já temos na skill (`exercise-database.md`) é suficiente para o MVP.
