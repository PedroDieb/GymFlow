import React, { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock, Dumbbell, ExternalLink, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { Program, ViewState, WorkoutHistory, WorkoutSession } from '../types';
import SessionEditor from './SessionEditor';

interface WorkoutCalendarProps {
  programs: Program[];
  workoutHistory: WorkoutHistory;
  onNavigate: (view: ViewState) => void;
  onOpenWorkout: (programId: string, dayTab: string) => void;
  onDeleteSession: (programId: string, dayTab: string, sessionId: string) => void;
  onUpdateSession: (programId: string, dayTab: string, updatedSession: WorkoutSession) => void;
}

type CalendarSession = WorkoutSession & {
  dateKey: string;
  programColor: string;
};

const colors = [
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'bg-rose-500/15 text-rose-300 border-rose-500/30',
];

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatMonth = (date: Date): string => (
  date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
);

const formatDate = (dateKey: string): string => (
  parseDateKey(dateKey).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
);

const formatTime = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getWorkoutLabel = (dayTab: string): string => {
  const match = dayTab.match(/\bD\d+\b/i);
  if (match) return match[0].toUpperCase();
  return dayTab.trim().slice(0, 2).toUpperCase();
};

const estimateVolume = (session: WorkoutSession): number => (
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

const WorkoutCalendar: React.FC<WorkoutCalendarProps> = ({ programs, workoutHistory, onNavigate, onOpenWorkout, onDeleteSession, onUpdateSession }) => {
  const programColorMap = useMemo(() => {
    const colorMap: Record<string, string> = {};
    programs.forEach((program, index) => {
      colorMap[program.id] = colors[index % colors.length];
    });
    return colorMap;
  }, [programs]);

  const sessions = useMemo((): CalendarSession[] => {
    const flattened = Object.entries(workoutHistory).flatMap(([programId, days]) => (
      Object.values(days).flatMap(daySessions => daySessions.map(session => ({
        ...session,
        dateKey: toDateKey(new Date(session.completedAt)),
        programColor: programColorMap[programId] || colors[0],
      })))
    ));

    return flattened.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [programColorMap, workoutHistory]);

  const latestSession = sessions[0];
  const todayKey = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(latestSession?.dateKey || todayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => (
    latestSession ? parseDateKey(latestSession.dateKey) : new Date()
  ));
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);

  const sessionsByDate = useMemo(() => (
    sessions.reduce<Record<string, CalendarSession[]>>((acc, session) => {
      acc[session.dateKey] = acc[session.dateKey] || [];
      acc[session.dateKey].push(session);
      return acc;
    }, {})
  ), [sessions]);

  const monthDays = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const selectedSessions = sessionsByDate[selectedDate] || [];
  const totalVolume = selectedSessions.reduce((total, session) => total + estimateVolume(session), 0);
  const totalExercises = selectedSessions.reduce((total, session) => total + session.exercises.length, 0);

  const changeMonth = (offset: number) => {
    setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleDeleteSession = (session: WorkoutSession) => {
    const shouldDelete = window.confirm('Excluir este treino salvo do calendario? Essa acao nao altera o treino editavel.');
    if (!shouldDelete) return;

    onDeleteSession(session.programId, session.dayTab, session.id);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 animate-in slide-in-from-right duration-300">
      <div className="max-w-md mx-auto pb-10">
        <div className="flex items-center justify-between mb-5 pt-4">
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <div>
              <h1 className="gf-display text-4xl">Calendario</h1>
              <p className="gf-meta">{sessions.length} sessoes salvas</p>
            </div>
          </div>
          <CalendarDays className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="gf-display text-3xl capitalize">{formatMonth(visibleMonth)}</h2>
              <button
                onClick={() => {
                  const now = new Date();
                  setVisibleMonth(now);
                  setSelectedDate(todayKey);
                }}
                className="text-xs text-emerald-400 mt-1"
              >
                Hoje
              </button>
            </div>
            <button onClick={() => changeMonth(1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-500 uppercase py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map(date => {
              const dateKey = toDateKey(date);
              const dateSessions = sessionsByDate[dateKey] || [];
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedDate === dateKey;
              const isToday = dateKey === todayKey;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`min-h-[58px] rounded-xl border p-1 text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500'
                      : isToday
                        ? 'bg-slate-900 border-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-700'
                  } ${isCurrentMonth ? 'opacity-100' : 'opacity-35'}`}
                >
                  <span className={`block text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {date.getDate()}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dateSessions.slice(0, 2).map(session => (
                      <span key={session.id} className={`text-[9px] leading-4 rounded border px-1 truncate ${session.programColor}`}>
                        {getWorkoutLabel(session.dayTab)}
                      </span>
                    ))}
                    {dateSessions.length > 2 && <span className="text-[9px] text-slate-500">+{dateSessions.length - 2}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Treinos</p>
            <p className="text-xl font-black text-white">{selectedSessions.length}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Exercicios</p>
            <p className="text-xl font-black text-white">{totalExercises}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Volume</p>
            <p className="text-xl font-black text-white">{totalVolume ? Math.round(totalVolume) : '-'}</p>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="gf-display text-2xl capitalize">{formatDate(selectedDate)}</h3>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>

          {selectedSessions.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarDays className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nenhum treino salvo nesse dia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSessions.map(session => {
                const volume = estimateVolume(session);
                const completed = session.exercises.filter(ex => ex.completed).length;

                return (
                  <div key={session.id} className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs rounded border px-2 py-1 font-bold ${session.programColor}`}>
                            {getWorkoutLabel(session.dayTab)}
                          </span>
                          <h4 className="text-sm font-bold text-white">{session.dayTab}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{session.programName}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onOpenWorkout(session.programId, session.dayTab)}
                          className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                          aria-label="Abrir treino"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingSession(session)}
                          className="p-2 rounded-lg bg-slate-800 text-emerald-300 border border-slate-700"
                          aria-label="Editar treino salvo"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20"
                          aria-label="Excluir treino salvo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-slate-800/70 rounded-lg p-2">
                        <Clock className="w-3 h-3 text-blue-300 mb-1" />
                        <p className="text-xs font-bold text-white">{formatTime(session.durationSeconds)}</p>
                      </div>
                      <div className="bg-slate-800/70 rounded-lg p-2">
                        <Dumbbell className="w-3 h-3 text-emerald-300 mb-1" />
                        <p className="text-xs font-bold text-white">{completed}/{session.exercises.length}</p>
                      </div>
                      <div className="bg-slate-800/70 rounded-lg p-2">
                        <TrendingUp className="w-3 h-3 text-orange-300 mb-1" />
                        <p className="text-xs font-bold text-white">{volume ? Math.round(volume) : '-'}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {session.exercises.slice(0, 6).map(exercise => (
                        <div key={`${session.id}_${exercise.exerciseId}`} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs items-center">
                          <span className="text-slate-300 truncate">{exercise.name}</span>
                          <span className="text-emerald-300 font-bold">{exercise.weight || '-'}kg</span>
                          <span className="text-slate-400">{exercise.performedReps.filter(Boolean).join('/') || '-'}</span>
                        </div>
                      ))}
                    </div>

                    {session.exercises.length > 6 && (
                      <p className="text-xs text-slate-500 mt-2">+{session.exercises.length - 6} exercicios</p>
                    )}
                    {session.generalNotes && <p className="text-xs text-slate-500 italic mt-3">{session.generalNotes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {editingSession && (
          <SessionEditor
            session={editingSession}
            onSave={(updated) => {
              onUpdateSession(editingSession.programId, editingSession.dayTab, updated);
              setEditingSession(null);
            }}
            onClose={() => setEditingSession(null)}
          />
        )}
      </div>
    </div>
  );
};

export default WorkoutCalendar;
