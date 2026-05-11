import { Exercise, Program } from '../types';

type ExerciseTemplate = {
  name: string;
  sets: string;
  reps: string;
  notes: string;
  rir?: string;
  cadence?: string;
  restSeconds?: number;
};

const getSetCount = (sets: string): number => {
  const numbers = sets.match(/\d+/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : 3;
};

const makeExercise = ({
  name,
  sets,
  reps,
  notes,
  rir = '3',
  cadence = '3-1-1',
  restSeconds = 90,
}: ExerciseTemplate): Exercise => ({
  id: crypto.randomUUID(),
  name,
  sets,
  reps,
  weight: '',
  completed: false,
  performedReps: Array(getSetCount(sets)).fill(''),
  notes,
  rir,
  cadence,
  restSeconds,
  linkedToNext: false,
});

export const createPhaseOneProgram = (): Program => ({
  id: crypto.randomUUID(),
  name: 'Fase 1 - Instalacao / Hipertrofia',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  objectives:
    'Frequencia-alvo: 5x/semana. Piso valido: 3x/semana. Semana caotica: 2x, sem culpa. Objetivo: consistencia, tecnica e tolerancia, nao PR.\n\n' +
    'RIR: semana 1 RIR 3; semana 2 RIR 2-3; semana 3 RIR 1-2 sem falhar de verdade; semana 4 deload com RIR 4-5 e metade do volume.\n\n' +
    'Cadencia: principais 3-1-1; isoladores 2-1-2; core/isometrias 10-20s.\n\n' +
    'Regras: peito com ROM seguro; se doer no fundo, encurte ROM e depois reduza carga. Dor >2/10 = nao progride. Lombar/L4 sensivel: reduza hinge/RDL e use flexora extra ou mais hip thrust.',
  workouts: {
    'D1 - Inferior A': [
      makeExercise({
        name: 'Leg press 45',
        sets: '3-4',
        reps: '8-12',
        notes: 'Top set para anotar. Pes medios/baixos para mais quadriceps; descer controlado, sem tirar quadril do banco.',
        restSeconds: 120,
      }),
      makeExercise({
        name: 'Agachamento Smith ou Hack squat',
        sets: '3',
        reps: '8-10',
        notes: 'Top set para anotar. Tronco firme, amplitude segura, sem encaixar a lombar no fundo.',
        restSeconds: 120,
      }),
      makeExercise({
        name: 'Afundo bulgaro ou passada',
        sets: '2-3',
        reps: '8-12 cada perna',
        notes: 'Passo medio; foco em controle, nao em carga.',
      }),
      makeExercise({
        name: 'Cadeira extensora',
        sets: '3',
        reps: '12-15',
        notes: 'Segurar 1s no topo e descer controlando.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Abdutora',
        sets: '3',
        reps: '15-20',
        notes: 'Nao roubar com o tronco; pensar em abrir o joelho com o gluteo.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Panturrilha em pe ou sentado',
        sets: '3',
        reps: '10-15',
        notes: 'Pausa embaixo e em cima.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Dead bug ou prancha',
        sets: '2-3',
        reps: '10-20s ou reps controladas',
        notes: 'Core controlado, sem compensar com lombar.',
        cadence: '10-20s',
        restSeconds: 45,
      }),
    ],
    'D2 - Superior A': [
      makeExercise({
        name: 'Supino maquina convergente ou Smith',
        sets: '3',
        reps: '8-10',
        notes: 'ROM seguro: nao descer no ponto que da dor no peito. Dor >2/10 = nao progride.',
        restSeconds: 120,
      }),
      makeExercise({
        name: 'Supino inclinado com halteres ou maquina',
        sets: '2-3',
        reps: '8-12',
        notes: 'Escapulas encaixadas, cotovelo sem abrir demais.',
        restSeconds: 120,
      }),
      makeExercise({
        name: 'Puxada alta frente',
        sets: '3',
        reps: '8-12',
        notes: 'Peito aberto, puxar com cotovelos, nao com biceps.',
        restSeconds: 90,
      }),
      makeExercise({
        name: 'Remada sentada',
        sets: '3',
        reps: '8-12',
        notes: 'Segurar 1s contraindo costas, sem jogar lombar.',
        restSeconds: 90,
      }),
      makeExercise({
        name: 'Crucifixo ou crossover no cabo',
        sets: '2',
        reps: '12-15',
        notes: 'Amplitude confortavel; alongar sem rasgar o peito.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Elevacao lateral',
        sets: '3',
        reps: '12-20',
        notes: 'Cotovelo guia o movimento, sem trapezio dominar.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Triceps corda',
        sets: '2-3',
        reps: '10-15',
        notes: 'Cotovelo fixo e extensao completa.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
    ],
    'D3 - Inferior B': [
      makeExercise({
        name: 'Hip thrust',
        sets: '4',
        reps: '8-12',
        notes: 'Queixo levemente recolhido, costelas baixas, pausa no topo.',
        restSeconds: 120,
      }),
      makeExercise({
        name: 'Mesa flexora ou flexora sentada',
        sets: '3',
        reps: '10-15',
        notes: 'Descer lento, sem perder tensao.',
        cadence: '2-1-2',
        restSeconds: 75,
      }),
      makeExercise({
        name: 'RDL / levantamento terra romeno',
        sets: '2-3',
        reps: '8-10',
        notes: 'So se lombar estiver bem. Quadril vai para tras, coluna neutra, amplitude moderada. Se L4 cansar, trocar por flexora extra ou hip thrust.',
        restSeconds: 120,
      }),
      makeExercise({
        name: 'Glute kickback no cabo ou maquina',
        sets: '2-3',
        reps: '12-15 cada',
        notes: 'Movimento limpo, sem rodar quadril.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Leg press pes altos',
        sets: '2-3',
        reps: '10-12',
        notes: 'Mais posterior/gluteo; sem arredondar lombar no fundo.',
        restSeconds: 90,
      }),
      makeExercise({
        name: 'Panturrilha',
        sets: '3',
        reps: '10-15',
        notes: 'Pausa e controle.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'McGill core: curl-up, side plank ou bird dog',
        sets: '2-3',
        reps: '10-20s',
        notes: 'Fisioterapia ativa: controle sem transformar em tortura.',
        cadence: '10-20s',
        restSeconds: 45,
      }),
    ],
    'D4 - Superior B': [
      makeExercise({
        name: 'Puxada alta ou barra assistida',
        sets: '3',
        reps: '8-12',
        notes: 'Controle total, sem balancar.',
        restSeconds: 90,
      }),
      makeExercise({
        name: 'Remada com apoio no peito',
        sets: '3',
        reps: '8-12',
        notes: 'Apoiar o tronco para poupar lombar.',
        restSeconds: 90,
      }),
      makeExercise({
        name: 'Supino tecnico leve/maquina',
        sets: '2',
        reps: '10-12',
        notes: 'Peito sem dor, ROM seguro, foco em tecnica.',
        restSeconds: 90,
      }),
      makeExercise({
        name: 'Peck deck reverso',
        sets: '3',
        reps: '12-20',
        notes: 'Deltoide posterior; nao transformar em remada.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Elevacao lateral',
        sets: '3',
        reps: '12-20',
        notes: 'Volume estetico para ombro.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Rosca biceps',
        sets: '2-3',
        reps: '10-15',
        notes: 'Sem jogar o corpo.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Triceps testa/cabo',
        sets: '2-3',
        reps: '10-15',
        notes: 'Controle, sem irritar cotovelo.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Farmer hold',
        sets: '2-3',
        reps: '20-40s',
        notes: 'Antebraco + core; postura alta.',
        cadence: '20-40s',
        restSeconds: 60,
      }),
    ],
    'D5 - Extra estetico': [
      makeExercise({
        name: 'Supino maquina ou Smith',
        sets: '3',
        reps: '8-12',
        notes: 'Moderado, sem buscar PR. ROM seguro.',
        restSeconds: 120,
      }),
      makeExercise({
        name: 'Crossover ou crucifixo maquina',
        sets: '2-3',
        reps: '12-15',
        notes: 'Alongamento confortavel, sem dor profunda.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Hip thrust ou maquina de gluteo',
        sets: '3',
        reps: '10-12',
        notes: 'Pausa no topo, gluteo esmagando.',
        restSeconds: 120,
      }),
      makeExercise({
        name: 'Cadeira extensora',
        sets: '2-3',
        reps: '12-15',
        notes: 'Pump de quadriceps.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Abdutora',
        sets: '2-3',
        reps: '15-20',
        notes: 'Controle, sem pressa.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Elevacao lateral',
        sets: '3',
        reps: '15-20',
        notes: 'Ombro estetico.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
      makeExercise({
        name: 'Abdomen ou panturrilha',
        sets: '2-3',
        reps: '10-20',
        notes: 'Escolher o que ficou faltando na semana.',
        cadence: '2-1-2',
        restSeconds: 60,
      }),
    ],
  },
});
