import React, { useState } from 'react';
import { ArrowLeft, Target, ChevronDown, Plus, Download, X, Circle, CheckCircle2, FileDown } from 'lucide-react';
import { Exercise, Program, ViewState, WorkoutHistory, WorkoutNotes, WorkoutSession } from '../types';
import { findPreviousExerciseSnapshot } from '../utils/workoutHistory';
import { getWorkoutDayKeys } from '../utils/workoutOrder';
import { getNextLoadSuggestion } from '../utils/loadSuggestion';

interface ProgramDaysManagerProps {
  program: Program;
  onUpdateProgram: (p: Program) => void;
  onNavigate: (view: ViewState) => void;
  onSelectDay: (day: string) => void;
  workoutHistory: WorkoutHistory;
  workoutNotes: WorkoutNotes;
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

const formatDuration = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const estimateSessionVolume = (session: WorkoutSession): number => (
  session.exercises.reduce((total, exercise) => {
    const weight = parseFloat(String(exercise.weight || '').replace(',', '.'));
    if (!Number.isFinite(weight)) return total;

    const reps = exercise.performedReps.reduce((repTotal, rep) => {
      const parsedRep = parseFloat(String(rep || '').replace(',', '.'));
      return Number.isFinite(parsedRep) ? repTotal + parsedRep : repTotal;
    }, 0);

    return total + (weight * reps);
  }, 0)
);

const sanitizeFileName = (name: string): string => (
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
);

const ProgramDaysManager: React.FC<ProgramDaysManagerProps> = ({ program, onUpdateProgram, onNavigate, onSelectDay, workoutHistory, workoutNotes }) => {
  const workouts = program.workouts || {};
  const workoutDayKeys = getWorkoutDayKeys(workouts);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedDayKeys, setSelectedDayKeys] = useState<string[]>([]);

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
  const getDaySessions = (dayKey: string): WorkoutSession[] => workoutHistory[program.id]?.[dayKey] || [];
  const getLatestSession = (dayKey: string) => getDaySessions(dayKey)[0] || null;
  const getPreviousExercise = (dayKey: string, exercise: Exercise) => (
    findPreviousExerciseSnapshot(workoutHistory, program.id, dayKey, exercise)
  );

  const openDownloadModal = () => {
    setSelectedDayKeys(workoutDayKeys);
    setIsDownloadModalOpen(true);
  };

  const toggleSelectedDay = (dayKey: string) => {
    setSelectedDayKeys(prev => (
      prev.includes(dayKey)
        ? prev.filter(key => key !== dayKey)
        : [...prev, dayKey]
    ));
  };

