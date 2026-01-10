import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, TrendingUp, Award, Zap, AlertCircle, Loader2, Share2, BarChart3 } from 'lucide-react';
import { Program, WorkoutNotes, UserProfile, WeeklyReviewData, ViewState } from '../types';
import { generateWeeklyAnalysis } from '../services/geminiService';

interface WeeklyReviewProps {
  programs: Program[];
  notes: WorkoutNotes;
  profile: UserProfile;
  onNavigate: (view: ViewState) => void;
}

const WeeklyReview: React.FC<WeeklyReviewProps> = ({ programs, notes, profile, onNavigate }) => {
  const [data, setData] = useState<WeeklyReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Simulate delay for "Analyzing" feel
      await new Promise(r => setTimeout(r, 1000));
      const result = await generateWeeklyAnalysis(programs, notes, profile);
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, [programs, notes, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Analisando Progresso...</h2>
        <p className="text-slate-400">Compilando cargas, notas e consistência.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Erro na Análise</h2>
        <p className="text-slate-400 mb-6">Não foi possível gerar o relatório. Tente adicionar mais dados aos seus treinos.</p>
        <button onClick={() => onNavigate('dashboard')} className="bg-slate-800 px-6 py-3 rounded-xl text-white">Voltar</button>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 animate-in slide-in-from-right duration-500">
      <div className="max-w-md mx-auto pb-10">
        <div className="flex items-center gap-4 mb-6 pt-4">
          <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" /> Review IA
          </h1>
        </div>

        {/* Score Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-500"></div>
          <h3 className="text-slate-400 text-sm uppercase font-bold tracking-wider mb-2">Consistência Semanal</h3>
          <div className={`text-6xl font-black ${getScoreColor(data.consistencyScore)} mb-2`}>
            {data.consistencyScore}
          </div>
          <p className="text-slate-300 text-sm italic">"{data.summary}"</p>
        </div>

        <div className="grid gap-4">
          {/* Highlight */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-slate-800 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4">
             <div className="bg-emerald-500/20 p-3 rounded-full shrink-0">
               <Award className="w-6 h-6 text-emerald-400" />
             </div>
             <div>
               <h4 className="font-bold text-emerald-400 text-sm uppercase mb-1">Destaque</h4>
               <p className="text-slate-200 text-sm leading-relaxed">{data.highlight}</p>
             </div>
          </div>

          {/* Improvement */}
          <div className="bg-gradient-to-br from-orange-500/10 to-slate-800 border border-orange-500/20 rounded-2xl p-5 flex items-start gap-4">
             <div className="bg-orange-500/20 p-3 rounded-full shrink-0">
               <TrendingUp className="w-6 h-6 text-orange-400" />
             </div>
             <div>
               <h4 className="font-bold text-orange-400 text-sm uppercase mb-1">Foco para Melhorar</h4>
               <p className="text-slate-200 text-sm leading-relaxed">{data.improvementArea}</p>
             </div>
          </div>

          {/* Motivation */}
          <div className="bg-gradient-to-br from-purple-500/10 to-slate-800 border border-purple-500/20 rounded-2xl p-6 text-center relative">
             <Zap className="w-8 h-8 text-purple-400 mx-auto mb-3" />
             <p className="text-white font-medium text-lg italic">"{data.motivationalQuote}"</p>
             <p className="text-purple-400 text-xs mt-2 font-bold uppercase">- Coach GymFlow</p>
          </div>
        </div>

        <button 
          onClick={() => onNavigate('dashboard')}
          className="w-full mt-8 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-4 rounded-xl transition-all"
        >
          Voltar ao Menu
        </button>
      </div>
    </div>
  );
};

export default WeeklyReview;