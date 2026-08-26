import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Square, Play, Sparkles, Heart, Plus, Check, X, Edit2, Timer, ChevronDown, ChevronUp, Wind, Link as LinkIcon, Unlink, Trash2, Clock, Info, Pause, StopCircle, CheckCircle2, Circle, FileText, Loader2, Youtube, ExternalLink, CalendarDays } from 'lucide-react';
import { ActiveWorkout, Program, WorkoutHistory, WorkoutNotes, Exercise, WorkoutSession } from '../types';
import { generateWorkoutExercises, getExerciseTip } from '../services/geminiService';
import { findPreviousExerciseSnapshot } from '../utils/workoutHistory';
import { getWorkoutDayKeys } from '../utils/workoutOrder';
import { getNextLoadSuggestion } from '../utils/loadSuggestion';

interface WorkoutTrackerProps {
  program: Program;
  onUpdateProgram: (p: Program) => void;
  workoutNotes: WorkoutNotes;
  onUpdateNotes: (notes: WorkoutNotes) => void;
  workoutHistory: WorkoutHistory;
  onUpdateWorkoutHistory: (history: WorkoutHistory) => void;
  initialTab: string | null;
  onActiveTabChange: (tab: string) => void;
  onOpenCalendar: () => void;
  onDeleteSession: (programId: string, dayTab: string, sessionId: string) => void;
  onSetActiveWorkout: (aw: ActiveWorkout) => void;
  onClearActiveWorkout: () => void;
  onResumeSession: (session: WorkoutSession) => void;
  resumeSessionId: string | null;
  onBack: () => void;
}

