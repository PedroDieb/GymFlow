import React from 'react';
import { ArrowLeft, Target, ChevronDown, Plus, Printer } from 'lucide-react';
import { Exercise, Program, ViewState, WorkoutHistory } from '../types';
import { findPreviousExerciseSnapshot } from '../utils/workoutHistory';
import { getWorkoutDayKeys } from '../utils/workoutOrder';
import { getNextLoadSuggestion } from '../utils/loadSuggestion';

interface ProgramDaysManagerProps {
  program: Program;
  onUpdateProgram: (p: Program) => void;
  onNavigate: (view: ViewState) => void;
  onSelectDay: (day: string) => void;
  workoutHistory: WorkoutHistory;
}

const formatReportValue = (value?: string | number | null, suffix = ''): string => {
  const text = String(value ?? '').trim();
  return text ? `${text}${suffix}` : '-';
};

const formatReportReps = (reps?: string[]): string => {
  const cleanReps = (reps || []).filter(Boolean);
  return cleanReps.length ? cleanReps.join(' / ') : '-';
};

const formatReportDate = (isoDate: string): string => (
  new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
);

const ProgramDaysManager: React.FC<ProgramDaysManagerProps> = ({ program, onUpdateProgram, onNavigate, onSelectDay, workoutHistory }) => {
  const workouts = program.workouts || {};
  const workoutDayKeys = getWorkoutDayKeys(workouts);

  const handleCreateDay = () => {
    const keys = Object.keys(workouts);
    const nextLetter = String.fromCharCode(65 + keys.length); 
    const newKey = `Treino ${nextLetter}`;
    let finalKey = newKey;
    if (workouts[finalKey]) finalKey = `${newKey} (Novo)`;
    const updatedWorkouts = { ...workouts, [finalKey]: [] };
    onUpdateProgram({ ...program, workouts: updatedWorkouts });
  };

  const getExerciseCount = (key: string) => workouts[key]?.length || 0;
  const getLatestSession = (dayKey: string) => workoutHistory[program.id]?.[dayKey]?.[0] || null;
  const getPreviousExercise = (dayKey: string, exercise: Exercise) => (
    findPreviousExerciseSnapshot(workoutHistory, program.id, dayKey, exercise)
  );

  const buildProgramPrintText = (): string => {
    const lines: string[] = [
      'GYMFLOW - PROGRAMA COMPLETO',
      `Programa: ${program.name}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    ];

    if (program.startDate) lines.push(`Inicio: ${new Date(program.startDate).toLocaleDateString('pt-BR')}`);
    if (program.endDate) lines.push(`Fim: ${new Date(program.endDate).toLocaleDateString('pt-BR')}`);

    if (program.objectives) {
      lines.push('', 'OBJETIVOS / REGRAS', program.objectives);
    }

    workoutDayKeys.forEach((dayKey, dayIndex) => {
      const exercises = workouts[dayKey] || [];
      const latestSession = getLatestSession(dayKey);

      lines.push(
        '',
        `==================== ${dayIndex + 1}. ${dayKey} ====================`,
        `${exercises.length} exercicios`
      );

      if (latestSession) {
        lines.push(
          `Ultima sessao: ${formatReportDate(latestSession.completedAt)}`,
          `Duracao: ${formatReportValue(Math.floor(latestSession.durationSeconds / 60), 'min')}`,
        );
        if (latestSession.generalNotes) {
          lines.push(`Anotacao geral anterior: ${latestSession.generalNotes}`);
        }
      }

      exercises.forEach((exercise, exerciseIndex) => {
        const previousExercise = getPreviousExercise(dayKey, exercise);
        const nextLoadSuggestion = getNextLoadSuggestion(exercise.weight);
        lines.push(
          '',
          `${exerciseIndex + 1}. ${exercise.name}`,
          `Alvo: ${formatReportValue(exercise.sets)} x ${formatReportValue(exercise.reps)}`,
          `Atual/base: carga ${formatReportValue(exercise.weight, 'kg')} | RIR ${formatReportValue(exercise.rir)} | tempo ${formatReportValue(exercise.cadence)} | descanso ${formatReportValue(exercise.restSeconds, 's')}`,
        );

        if (nextLoadSuggestion) {
          lines.push(`Proxima carga sugerida (+2,5% a +5%): ${nextLoadSuggestion.label}`);
        }

        if (exercise.notes) {
          lines.push(`Notas atuais: ${exercise.notes}`);
        }

        if (previousExercise) {
          lines.push(
            `Anterior: carga ${formatReportValue(previousExercise.weight, 'kg')} | reps ${formatReportReps(previousExercise.performedReps)} | RIR ${formatReportValue(previousExercise.rir)} | tempo ${formatReportValue(previousExercise.cadence)}`,
          );
          if (previousExercise.notes) {
            lines.push(`Notas anteriores: ${previousExercise.notes}`);
          }
        }
      });
    });

    return lines.join('\n');
  };

  const handlePrintProgram = async () => {
    const reportText = buildProgramPrintText();
    const printWindow = window.open('', '_blank', 'width=820,height=900');

    if (!printWindow) {
      try {
        await navigator.clipboard?.writeText(reportText);
        alert('Nao consegui abrir a janela de impressao. Copiei o programa para a area de transferencia.');
      } catch {
        alert('Nao consegui abrir a janela de impressao.');
      }
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>GymFlow - Programa completo</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; line-height: 1.45; }
            h1 { font-size: 20px; margin: 0 0 16px; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 13px; }
            .actions { display: flex; gap: 8px; margin-bottom: 20px; }
            button { border: 1px solid #d1d5db; background: #f9fafb; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
            @media print { .actions { display: none; } body { margin: 18mm; } }
          </style>
        </head>
        <body>
          <div class="actions">
            <button onclick="window.print()">Imprimir</button>
            <button onclick="navigator.clipboard.writeText(document.getElementById('report').textContent)">Copiar texto</button>
          </div>
          <h1>GymFlow - Programa completo</h1>
          <pre id="report"></pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    const reportElement = printWindow.document.getElementById('report');
    if (reportElement) reportElement.textContent = reportText;
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 animate-in slide-in-from-right duration-300">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between gap-3 mb-2 pt-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => onNavigate('programList')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight truncate">{program.name}</h1>
              <p className="text-xs text-slate-400">Gerenciar divisão de treinos</p>
            </div>
          </div>
          <button
            onClick={handlePrintProgram}
            className="shrink-0 bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-slate-300 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2"
            title="Imprimir programa completo"
            aria-label="Imprimir programa completo"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Imprimir
          </button>
        </div>

        {program.objectives && (
            <div className="mb-6 bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl flex gap-3 items-start">
                <Target className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                    <h4 className="text-xs font-bold text-blue-300 uppercase mb-1">Foco</h4>
                    <p className="text-sm text-blue-100 italic leading-relaxed">{program.objectives}</p>
                </div>
            </div>
        )}
        {!program.objectives && <div className="h-px bg-slate-800 w-full mb-6"></div>}

        <div className="grid gap-4">
          {workoutDayKeys.map((key) => (
            <div key={key} onClick={() => onSelectDay(key)} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 h-12 w-12 rounded-xl flex items-center justify-center font-bold text-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-colors">{key.charAt(0).toUpperCase()}</div>
                <div><h3 className="font-bold text-lg text-white">{key}</h3><p className="text-sm text-slate-400">{getExerciseCount(key)} exercícios</p></div>
              </div>
              <div className="bg-slate-700/50 p-2 rounded-full"><ChevronDown className="w-5 h-5 text-slate-400 -rotate-90" /></div>
            </div>
          ))}
          <button onClick={handleCreateDay} className="border-2 border-dashed border-slate-700 p-5 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all"><Plus className="w-6 h-6" /><span className="font-bold">Adicionar Dia de Treino</span></button>
        </div>
      </div>
    </div>
  );
};

export default ProgramDaysManager;