  const buildSelectedWorkoutReport = (dayKeys: string[]): string[] => {
    const selectedKeys = workoutDayKeys.filter(dayKey => dayKeys.includes(dayKey));
    const totalExercises = selectedKeys.reduce((total, dayKey) => total + (workouts[dayKey]?.length || 0), 0);
    const totalSessions = selectedKeys.reduce((total, dayKey) => total + getDaySessions(dayKey).length, 0);
    const lines: string[] = [
      'GYMFLOW - TREINOS SELECIONADOS',
      `Programa: ${program.name}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      'SINTESE',
      `Treinos selecionados: ${selectedKeys.join(', ')}`,
      `Total de treinos: ${selectedKeys.length}`,
      `Total de exercicios: ${totalExercises}`,
      `Sessoes anteriores incluidas: ${totalSessions}`,
    ];

    if (program.startDate) lines.push(`Inicio: ${new Date(program.startDate).toLocaleDateString('pt-BR')}`);
    if (program.endDate) lines.push(`Fim: ${new Date(program.endDate).toLocaleDateString('pt-BR')}`);

    if (program.objectives) {
      lines.push('', 'OBJETIVOS / REGRAS', program.objectives);
    }

    selectedKeys.forEach((dayKey, dayIndex) => {
      const exercises = workouts[dayKey] || [];
      const daySessions = getDaySessions(dayKey);
      const latestSession = getLatestSession(dayKey);
      const currentNote = workoutNotes[`${program.id}_${dayKey}`] || '';

      lines.push(
        '',
        `==================== ${dayIndex + 1}. ${dayKey} ====================`,
        'SINTESE DO TREINO',
        `${exercises.length} exercicios | ${daySessions.length} sessoes salvas`,
      );

      if (latestSession) {
        const volume = estimateSessionVolume(latestSession);
        const completedCount = latestSession.exercises.filter(exercise => exercise.completed).length;
        lines.push(
          `Ultima sessao: ${formatReportDate(latestSession.completedAt)} | Duracao ${formatDuration(latestSession.durationSeconds)} | Volume ${volume ? Math.round(volume) : '-'} | Marcados ${completedCount}/${latestSession.exercises.length}`,
        );
      }

      if (currentNote) {
        lines.push(`Anotacao atual aberta: ${currentNote}`);
      }

      if (latestSession?.generalNotes) {
        lines.push(`Anotacao geral anterior: ${latestSession.generalNotes}`);
      }

      if (daySessions.length > 0) {
        lines.push('', 'SESSOES ANTERIORES');
        daySessions.slice(0, 3).forEach((session, sessionIndex) => {
          const volume = estimateSessionVolume(session);
          const completedCount = session.exercises.filter(exercise => exercise.completed).length;
          lines.push(`${sessionIndex + 1}. ${formatReportDate(session.completedAt)} | ${formatDuration(session.durationSeconds)} | ${completedCount}/${session.exercises.length} exercicios | volume ${volume ? Math.round(volume) : '-'}`);
          if (session.generalNotes) lines.push(`   Nota: ${session.generalNotes}`);
        });
      }

      lines.push('', 'EXERCICIOS');
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

    return lines;
  };

  const handleDownloadPdf = async () => {
    if (selectedDayKeys.length === 0) {
      alert('Selecione pelo menos um treino para baixar.');
      return;
    }

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const usableWidth = pageWidth - (margin * 2);
    let y = margin;

    const addPageIfNeeded = (height = 18) => {
      if (y + height <= pageHeight - margin) return;
      pdf.addPage();
      y = margin;
    };

    const addText = (text: string, size = 10, style: 'normal' | 'bold' = 'normal') => {
      if (!text.trim()) {
        y += 8;
        return;
      }

      let content = text;
      let lineSize = size;
      let lineStyle = style;

      if (content.startsWith('====================')) {
        content = content.replace(/=+/g, '').trim();
        lineSize = 13;
        lineStyle = 'bold';
        y += 10;
      } else if (['GYMFLOW - TREINOS SELECIONADOS', 'SINTESE', 'OBJETIVOS / REGRAS', 'SINTESE DO TREINO', 'SESSOES ANTERIORES', 'EXERCICIOS'].includes(content)) {
        lineSize = content.startsWith('GYMFLOW') ? 16 : 11;
        lineStyle = 'bold';
        if (!content.startsWith('GYMFLOW')) y += 6;
      }

      pdf.setFont('helvetica', lineStyle);
      pdf.setFontSize(lineSize);
      const wrapped = pdf.splitTextToSize(content, usableWidth);
      const lineHeight = lineSize + 4;
      wrapped.forEach((wrappedLine: string) => {
        addPageIfNeeded(lineHeight);
        pdf.text(wrappedLine, margin, y);
        y += lineHeight;
      });
    };

    buildSelectedWorkoutReport(selectedDayKeys).forEach(line => addText(line));

    const fileName = `gymflow-${sanitizeFileName(program.name || 'treino')}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    setIsDownloadModalOpen(false);
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
            onClick={openDownloadModal}
            className="shrink-0 bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-slate-300 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2"
            title="Baixar treinos em PDF"
            aria-label="Baixar treinos em PDF"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Download
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

      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsDownloadModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileDown className="w-5 h-5 text-emerald-400" />
                  Baixar PDF
                </h3>
                <p className="text-xs text-slate-400 mt-1">Selecione os treinos que entram no arquivo.</p>
              </div>
              <button onClick={() => setIsDownloadModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setSelectedDayKeys(workoutDayKeys)} className="text-xs bg-slate-900 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg font-bold">Todos</button>
                <button onClick={() => setSelectedDayKeys([])} className="text-xs bg-slate-900 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg font-bold">Limpar</button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
                {workoutDayKeys.map(dayKey => {
                  const selected = selectedDayKeys.includes(dayKey);
                  const latestSession = getLatestSession(dayKey);

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => toggleSelectedDay(dayKey)}
                      className={`w-full text-left rounded-xl border p-3 flex items-start gap-3 transition-all ${selected ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-900/70 border-slate-700'}`}
                    >
                      {selected ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white">{dayKey}</p>
                        <p className="text-xs text-slate-400">{getExerciseCount(dayKey)} exercícios{latestSession ? ` | último: ${formatReportDate(latestSession.completedAt)}` : ''}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-900/60">
              <button
                onClick={handleDownloadPdf}
                disabled={selectedDayKeys.length === 0}
                className="w-full bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-black py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Finalizar e baixar PDF ({selectedDayKeys.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramDaysManager;