const getSetCount = (sets: string): number => {
  const numbers = sets.match(/\d+/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : 3;
};

interface RestTimerState {
  timeLeft: number;
  isRunning: boolean;
  initialTime: number;
  activeExerciseId: string | null;
  endAt: number | null;
}

const formatSessionDate = (isoDate: string): string => {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPreviousValue = (value?: string | number | null, suffix = ''): string => {
  const text = String(value ?? '').trim();
  return text ? `${text}${suffix}` : '-';
};

const formatPreviousReps = (reps?: string[]): string => {
  const cleanReps = (reps || []).filter(Boolean);
  return cleanReps.length ? cleanReps.join(' / ') : '-';
};

const WorkoutTracker: React.FC<WorkoutTrackerProps> = ({ program, onUpdateProgram, workoutNotes, onUpdateNotes, workoutHistory, onUpdateWorkoutHistory, initialTab, onActiveTabChange, onOpenCalendar, onDeleteSession, onSetActiveWorkout, onClearActiveWorkout, onResumeSession, resumeSessionId, onBack }) => {
  const workouts = program.workouts;
  const workoutDayKeys = getWorkoutDayKeys(workouts);
  const setWorkouts = (callback: (prev: any) => any) => {
    const updatedWorkouts = callback(workouts);
    onUpdateProgram({ ...program, workouts: updatedWorkouts });
  };

  const [activeTab, setActiveTab] = useState(initialTab || workoutDayKeys[0]);
  useEffect(() => {
    onActiveTabChange(activeTab);
  }, [activeTab, onActiveTabChange]);

  useEffect(() => { 
      if (!workouts[activeTab]) { 
          const keys = getWorkoutDayKeys(workouts); 
          if (keys.length > 0) setActiveTab(keys[0]); 
      } 
  }, [workouts, activeTab]);

  const [newExercise, setNewExercise] = useState({ name: '', sets: '3', reps: '10-12', weight: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParams, setAiParams] = useState({ focus: '', level: 'Iniciante' });
  const [tipModal, setTipModal] = useState({ isOpen: false, text: '', title: '', loading: false });
  const [rirModalOpen, setRirModalOpen] = useState(false);
  const [tempoModalOpen, setTempoModalOpen] = useState(false);
  const [deleteTabModal, setDeleteTabModal] = useState(false);
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean, exerciseName: string }>({ isOpen: false, exerciseName: '' });
  
  // Timer State
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(() => { 
      const saved = localStorage.getItem('gymflow_workout_start'); 
      return saved ? parseInt(saved) : null; 
  });
  const [elapsedWorkoutTime, setElapsedWorkoutTime] = useState(0);
  const [stopWorkoutModal, setStopWorkoutModal] = useState(false);
  const [timer, setTimer] = useState<RestTimerState>(() => {
    // Retoma o cronômetro de descanso de onde parou (sobrevive a fechar o app)
    try {
      const saved = localStorage.getItem('gymflow_rest_timer');
      if (!saved) return { timeLeft: 0, isRunning: false, initialTime: 60, activeExerciseId: null, endAt: null };
      const parsed = JSON.parse(saved);
      const initialTime = typeof parsed.initialTime === 'number' ? parsed.initialTime : 60;
      const activeExerciseId = parsed.activeExerciseId ?? null;
      if (parsed.isRunning && typeof parsed.endAt === 'number') {
        const remaining = Math.max(0, Math.ceil((parsed.endAt - Date.now()) / 1000));
        if (remaining > 0) return { timeLeft: remaining, isRunning: true, initialTime, activeExerciseId, endAt: parsed.endAt };
      }
      if (typeof parsed.timeLeft === 'number' && parsed.timeLeft > 0) {
        return { timeLeft: Math.min(parsed.timeLeft, initialTime), isRunning: false, initialTime, activeExerciseId, endAt: null };
      }
      return { timeLeft: 0, isRunning: false, initialTime, activeExerciseId, endAt: null };
    } catch {
      return { timeLeft: 0, isRunning: false, initialTime: 60, activeExerciseId: null, endAt: null };
    }
  });
  // Use ReturnType<typeof setInterval> to avoid NodeJS namespace issues
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persiste o cronômetro de descanso pra sobreviver a fechar o app
  useEffect(() => {
    if (timer.timeLeft > 0 || timer.isRunning) {
      localStorage.setItem('gymflow_rest_timer', JSON.stringify(timer));
    } else {
      localStorage.removeItem('gymflow_rest_timer');
    }
  }, [timer]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (workoutStartTime) {
      setElapsedWorkoutTime(Math.floor((Date.now() - workoutStartTime) / 1000));
      interval = setInterval(() => { setElapsedWorkoutTime(Math.floor((Date.now() - workoutStartTime) / 1000)); }, 1000);
    } else { setElapsedWorkoutTime(0); }
    return () => clearInterval(interval);
  }, [workoutStartTime]);

  const toggleWorkoutTimer = () => { if (workoutStartTime) { setStopWorkoutModal(true); } else { const now = Date.now(); setWorkoutStartTime(now); localStorage.setItem('gymflow_workout_start', now.toString()); onSetActiveWorkout({ programId: program.id, dayTab: activeTab, startedAt: new Date().toISOString() }); } };

  // Cronômetro baseado em timestamp: continua contando mesmo com o app em background.
  // (O setInterval puro congelava quando o celular suspendia o JS.)
  useEffect(() => {
    if (!timer.isRunning || timer.endAt === null) { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timer.endAt! - Date.now()) / 1000));
      setTimer(prev => {
        if (!prev.isRunning || prev.endAt === null) return prev;
        if (remaining <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return { ...prev, timeLeft: 0, isRunning: false, endAt: null };
        }
        return { ...prev, timeLeft: remaining };
      });
    };
    tick();
    timerIntervalRef.current = setInterval(tick, 250);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [timer.isRunning, timer.endAt]);

  // Ao voltar pro app (troca de aba/desbloqueio), corrige o restante na hora
  useEffect(() => {
    const syncFromClock = () => {
      setTimer(prev => {
        if (!prev.isRunning || prev.endAt === null) return prev;
        const remaining = Math.max(0, Math.ceil((prev.endAt - Date.now()) / 1000));
        if (remaining <= 0) return { ...prev, timeLeft: 0, isRunning: false, endAt: null };
        return { ...prev, timeLeft: remaining };
      });
    };
    document.addEventListener('visibilitychange', syncFromClock);
    window.addEventListener('focus', syncFromClock);
    return () => { document.removeEventListener('visibilitychange', syncFromClock); window.removeEventListener('focus', syncFromClock); };
  }, []);

  const startTimer = (d: number, id: string | null = null) => setTimer({ timeLeft: d, isRunning: true, initialTime: d, activeExerciseId: id, endAt: Date.now() + d * 1000 });
  const pauseTimer = () => setTimer(prev => {
    const remaining = prev.endAt !== null ? Math.max(0, Math.ceil((prev.endAt - Date.now()) / 1000)) : prev.timeLeft;
    return { ...prev, timeLeft: remaining, isRunning: false, endAt: null };
  });
  const resumeTimer = () => setTimer(prev => ({ ...prev, isRunning: true, endAt: Date.now() + prev.timeLeft * 1000 }));
  const stopTimer = () => setTimer(prev => ({ ...prev, isRunning: false, timeLeft: 0, endAt: null, activeExerciseId: null }));
  const addTime = (s: number) => setTimer(prev => {
    const timeLeft = Math.max(0, prev.timeLeft + s);
    const endAt = prev.isRunning && prev.endAt !== null ? prev.endAt + s * 1000 : null;
    return { ...prev, timeLeft, endAt };
  });
  const formatTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec < 10 ? '0' : ''}${sec}`; };
  const formatWorkoutTime = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; if(h>0) return `${h}:${m<10?'0':''}${m}:${sec<10?'0':''}${sec}`; return `${m<10?'0':''}${m}:${sec<10?'0':''}${sec}`; };

  const isCardioOrFlex = (tabName: string) => /cardio|flex|alongamento|yoga|aerobico|corrida|mobilidade|esteira/i.test(tabName);
  const getCurrentExercises = () => workouts[activeTab] || [];
  const getDayHistory = (): WorkoutSession[] => workoutHistory[program.id]?.[activeTab] || [];
  const getLatestSession = (): WorkoutSession | null => getDayHistory()[0] || null;
  const getPreviousExercise = (exercise: Exercise) => (
    findPreviousExerciseSnapshot(workoutHistory, program.id, activeTab, exercise)
  );

  const buildPerformedReps = (exercise: Exercise): string[] => {
    const plannedSetCount = getSetCount(exercise.sets);
    const currentReps = exercise.performedReps || [];
    if (currentReps.length >= plannedSetCount) return currentReps;
    return [...currentReps, ...Array(plannedSetCount - currentReps.length).fill('')];
  };

  const confirmStopWorkout = () => {
    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      programId: program.id,
      programName: program.name,
      dayTab: activeTab,
      completedAt: new Date().toISOString(),
      durationSeconds: elapsedWorkoutTime,
      generalNotes: workoutNotes[`${program.id}_${activeTab}`] || '',
      exercises: getCurrentExercises().map(ex => ({
        exerciseId: ex.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        performedReps: buildPerformedReps(ex),
        notes: ex.notes,
        rir: ex.rir,
        cadence: ex.cadence,
        completed: ex.completed,
      })),
    };

    const programHistory = workoutHistory[program.id] || {};
    const dayHistory = programHistory[activeTab] || [];
    const filteredDayHistory = resumeSessionId ? dayHistory.filter(saved => saved.id !== resumeSessionId) : dayHistory;
    onUpdateWorkoutHistory({
      ...workoutHistory,
      [program.id]: {
        ...programHistory,
        [activeTab]: [session, ...filteredDayHistory].slice(0, 100),
      },
    });

    const resetWorkouts = {
      ...workouts,
      [activeTab]: getCurrentExercises().map(ex => ({
        ...ex,
        completed: false,
        performedReps: Array(getSetCount(ex.sets)).fill(''),
        notes: '',
      })),
    };

    onUpdateProgram({ ...program, workouts: resetWorkouts });
    onUpdateNotes({ ...workoutNotes, [`${program.id}_${activeTab}`]: '' });
    setWorkoutStartTime(null);
    setElapsedWorkoutTime(0);
    localStorage.removeItem('gymflow_workout_start');
    setStopWorkoutModal(false);
    onClearActiveWorkout();
  };

  const handleAddTab = () => {
    const keys = Object.keys(workouts);
    const letters = keys.filter(k => /^[A-Z]$/.test(k)).sort();
    let nextKey = 'A';
    if (letters.length > 0) nextKey = String.fromCharCode(letters[letters.length - 1].charCodeAt(0) + 1);
    let counter = 1; let finalKey = nextKey;
    while (workouts[finalKey]) { finalKey = `${nextKey}${counter}`; counter++; if(counter>10) break; }
    if (workouts[finalKey]) finalKey = `Treino ${keys.length + 1}`;
    setWorkouts(prev => ({ ...prev, [finalKey]: [] }));
    setActiveTab(finalKey);
  };

  const handleAddSpecialTab = () => { const name = "Cardio & Flex"; if (!workouts[name]) setWorkouts(prev => ({ ...prev, [name]: [] })); setActiveTab(name); };
  
  const handleRenameTab = (e: React.FormEvent) => {
    e.preventDefault(); const oldName = activeTab; const newName = renameValue.trim();
    if (!newName || newName === oldName) { setIsRenaming(false); return; }
    if (workouts[newName]) { alert("Nome já existe!"); return; }
    const newWorkouts: any = {};
    Object.keys(workouts).forEach(key => { if(key === oldName) newWorkouts[newName] = workouts[key]; else newWorkouts[key] = workouts[key]; });
    setWorkouts(() => newWorkouts); setActiveTab(newName); setIsRenaming(false);
  };

  const handleDeleteTab = () => {
    if (Object.keys(workouts).length <= 1) { alert("Mínimo 1 treino!"); setDeleteTabModal(false); return; }
    const newWorkouts = { ...workouts }; delete newWorkouts[activeTab]; setWorkouts(() => newWorkouts); setDeleteTabModal(false);
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault(); if (!newExercise.name) return;
    const exercise: Exercise = { id: crypto.randomUUID(), ...newExercise, completed: false, performedReps: Array(getSetCount(newExercise.sets)).fill(''), notes: '', rir: '', cadence: '', restSeconds: 60, linkedToNext: false };
    setWorkouts((prev: any) => ({ ...prev, [activeTab]: [...(prev[activeTab] || []), exercise] }));
    setNewExercise({ name: '', sets: '3', reps: '10-12', weight: '' }); setIsFormOpen(false);
  };

  const updateExerciseData = (id: string, field: keyof Exercise, value: any, index: number | null = null) => {
    setWorkouts((prev: any) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((ex: Exercise) => {
        if (ex.id !== id) return ex;

        if (field === 'performedReps' && index !== null) {
          const newReps = buildPerformedReps(ex);
          newReps[index] = value;
          return { ...ex, performedReps: newReps };
        }

        if (field === 'sets') {
          const updatedExercise = { ...ex, sets: value };
          const setCount = getSetCount(value);
          const currentReps = ex.performedReps || [];
          const performedReps = Array.from({ length: setCount }, (_, repIndex) => currentReps[repIndex] || '');
          return { ...updatedExercise, performedReps };
        }

        return { ...ex, [field]: value };
      })
    }));
  };

  const addPerformedSet = (exercise: Exercise) => {
    const performedReps = buildPerformedReps(exercise);
    setWorkouts((prev: any) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((ex: Exercise) => (
        ex.id === exercise.id ? { ...ex, performedReps: [...performedReps, ''], sets: String(performedReps.length + 1) } : ex
      ))
    }));
  };

  const removePerformedSet = (exercise: Exercise) => {
    const performedReps = buildPerformedReps(exercise);
    if (performedReps.length <= 1) return;
    setWorkouts((prev: any) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((ex: Exercise) => (
        ex.id === exercise.id ? { ...ex, performedReps: performedReps.slice(0, -1), sets: String(performedReps.length - 1) } : ex
      ))
    }));
  };

  const toggleComplete = (id: string) => { setWorkouts((prev: any) => ({ ...prev, [activeTab]: prev[activeTab].map((ex: Exercise) => ex.id === id ? { ...ex, completed: !ex.completed } : ex) })); };
  const removeExercise = (id: string) => { setWorkouts((prev: any) => ({ ...prev, [activeTab]: (prev[activeTab] || []).filter((ex: Exercise) => ex.id !== id) })); };
  const toggleSupersetLink = (index: number) => { setWorkouts((prev: any) => { const current = [...prev[activeTab]]; if(index < current.length) current[index] = { ...current[index], linkedToNext: !current[index].linkedToNext }; return { ...prev, [activeTab]: current }; }); };
  
  const generateAIWorkout = async (e: React.FormEvent) => {
    e.preventDefault(); if (!aiParams.focus) return; setAiLoading(true);
    
    const context = isCardioOrFlex(activeTab) ? "FOCO: Cardio/Flex" : "FOCO: Musculação";
    const newExercisesData = await generateWorkoutExercises(context, aiParams.focus, aiParams.level);

    if(newExercisesData.length > 0) {
          const newEx = newExercisesData.map(ex => ({ 
              id: crypto.randomUUID(), 
              name: ex.name || "Exercício",
              sets: ex.sets || "3",
              reps: ex.reps || "12",
              weight: ex.weight || "0",
              completed:false, 
              performedReps: Array(getSetCount(ex.sets as string)).fill(''), 
              notes:'', rir:'', 
              cadence: ex.cadence||'', 
              restSeconds: ex.restSeconds||60, 
              linkedToNext:false 
          } as Exercise));
          setWorkouts((prev: any) => ({ ...prev, [activeTab]: [...(prev[activeTab]||[]), ...newEx] })); 
          setIsAiModalOpen(false);
    } else {
        alert("Erro IA");
    }
    setAiLoading(false);
  };

  const handleGetTip = async (name: string, type: 'breathing' | 'technique') => {
      setTipModal({isOpen:true, text:'', loading:true, title: type==='breathing'?'Respiração':'Técnica'});
      const text = await getExerciseTip(name, type);
      setTipModal(prev=>({...prev, text, loading:false}));
  };
  
  const openVideoModal = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoModal({ isOpen: true, exerciseName: name });
  };

  const calculateProgress = () => { const c = getCurrentExercises(); if(!c.length) return 0; return Math.round((c.filter(ex=>ex.completed).length/c.length)*100); };
  const hasWorkoutData = () => getCurrentExercises().some(ex => (
    ex.completed ||
    (ex.performedReps || []).some(Boolean) ||
    !!ex.notes
  )) || !!workoutNotes[`${program.id}_${activeTab}`];
  const latestSession = getLatestSession();

  // Marca "treino em andamento" sempre que houver dados preenchidos no dia
  // (checkmarks, reps, cargas ou notas) — permite retomar de outro dispositivo
  useEffect(() => {
    if (hasWorkoutData()) {
      onSetActiveWorkout({ programId: program.id, dayTab: activeTab, startedAt: new Date().toISOString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, activeTab]);
  const latestSessionVolume = latestSession?.exercises.reduce((total, exercise) => {
    const weight = parseFloat(String(exercise.weight || '').replace(',', '.'));
    if (!Number.isFinite(weight)) return total;
    const reps = exercise.performedReps.reduce((repTotal, rep) => {
      const parsedRep = parseFloat(String(rep || '').replace(',', '.'));
      return Number.isFinite(parsedRep) ? repTotal + parsedRep : repTotal;
    }, 0);
    return total + (weight * reps);
  }, 0) || 0;
  const latestCompletedCount = latestSession?.exercises.filter(ex => ex.completed).length || 0;

  const handleNotesChange = (val: string) => {
      onUpdateNotes({ ...workoutNotes, [`${program.id}_${activeTab}`]: val });
  };

  const handleDeleteLatestSession = () => {
    if (!latestSession) return;

    const shouldDelete = window.confirm('Excluir o ultimo treino salvo deste dia? Ele sai do calendario e do resumo.');
    if (!shouldDelete) return;

    onDeleteSession(latestSession.programId, latestSession.dayTab, latestSession.id);
  };


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-800 p-4 shadow-lg border-b border-slate-700 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
            <div><h1 className="gf-meta leading-none">{program.name}</h1><h2 className="gf-display text-3xl leading-tight">Treino {activeTab}</h2></div>
          </div>
          <div className="flex items-center gap-2">
              {workoutStartTime ? (
                <div onClick={toggleWorkoutTimer} className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-full pl-3 pr-1 py-1 cursor-pointer hover:bg-red-500/20"><span className="text-red-400 text-xs font-mono font-bold min-w-[50px] text-center tabular-nums">{formatWorkoutTime(elapsedWorkoutTime)}</span><div className="bg-red-500 text-white p-1 rounded-full flex items-center justify-center h-6 w-6"><Square className="w-3 h-3 fill-current" /></div></div>
              ) : (
                <button onClick={toggleWorkoutTimer} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 px-3 py-1.5 rounded-full text-xs font-bold transition-all"><Play className="w-3 h-3" /> Iniciar</button>
              )}
              <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-purple-500/20"><Sparkles className="w-3 h-3" /> IA</button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 relative">
        {/* Navigation Tabs - Fix for layout breaking on long names */}
        <div className="flex items-center gap-2 mb-6 w-full">
          <div className="flex-1 overflow-x-auto pb-2 scrollbar-hide flex gap-2 min-w-0 mask-gradient-right">
            {workoutDayKeys.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-none min-w-[60px] px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? isCardioOrFlex(tab) ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{isCardioOrFlex(tab) && <Heart className="w-3 h-3" />}{tab}</button>
            ))}
          </div>
          {/* Action buttons kept separate to prevent shrinking */}
          <div className="flex-none flex gap-2">
            <button onClick={handleAddSpecialTab} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-600 text-rose-500 hover:bg-rose-500"><Heart className="w-5 h-5" /></button>
            <button onClick={handleAddTab} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-600 text-emerald-500 hover:bg-emerald-500"><Plus className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="mb-6 bg-slate-800 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2 flex-1">
                {isRenaming ? (
                   <form onSubmit={handleRenameTab} className="flex items-center gap-2 flex-1"><input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="bg-slate-700 text-white text-sm font-bold p-1 rounded border border-slate-500 w-full max-w-[150px]" autoFocus /><button type="submit" className="text-emerald-500"><Check className="w-4 h-4"/></button><button type="button" onClick={() => setIsRenaming(false)} className="text-red-400"><X className="w-4 h-4"/></button></form>
                ) : (
                   <><h2 className="text-slate-200 text-sm font-bold flex items-center gap-2">{activeTab}<button onClick={() => { setRenameValue(activeTab); setIsRenaming(true); }} className="text-slate-500 hover:text-emerald-500"><Edit2 className="w-3 h-3" /></button></h2><span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{getCurrentExercises().length} itens</span></>
                )}
            </div>
            <span className="text-2xl font-bold text-white">{calculateProgress()}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden"><div className={`h-3 rounded-full transition-all duration-500 ease-out ${isCardioOrFlex(activeTab) ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${calculateProgress()}%` }}></div></div>
          {!workoutStartTime && hasWorkoutData() && (
            <button onClick={() => setStopWorkoutModal(true)} className="mt-3 w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 py-2 rounded-lg text-sm font-bold">
              Salvar sessão na planilha
            </button>
          )}
        </div>

        <div className="space-y-0">
          {getCurrentExercises().map((ex: Exercise, index: number) => {
            const isExpanded = expandedExerciseId === ex.id;
            const setsArray = buildPerformedReps(ex);
            const previousExercise = getPreviousExercise(ex);
            const previousReps = previousExercise?.performedReps || [];
            const nextLoadSuggestion = getNextLoadSuggestion(ex.weight);
            const isLinkedToNext = ex.linkedToNext;
            const isLinkedFromPrev = index > 0 && getCurrentExercises()[index - 1].linkedToNext;
            let containerClasses = "group border-x border-slate-700 bg-slate-800 transition-all duration-200 overflow-hidden relative ";
            if (isLinkedToNext && isLinkedFromPrev) containerClasses += "border-t-0 border-b-0 rounded-none ";
            else if (isLinkedToNext) containerClasses += "border-b-0 rounded-t-xl rounded-b-none mb-0 ";
            else if (isLinkedFromPrev) containerClasses += "border-t-0 rounded-b-xl rounded-t-none mb-3 shadow-lg ";
            else containerClasses += "rounded-xl border-y mb-3 shadow-sm ";
            const activeBorderColor = isCardioOrFlex(activeTab) ? 'bg-rose-500' : 'bg-emerald-500';
            const groupBorder = (isLinkedToNext || isLinkedFromPrev) ? (<div className={`absolute left-0 top-0 bottom-0 w-1 ${activeBorderColor} z-10`}></div>) : null;

            return (
              <div key={ex.id} className={containerClasses + (ex.completed ? 'opacity-60 bg-slate-900/50' : '')}>
                {groupBorder}
                <div onClick={() => setExpandedExerciseId(isExpanded ? null : ex.id)} className={`p-4 flex items-center justify-between cursor-pointer ${isLinkedFromPrev || isLinkedToNext ? 'pl-5' : ''}`}>
                  <div className="flex items-center gap-4 flex-1">
                    <div onClick={(e) => { e.stopPropagation(); toggleComplete(ex.id); }} className={`transition-colors ${ex.completed ? 'text-emerald-500' : 'text-slate-600 hover:text-emerald-400'}`}>{ex.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}</div>
                    <div>
                      <h3 className={`font-bold text-lg leading-tight ${ex.completed ? 'text-slate-500 line-through' : 'text-white'}`}>{ex.name} {(isLinkedToNext || isLinkedFromPrev) && <span className="ml-2 text-xs font-normal text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Combinado</span>}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-400"><span>{ex.sets} x {ex.reps}</span>{ex.weight && <span className="text-emerald-400 font-medium">• {ex.weight}kg</span>}{ex.rir && <span className="text-orange-400 text-xs bg-orange-400/10 px-1.5 rounded ml-1">RIR {ex.rir}</span>}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <button onClick={(e) => openVideoModal(ex.name, e)} className="p-2 hover:bg-red-500/20 rounded-full text-slate-500 hover:text-red-500 transition-colors"><Youtube className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); startTimer(ex.restSeconds || 60, ex.id); }} className="p-2 hover:bg-slate-700 rounded-full hover:text-blue-400 transition-colors"><Timer className="w-5 h-5" /></button>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className={`px-4 pb-4 border-t border-slate-700/50 bg-slate-900/30 ${isLinkedFromPrev || isLinkedToNext ? 'pl-6' : ''}`}>
                    <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide"><button onClick={() => handleGetTip(ex.name, 'breathing')} className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-500/20 whitespace-nowrap"><Wind className="w-3 h-3" /> Respiração</button><button onClick={() => toggleSupersetLink(index)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${ex.linkedToNext ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{ex.linkedToNext ? <Unlink className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}{ex.linkedToNext ? 'Desagrupar' : 'Combinar Próximo'}</button><button onClick={() => removeExercise(ex.id)} className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/20 ml-auto whitespace-nowrap"><Trash2 className="w-3 h-3" /></button></div>
	                    <div className="grid grid-cols-2 gap-2 mb-4">
	                      <div>
	                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Séries alvo</label>
	                        <input type="text" value={ex.sets} onChange={(e) => updateExerciseData(ex.id, 'sets', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-center text-white focus:border-emerald-500 focus:outline-none" />
                          {previousExercise && <p className="mt-1 text-[10px] text-slate-600 text-center">ant. {previousExercise.sets || '-'}</p>}
	                      </div>
	                      <div>
	                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reps alvo</label>
	                        <input type="text" value={ex.reps} onChange={(e) => updateExerciseData(ex.id, 'reps', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-center text-white focus:border-emerald-500 focus:outline-none" />
                          {previousExercise && <p className="mt-1 text-[10px] text-slate-600 text-center">ant. {previousExercise.reps || '-'}</p>}
	                      </div>
	                    </div>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Reps Realizadas</label>
                        <div className="flex gap-1">
                          <button onClick={() => removePerformedSet(ex)} className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-bold">- série</button>
                          <button onClick={() => addPerformedSet(ex)} className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">+ série</button>
                        </div>
                      </div>
	                      <div className="flex flex-wrap gap-2">{setsArray.map((rep, idx) => (<div key={idx} className="flex flex-col items-center gap-1"><span className="text-[10px] text-slate-500">S{idx+1}</span><input type="number" placeholder="-" value={rep} onChange={(e) => updateExerciseData(ex.id, 'performedReps', e.target.value, idx)} className="w-12 h-10 bg-slate-800 border border-slate-600 rounded-lg text-center text-white focus:border-emerald-500 focus:outline-none"/>{previousExercise && <span className="text-[10px] text-slate-600 leading-none">ant. {previousReps[idx] || '-'}</span>}</div>))}</div>
	                    </div>
	                    <div className="grid grid-cols-4 gap-2 mb-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Carga</label>
                          <input type="number" value={ex.weight || ''} onChange={(e) => updateExerciseData(ex.id, 'weight', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-center text-white focus:border-emerald-500 focus:outline-none" />
                          {previousExercise && <p className="mt-1 text-[10px] text-slate-600 text-center">ant. {formatPreviousValue(previousExercise.weight, 'kg')}</p>}
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">RIR</label>
                            <Info className="w-3 h-3 text-slate-600 cursor-pointer" onClick={() => setRirModalOpen(true)} />
                          </div>
                          <input type="text" placeholder="-" value={ex.rir || ''} onChange={(e) => updateExerciseData(ex.id, 'rir', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-center text-white focus:border-orange-500 focus:outline-none" />
                          {previousExercise && <p className="mt-1 text-[10px] text-slate-600 text-center">ant. {formatPreviousValue(previousExercise.rir)}</p>}
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Tempo</label>
                            <Clock className="w-3 h-3 text-slate-600 cursor-pointer" onClick={() => setTempoModalOpen(true)} />
                          </div>
                          <input type="text" placeholder="3010" value={ex.cadence || ''} onChange={(e) => updateExerciseData(ex.id, 'cadence', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-center text-white focus:border-blue-500 focus:outline-none" />
                          {previousExercise && <p className="mt-1 text-[10px] text-slate-600 text-center">ant. {formatPreviousValue(previousExercise.cadence)}</p>}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex justify-center items-center gap-1"><Timer className="w-3 h-3"/> Descanso</label>
                          <div className="relative">
                            <input type="number" value={ex.restSeconds} onChange={(e) => updateExerciseData(ex.id, 'restSeconds', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-center text-white focus:border-blue-500 focus:outline-none" />
                            <span className="absolute right-1 top-2 text-[10px] text-slate-500">s</span>
                          </div>
                        </div>
                      </div>
                      {nextLoadSuggestion && (
                        <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-emerald-300">Próx. carga sugerida</p>
                            <p className="text-[10px] text-emerald-200/70">+2,5% a +5% da carga atual</p>
                          </div>
                          <span className="text-sm font-black text-emerald-200 whitespace-nowrap">{nextLoadSuggestion.label}</span>
                        </div>
                      )}
	                    <textarea placeholder="Anotações..." value={ex.notes || ''} onChange={(e) => updateExerciseData(ex.id, 'notes', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:border-purple-500 focus:outline-none h-16 resize-none"/>
                      {previousExercise?.notes && (
                        <div className="mt-2 rounded-lg border border-slate-700/70 bg-slate-900/50 p-2">
                          <p className="text-[10px] font-bold uppercase text-slate-600 mb-1">Anotação anterior</p>
                          <p className="text-xs text-slate-500 italic">{previousExercise.notes}</p>
                        </div>
                      )}
	                    {previousExercise && (
	                      <div className="mt-3 bg-slate-800/70 border border-slate-700 rounded-lg p-3">
	                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mb-2">
	                          <CalendarDays className="w-3 h-3 text-emerald-400" />
	                          Sessão anterior
	                        </div>
	                        <div className="grid grid-cols-4 gap-2 text-xs text-slate-400">
	                          <div><span className="text-slate-600">Carga</span><div className="font-bold text-slate-300">{formatPreviousValue(previousExercise.weight, 'kg')}</div></div>
	                          <div><span className="text-slate-600">Reps</span><div className="font-bold text-slate-300">{formatPreviousReps(previousExercise.performedReps)}</div></div>
	                          <div><span className="text-slate-600">RIR</span><div className="font-bold text-slate-300">{formatPreviousValue(previousExercise.rir)}</div></div>
	                          <div><span className="text-slate-600">Tempo</span><div className="font-bold text-slate-300">{formatPreviousValue(previousExercise.cadence)}</div></div>
	                        </div>
	                      </div>
	                    )}
                  </div>
                )}
                {isLinkedToNext && <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 z-20 bg-slate-800 border border-slate-600 rounded-full p-1 shadow-lg"><LinkIcon className="w-3 h-3 text-emerald-500" /></div>}
              </div>
            );
          })}
        </div>

        <div className="mt-8 mb-4">
           <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
             <label className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-2">
               <FileText className="w-4 h-4 text-emerald-500" />
               Anotações Gerais - {activeTab}
             </label>
             <textarea placeholder="Como você se sentiu hoje?" value={workoutNotes[`${program.id}_${activeTab}`] || ''} onChange={(e) => handleNotesChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500 h-24 resize-none"/>
             {latestSession?.generalNotes && (
               <div className="mt-2 rounded-lg border border-slate-700/70 bg-slate-900/50 p-3">
                 <p className="text-[10px] font-bold uppercase text-slate-600 mb-1">Anotação geral anterior</p>
                 <p className="text-xs text-slate-500 italic">{latestSession.generalNotes}</p>
               </div>
             )}
           </div>
        </div>

        <div className="mb-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-300">
              <CalendarDays className="w-4 h-4 text-emerald-500" />
              Ultimo treino
            </h3>
            <div className="flex gap-2">
              {latestSession && (
                <>
                  <button onClick={() => onResumeSession(latestSession)} className="text-xs bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" />
                    Retomar
                  </button>
                  <button onClick={handleDeleteLatestSession} className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                    Excluir
                  </button>
                </>
              )}
              <button onClick={onOpenCalendar} className="text-xs bg-slate-900 border border-slate-700 text-emerald-300 px-3 py-1.5 rounded-lg font-bold">
                Calendario
              </button>
            </div>
          </div>

          {latestSession ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Data</span>
                  <span className="text-xs font-bold text-white">{formatSessionDate(latestSession.completedAt)}</span>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Tempo</span>
                  <span className="text-xs font-bold text-white">{formatWorkoutTime(latestSession.durationSeconds)}</span>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Volume</span>
                  <span className="text-xs font-bold text-white">{latestSessionVolume ? Math.round(latestSessionVolume) : '-'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>{latestCompletedCount}/{latestSession.exercises.length} exercicios marcados</span>
                <span>{getDayHistory().length} sessoes no historico</span>
              </div>

              <div className="space-y-2">
                {latestSession.exercises.slice(0, 6).map(ex => (
                  <div key={`${latestSession.id}_${ex.exerciseId}`} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs items-center">
                    <span className="text-slate-300 truncate">{ex.name}</span>
                    <span className="text-emerald-300 font-bold">{ex.weight || '-'}kg</span>
                    <span className="text-slate-400">{ex.performedReps.filter(Boolean).join('/') || '-'}</span>
                  </div>
                ))}
              </div>
              {latestSession.exercises.length > 6 && (
                <p className="text-xs text-slate-500 mt-2">+{latestSession.exercises.length - 6} exercicios no calendario</p>
              )}
              {latestSession.generalNotes && <p className="text-xs text-slate-500 italic mt-3">{latestSession.generalNotes}</p>}
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500 mb-3">Quando voce salvar este treino, ele aparece aqui e no calendario.</p>
              <button onClick={onOpenCalendar} className="text-sm bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg font-bold">
                Abrir calendario
              </button>
            </div>
          )}
        </div>

        {Object.keys(workouts).length > 1 && <div className="py-4 flex justify-center"><button onClick={() => setDeleteTabModal(true)} className="flex items-center gap-2 text-xs font-medium text-red-400/60 hover:text-red-400 px-4 py-2 transition-all"><Trash2 className="w-4 h-4" /> Excluir Aba "{activeTab}"</button></div>}
        <div className="h-20"></div>
      </div>

      <button onClick={() => setIsFormOpen(true)} className={`fixed bottom-24 right-6 text-slate-900 p-4 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 z-20 ${isCardioOrFlex(activeTab) ? 'bg-rose-500 hover:bg-rose-400' : 'bg-emerald-500 hover:bg-emerald-400'}`}><Plus className="w-8 h-8" /></button>

      {/* Overlays / Modals */}
      {timer.timeLeft > 0 && <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 z-40 shadow-2xl animate-in slide-in-from-bottom-5"><div className="max-w-md mx-auto flex items-center justify-between"><div className="flex items-center gap-3"><div className="relative"><svg className="w-12 h-12 -rotate-90"><circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" /><circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - timer.timeLeft / timer.initialTime)} className="text-blue-500 transition-all duration-1000 ease-linear" /></svg><span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{formatTime(timer.timeLeft)}</span></div><div><p className="text-xs text-slate-400 font-medium uppercase">Descansando</p><p className="text-sm font-bold text-white">Série em andamento</p></div></div><div className="flex items-center gap-2"><button onClick={() => addTime(-10)} className="p-2 text-slate-400 hover:text-white bg-slate-700 rounded-lg text-xs font-bold">-10</button><button onClick={timer.isRunning ? pauseTimer : resumeTimer} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg">{timer.isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button><button onClick={() => addTime(10)} className="p-2 text-slate-400 hover:text-white bg-slate-700 rounded-lg text-xs font-bold">+10</button><button onClick={stopTimer} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><X className="w-5 h-5" /></button></div></div></div>}
      {isFormOpen && <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"><div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">Novo Exercício</h3><button onClick={() => setIsFormOpen(false)} className="text-slate-400"><X className="w-6 h-6"/></button></div><form onSubmit={handleAddExercise} className="space-y-4"><input type="text" placeholder="Nome" value={newExercise.name} onChange={e => setNewExercise({...newExercise, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" autoFocus /><div className="grid grid-cols-3 gap-3"><input type="number" placeholder="Séries" value={newExercise.sets} onChange={e => setNewExercise({...newExercise, sets: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-white" /><input type="text" placeholder="Reps" value={newExercise.reps} onChange={e => setNewExercise({...newExercise, reps: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-white" /><input type="text" placeholder="Kg" value={newExercise.weight} onChange={e => setNewExercise({...newExercise, weight: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-white" /></div><button type="submit" className="w-full bg-emerald-500 text-slate-900 font-bold py-4 rounded-xl">Salvar</button></form></div></div>}
      {rirModalOpen && <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center" onClick={() => setRirModalOpen(false)}><div className="bg-slate-800 p-6 rounded-xl max-w-xs"><h3 className="text-white font-bold mb-2">Tabela RIR</h3><p className="text-slate-400 text-sm">RIR 0: Falha<br/>RIR 1: +1 rep sobra<br/>RIR 2: +2 reps sobram</p></div></div>}
      {tempoModalOpen && <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center" onClick={() => setTempoModalOpen(false)}><div className="bg-slate-800 p-6 rounded-xl max-w-xs"><h3 className="text-white font-bold mb-2">Cadência (Tempo)</h3><p className="text-slate-400 text-sm">3-0-1-0 significa:<br/>3s descendo<br/>0s pausa<br/>1s subindo<br/>0s pausa</p></div></div>}
      {isAiModalOpen && <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-slate-800 w-full max-w-md rounded-2xl border border-purple-500/30 p-6"><div className="flex justify-between mb-4"><h3 className="text-white font-bold">Coach IA</h3><button onClick={()=>setIsAiModalOpen(false)} className="text-slate-400"><X/></button></div>{aiLoading ? <Loader2 className="animate-spin mx-auto text-purple-500 w-8 h-8"/> : (<form onSubmit={generateAIWorkout} className="space-y-4"><input placeholder="Objetivo" value={aiParams.focus} onChange={e=>setAiParams({...aiParams, focus: e.target.value})} className="w-full bg-slate-900 border-slate-700 rounded-xl p-3 text-white"/><button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl">Gerar</button></form>)}</div></div>}
      {tipModal.isOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80" onClick={() => setTipModal({ ...tipModal, isOpen: false })}><div className="bg-slate-800 w-full max-w-sm rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}><h4 className="text-lg font-bold text-white mb-2">{tipModal.title}</h4>{tipModal.loading ? <Loader2 className="animate-spin text-slate-400"/> : <p className="text-slate-300 text-sm">{tipModal.text}</p>}<button onClick={() => setTipModal({ ...tipModal, isOpen: false })} className="absolute top-4 right-4 text-slate-500"><X className="w-5 h-5" /></button></div></div>}
      {stopWorkoutModal && <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"></div><div className="bg-slate-800 w-full max-w-sm rounded-2xl border border-red-500/30 shadow-2xl relative z-10 p-6"><div className="flex flex-col items-center text-center mb-6"><div className="bg-red-500/10 p-4 rounded-full mb-4"><StopCircle className="w-8 h-8 text-red-500" /></div><h3 className="text-xl font-bold text-white mb-2">Finalizar Treino?</h3><p className="text-slate-400 text-sm">Tempo total: <span className="text-white font-bold">{formatWorkoutTime(elapsedWorkoutTime)}</span>. A sessão vai para a planilha e o treino fica pronto para a próxima vez.</p></div><div className="flex gap-3"><button onClick={() => setStopWorkoutModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl">Cancelar</button><button onClick={confirmStopWorkout} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl">Salvar Sessão</button></div></div></div>}
      {deleteTabModal && <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"><div className="bg-slate-800 w-full max-w-sm rounded-2xl border border-red-500/30 shadow-2xl p-6"><h3 className="text-xl font-bold text-white mb-2 text-center">Excluir {activeTab}?</h3><div className="flex gap-3 mt-4"><button onClick={() => setDeleteTabModal(false)} className="flex-1 bg-slate-700 text-white py-3 rounded-xl">Cancelar</button><button onClick={handleDeleteTab} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl">Sim, Excluir</button></div></div></div>}
      
      {/* VIDEO MODAL */}
      {videoModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90" onClick={() => setVideoModal({isOpen: false, exerciseName: ''})}>
          <div className="w-full max-w-3xl bg-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Youtube className="w-5 h-5 text-red-500" />
                 {videoModal.exerciseName}
               </h3>
               <button onClick={() => setVideoModal({isOpen: false, exerciseName: ''})} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            <div className="relative pt-[56.25%] bg-black">
               <iframe 
                 className="absolute inset-0 w-full h-full"
                 src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(videoModal.exerciseName + " exercise technique tutorial")}`}
                 title="YouTube video player" 
                 frameBorder="0" 
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                 allowFullScreen
               ></iframe>
            </div>
            <div className="p-4 bg-slate-800 flex justify-between items-center">
              <p className="text-xs text-slate-500">Resultados fornecidos pelo YouTube.</p>
              <a 
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(videoModal.exerciseName + " execution")}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                Abrir no App <ExternalLink className="w-3 h-3"/>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutTracker;
