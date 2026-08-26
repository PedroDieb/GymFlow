import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Plus, Edit2, Trash2, Calendar, Target, Cloud, X, Loader2, ClipboardList } from 'lucide-react';
import { Burst } from './GfIcons';
import { Program, ViewState, Exercise } from '../types';
import { generateFullProgramData } from '../services/geminiService';
import { createPhaseOneProgram } from '../data/workoutTemplates';

interface ProgramListProps {
  programs: Program[];
  onCreateProgram: (p: Program) => void;
  onUpdateProgram: (p: Program) => void;
  onDeleteProgram: (id: string) => void;
  onSelectProgram: (id: string) => void;
  onNavigate: (view: ViewState) => void;
}

const ProgramList: React.FC<ProgramListProps> = ({ programs, onCreateProgram, onUpdateProgram, onDeleteProgram, onSelectProgram, onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [currentObjProgram, setCurrentObjProgram] = useState<Program | null>(null);
  const [objText, setObjText] = useState('');

  // AI Generator State
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [aiGenParams, setAiGenParams] = useState({ goal: '', days: '4', level: 'Intermediário' });
  const [aiGenLoading, setAiGenLoading] = useState(false);

  const handleSaveProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgram.name) return;

    if (editingId) {
      const progToUpdate = programs.find(p => p.id === editingId);
      if (progToUpdate) {
        onUpdateProgram({ ...progToUpdate, ...newProgram });
      }
    } else {
      const program: Program = {
        id: crypto.randomUUID(),
        name: newProgram.name,
        startDate: newProgram.startDate,
        endDate: newProgram.endDate,
        workouts: { 'A': [], 'B': [], 'C': [] },
        objectives: ''
      };
      onCreateProgram(program);
    }
    closeModal();
  };

  const handleGenerateFullProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGenParams.goal) return;
    setAiGenLoading(true);

    const generatedJson = await generateFullProgramData(aiGenParams.goal, aiGenParams.days, aiGenParams.level);

    if (generatedJson && generatedJson.workouts) {
       const processedWorkouts: any = {};
       Object.keys(generatedJson.workouts).forEach(key => {
           // We expect array of partial exercises
           const rawExercises = generatedJson.workouts[key] as any[]; 
           processedWorkouts[key] = rawExercises.map((ex) => ({
                id: crypto.randomUUID(),
                name: ex.name || "Exercicio",
                sets: ex.sets || "3",
                reps: ex.reps || "12",
                weight: ex.weight || "0",
                completed: false,
                performedReps: Array(parseInt(ex.sets) || 3).fill(''),
                notes: '',
                rir: '',
                cadence: ex.cadence || '',
                restSeconds: ex.restSeconds || 60,
                linkedToNext: false
            } as Exercise));
       });

       const newProg: Program = {
           id: crypto.randomUUID(),
           name: generatedJson.name || "Programa IA",
           objectives: generatedJson.objectives || "",
           startDate: new Date().toISOString().split('T')[0],
           endDate: '',
           workouts: processedWorkouts
       };

       onCreateProgram(newProg);
       setIsAiGeneratorOpen(false);
       setAiGenParams({ goal: '', days: '4', level: 'Intermediário' });
    } else {
        alert("O Coach IA teve um problema. Tente novamente.");
    }
    setAiGenLoading(false);
  };

  const handleCreatePhaseOneProgram = () => {
    const program = createPhaseOneProgram();
    onCreateProgram(program);
    onSelectProgram(program.id);
  };

  const openEdit = (prog: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewProgram({ name: prog.name, startDate: prog.startDate, endDate: prog.endDate || '' });
    setEditingId(prog.id);
    setIsModalOpen(true);
  };

  const openObjectives = (prog: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentObjProgram(prog);
    setObjText(prog.objectives || '');
    setIsObjModalOpen(true);
  };

  const deleteProgram = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza? Isso apagará todos os treinos deste programa da nuvem.")) {
      onDeleteProgram(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewProgram({ name: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
    setEditingId(null);
  };

  const handleSaveObjectives = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentObjProgram) {
        onUpdateProgram({ ...currentObjProgram, objectives: objText });
    }
    setIsObjModalOpen(false);
    setCurrentObjProgram(null);
  };

  const activePrograms = programs.filter(p => !p.endDate);
  const finishedPrograms = programs.filter(p => p.endDate);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 animate-in slide-in-from-right duration-300">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6 pt-4">
          <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h1 className="gf-display text-4xl">Programas</h1>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center gap-3">
             <h2 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider"><Burst className="w-4 h-4 text-slate-500" />Ativos</h2>
             <div className="flex gap-2">
                <button
                  onClick={handleCreatePhaseOneProgram}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                >
                  <ClipboardList className="w-3 h-3" />
                  Fase 1
                </button>
                <button 
                  onClick={() => setIsAiGeneratorOpen(true)}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg shadow-purple-500/20 transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  Criar com IA
                </button>
             </div>
          </div>
          
          {activePrograms.length === 0 && <p className="text-slate-600 text-sm italic">Nenhum programa ativo.</p>}
          {activePrograms.map((prog, idx) => (
            <div 
              key={prog.id}
              onClick={() => onSelectProgram(prog.id)}
              className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative group cursor-pointer hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-xl text-white flex items-baseline gap-3"><span className="gf-meta">{String(idx + 1).padStart(2, '0')}</span>{prog.name}</h3>
                <div className="flex gap-1">
                    <button onClick={(e) => openObjectives(prog, e)} className={`p-2 rounded-lg transition-colors ${prog.objectives ? 'text-blue-400 hover:bg-blue-500/10' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-700'}`}><Target className="w-4 h-4"/></button>
                    <button onClick={(e) => openEdit(prog, e)} className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-slate-700 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={(e) => deleteProgram(prog.id, e)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded-md mb-3">
                <Calendar className="w-3 h-3" />
                Início: {new Date(prog.startDate).toLocaleDateString('pt-BR')}
              </div>
              {prog.objectives && (
                  <div className="mb-3 bg-blue-500/5 border border-blue-500/10 p-2 rounded-lg flex gap-2 items-start">
                      <Target className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-200 line-clamp-2 italic">{prog.objectives}</p>
                  </div>
              )}
              <div className="text-xs text-slate-400 flex justify-between items-center">
                <span>{Object.keys(prog.workouts || {}).length} divisões de treino</span>
                <span className="flex items-center gap-1"><Cloud className="w-3 h-3" /> Salvo</span>
              </div>
            </div>
          ))}
        </div>

        {finishedPrograms.length > 0 && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider"><Burst className="w-4 h-4 text-slate-500" />Finalizados</h2>
            {finishedPrograms.map(prog => (
              <div key={prog.id} onClick={() => onSelectProgram(prog.id)} className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
                <div className="flex justify-between items-start"><h3 className="font-bold text-lg text-slate-300">{prog.name}</h3><div className="flex gap-1"><button onClick={(e) => openEdit(prog, e)} className="p-2 text-slate-600 hover:text-white"><Edit2 className="w-4 h-4"/></button></div></div>
                <div className="text-xs text-slate-500 mt-1">{new Date(prog.startDate).toLocaleDateString('pt-BR')} - {new Date(prog.endDate).toLocaleDateString('pt-BR')}</div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => { closeModal(); setIsModalOpen(true); }} className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-400 text-slate-900 p-4 rounded-full shadow-lg shadow-emerald-500/30 transition-all hover:scale-110 active:scale-95 z-20"><Plus className="w-8 h-8" /></button>

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Editar Programa' : 'Novo Ciclo (Manual)'}</h3>
              <form onSubmit={handleSaveProgram} className="space-y-4">
                <div><label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Nome</label><input type="text" placeholder="Ex: Bumbum na Nuca" value={newProgram.name} onChange={e => setNewProgram({...newProgram, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" autoFocus /></div>
                <div><label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Início</label><input type="date" value={newProgram.startDate} onChange={e => setNewProgram({...newProgram, startDate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" /></div>
                {editingId && (<div><label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Fim (Para Arquivar)</label><input type="date" value={newProgram.endDate} onChange={e => setNewProgram({...newProgram, endDate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" /></div>)}
                <div className="flex gap-2 mt-4"><button type="button" onClick={closeModal} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-bold">Cancelar</button><button type="submit" className="flex-1 bg-emerald-500 text-slate-900 py-3 rounded-xl font-bold">Salvar</button></div>
              </form>
            </div>
          </div>
        )}

        {isAiGeneratorOpen && (
            <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-purple-500/30 shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            Coach IA: Criar Programa
                        </h3>
                        {!aiGenLoading && <button onClick={() => setIsAiGeneratorOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>}
                    </div>

                    {aiGenLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                            <p className="text-white font-medium text-lg">Criando sua periodização...</p>
                            <p className="text-slate-400 text-sm mt-2">Isso pode levar alguns segundos.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleGenerateFullProgram} className="space-y-4">
                            <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl mb-2">
                                <p className="text-sm text-purple-200 leading-relaxed">
                                    O Coach vai criar um ciclo completo (várias semanas), dividindo os dias (A, B, C...) e escolhendo os exercícios ideais para seu objetivo.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Objetivo Principal</label>
                                <input type="text" placeholder="Ex: Hipertrofia de Glúteos..." value={aiGenParams.goal} onChange={e => setAiGenParams({...aiGenParams, goal: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none" autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Dias por Semana</label>
                                    <select value={aiGenParams.days} onChange={e => setAiGenParams({...aiGenParams, days: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none">
                                        <option value="2">2 dias</option>
                                        <option value="3">3 dias</option>
                                        <option value="4">4 dias</option>
                                        <option value="5">5 dias</option>
                                        <option value="6">6 dias</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Nível</label>
                                    <select value={aiGenParams.level} onChange={e => setAiGenParams({...aiGenParams, level: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none">
                                        <option value="Iniciante">Iniciante</option>
                                        <option value="Intermediário">Intermediário</option>
                                        <option value="Avançado">Avançado</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" disabled={!aiGenParams.goal} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                <Sparkles className="w-5 h-5" />
                                Gerar Programa Completo
                            </button>
                        </form>
                    )}
                </div>
            </div>
        )}

        {isObjModalOpen && (
            <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-800 w-full max-w-sm rounded-2xl border border-blue-500/30 shadow-2xl p-6">
                    <div className="flex items-center gap-3 mb-4"><div className="bg-blue-500/20 p-2 rounded-full"><Target className="w-6 h-6 text-blue-400" /></div><h3 className="text-xl font-bold text-white">Objetivos</h3></div>
                    <form onSubmit={handleSaveObjectives}><textarea value={objText} onChange={(e) => setObjText(e.target.value)} placeholder="Descreva o foco..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 focus:outline-none h-40 resize-none mb-4" autoFocus /><div className="flex gap-2"><button type="button" onClick={() => setIsObjModalOpen(false)} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-bold">Cancelar</button><button type="submit" className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold">Salvar</button></div></form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProgramList;
