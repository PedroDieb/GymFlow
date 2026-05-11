import React, { useRef, useState } from 'react';
import { Dumbbell, Cloud, Utensils, Sparkles, Loader2, Trophy, User, Settings, CheckCircle2, AlertTriangle, BarChart3, Download, Upload } from 'lucide-react';
import { getMealSuggestion } from '../services/geminiService';
import { ViewState } from '../types';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  user: any;
  isLoading: boolean;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, user, isLoading, onExportBackup, onImportBackup }) => {
  const [dailyTip, setDailyTip] = useState('');
  const [tipLoading, setTipLoading] = useState(false);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const handleGetMeal = async () => {
    setTipLoading(true);
    const tip = await getMealSuggestion();
    setDailyTip(tip);
    setTipLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="mb-10 text-center">
        <div className="bg-emerald-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20 relative group">
          <Dumbbell className="w-10 h-10 text-slate-900" />
          <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1.5 border-2 border-slate-900">
             <Cloud className="w-3 h-3 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">GymFlow</h1>
        <p className="text-slate-400 mt-2">Histórico, carga e evolução por treino</p>
        
        {isLoading && <p className="text-xs text-blue-400 mt-4 animate-pulse">Conectando ao servidor...</p>}
        {!isLoading && !user && (
           <p className="text-xs text-orange-400 mt-4 flex items-center justify-center gap-1">
             <AlertTriangle className="w-3 h-3" /> Modo Offline (Sincronização desativada)
           </p>
        )}
      </div>

      {/* Widget Nutrição IA */}
      <div className="w-full max-w-md mb-6 bg-slate-800/50 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden">
         <div className="bg-orange-500/10 p-2 rounded-full shrink-0">
            <Utensils className="w-5 h-5 text-orange-400" />
         </div>
         <div className="flex-1 z-10">
            <h3 className="text-xs font-bold text-orange-400 uppercase mb-1">Chef Pós-Treino</h3>
            {tipLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-500"/> : (
                <p className="text-sm text-slate-300 italic">"{dailyTip || 'Clique para ver uma sugestão de refeição.'}"</p>
            )}
            {!dailyTip && !tipLoading && (
                <button onClick={handleGetMeal} className="mt-2 text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded hover:bg-orange-500/30 transition-colors">
                    Gerar Sugestão
                </button>
            )}
         </div>
         <Sparkles className="absolute -bottom-4 -right-4 w-20 h-20 text-orange-500/5 rotate-12" />
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {/* Painel de Treino (Ativo) */}
        <button 
          onClick={() => onNavigate('programList')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all group shadow-lg relative overflow-hidden"
        >
          <div className="bg-emerald-500/10 p-3 rounded-full group-hover:bg-emerald-500/20 transition-colors z-10">
            <Trophy className="w-8 h-8 text-emerald-500" />
          </div>
          <span className="font-bold text-lg z-10">Meus Programas</span>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Perfil (Ativo) */}
        <button 
          onClick={() => onNavigate('profile')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all group"
        >
          <div className="bg-slate-700/50 p-3 rounded-full group-hover:bg-blue-500/20 transition-colors">
            <User className="w-8 h-8 text-slate-500 group-hover:text-blue-500" />
          </div>
          <span className="font-bold text-lg text-slate-400 group-hover:text-white">Perfil</span>
        </button>

        {/* Review Semanal (Novo) */}
        <button 
          onClick={() => onNavigate('weeklyReview')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all group"
        >
          <div className="bg-slate-700/50 p-3 rounded-full group-hover:bg-purple-500/20 transition-colors">
            <BarChart3 className="w-8 h-8 text-slate-500 group-hover:text-purple-500" />
          </div>
          <span className="font-bold text-lg text-slate-400 group-hover:text-white">Review Semanal</span>
        </button>

        <button className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl flex flex-col items-center gap-3 opacity-50 cursor-not-allowed">
          <div className="bg-slate-700/50 p-3 rounded-full">
            <Settings className="w-8 h-8 text-slate-500" />
          </div>
          <span className="font-bold text-lg text-slate-500">Config</span>
        </button>
      </div>

      <div className="w-full max-w-md mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={onExportBackup}
          className="bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-300"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Backup
        </button>
        <button
          onClick={() => backupInputRef.current?.click()}
          className="bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-300"
        >
          <Upload className="w-4 h-4 text-blue-400" />
          Restaurar
        </button>
        <input
          ref={backupInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImportBackup(file);
            event.target.value = '';
          }}
        />
      </div>
      
      <div className="mt-8 text-xs text-slate-600 flex items-center gap-1">
        {user ? (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Sincronizado via Firebase
          </>
        ) : (
          <>
            <Cloud className="w-3 h-3 text-slate-600" />
            Armazenamento neste navegador
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
