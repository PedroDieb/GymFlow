import React from 'react';
import { ArrowLeft, Target, ChevronDown, Plus } from 'lucide-react';
import { Program, ViewState } from '../types';

interface ProgramDaysManagerProps {
  program: Program;
  onUpdateProgram: (p: Program) => void;
  onNavigate: (view: ViewState) => void;
  onSelectDay: (day: string) => void;
}

const ProgramDaysManager: React.FC<ProgramDaysManagerProps> = ({ program, onUpdateProgram, onNavigate, onSelectDay }) => {
  const workouts = program.workouts || {};

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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 animate-in slide-in-from-right duration-300">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-2 pt-4">
          <button onClick={() => onNavigate('programList')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{program.name}</h1>
            <p className="text-xs text-slate-400">Gerenciar divisão de treinos</p>
          </div>
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
          {Object.keys(workouts).map((key) => (
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