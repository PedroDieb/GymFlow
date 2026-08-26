import React, { useState } from 'react';
import { Check, CheckCircle2, Circle, X } from 'lucide-react';
import { CompletedExerciseSnapshot, WorkoutSession } from '../types';

interface SessionEditorProps {
  session: WorkoutSession;
  onSave: (updated: WorkoutSession) => void;
  onClose: () => void;
}

const getSetCount = (sets: string): number => {
  const numbers = sets.match(/\d+/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : 3;
};

const padReps = (reps: string[] | undefined, count: number): string[] => {
  const current = reps || [];
  if (current.length >= count) return current;
  return [...current, ...Array(count - current.length).fill('')];
};

const SessionEditor: React.FC<SessionEditorProps> = ({ session, onSave, onClose }) => {
  const [exercises, setExercises] = useState<CompletedExerciseSnapshot[]>(() => (
    session.exercises.map(ex => ({ ...ex, performedReps: padReps(ex.performedReps, getSetCount(ex.sets)) }))
  ));
  const [generalNotes, setGeneralNotes] = useState(session.generalNotes || '');

  const updateExercise = (index: number, patch: Partial<CompletedExerciseSnapshot>) => {
    setExercises(prev => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  };

  const updateRep = (exerciseIndex: number, repIndex: number, value: string) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exerciseIndex) return ex;
      const performedReps = [...ex.performedReps];
      performedReps[repIndex] = value;
      return { ...ex, performedReps };
    }));
  };

  const handleSave = () => {
    onSave({
      ...session,
      generalNotes: generalNotes.trim(),
      exercises: exercises.map(ex => ({ ...ex, performedReps: ex.performedReps.map(rep => String(rep ?? '').trim()) })),
    });
  };

  const formatSessionDate = (isoDate: string): string => (
    new Date(isoDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-md mx-auto p-4 pb-32">
        <div className="sticky top-0 z-10 bg-slate-900 pt-2 pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors" aria-label="Fechar edição">
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h2 className="text-base font-bold text-white">Editar treino</h2>
              <p className="text-xs text-slate-500">{session.dayTab} · {session.programName} · {formatSessionDate(session.completedAt)}</p>
            </div>
          </div>
        </div>

        {exercises.map((exercise, exerciseIndex) => {
          const setCount = getSetCount(exercise.sets);
          return (
            <div key={exercise.exerciseId || exerciseIndex} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-white flex-1">{exercise.name}</h3>
                <button
                  onClick={() => updateExercise(exerciseIndex, { completed: !exercise.completed })}
                  className={`p-1.5 rounded-full border transition-colors ${exercise.completed ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-600 text-slate-500'}`}
                  aria-label="Marcar como concluído"
                >
                  {exercise.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 flex-1">
                  <span className="text-xs text-slate-500 font-bold">Carga</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={exercise.weight}
                    onChange={(e) => updateExercise(exerciseIndex, { weight: e.target.value })}
                    className="bg-transparent outline-none text-sm text-white flex-1 min-w-0"
                    placeholder="kg"
                  />
                  <span className="text-xs text-slate-500">kg</span>
                </label>
                <div className="text-xs text-slate-500 text-right shrink-0">
                  <p className="font-bold text-slate-400">{exercise.sets} séries</p>
                  <p>{exercise.reps} reps</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {Array.from({ length: setCount }).map((_, repIndex) => (
                  <div key={repIndex} className="flex flex-col items-center gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={exercise.performedReps[repIndex] ?? ''}
                      onChange={(e) => updateRep(exerciseIndex, repIndex, e.target.value)}
                      className="w-12 h-10 bg-slate-900 border border-slate-600 rounded-lg text-center text-sm font-bold text-white outline-none focus:border-emerald-500"
                    />
                    <span className="text-[9px] text-slate-600 font-bold">S{repIndex + 1}</span>
                  </div>
                ))}
              </div>

              <input
                type="text"
                value={exercise.notes}
                onChange={(e) => updateExercise(exerciseIndex, { notes: e.target.value })}
                placeholder="Notas do exercício…"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500"
              />
            </div>
          );
        })}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Notas gerais do treino</p>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Como foi o treino?"
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-10">
        <div className="max-w-md mx-auto flex gap-3">
          <button onClick={onClose} className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-bold">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-emerald-500 text-slate-950 text-sm font-bold flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionEditor;
