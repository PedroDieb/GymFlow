import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Save, Scale, Ruler, Calendar, Target, Check } from 'lucide-react';
import { UserProfile, ViewState } from '../types';

interface ProfileProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onNavigate: (view: ViewState) => void;
}

const Profile: React.FC<ProfileProps> = ({ profile, onUpdateProfile, onNavigate }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 animate-in slide-in-from-right duration-300">
        <div className="max-w-md mx-auto">
             <div className="flex items-center gap-4 mb-6 pt-4">
              <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-400" />
              </button>
              <h1 className="text-2xl font-bold text-white">Perfil</h1>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl mb-6 flex flex-col items-center animate-in fade-in duration-500">
                 <div className="bg-slate-700 p-4 rounded-full mb-4">
                    <User className="w-12 h-12 text-slate-400" />
                 </div>
                 <h2 className="text-xl font-bold text-white">{formData.displayName || 'Atleta'}</h2>
                 <p className="text-slate-400 text-sm">{formData.goal || 'Definir objetivo'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg space-y-4">
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                            <User className="w-4 h-4" /> Nome
                        </label>
                        <input
                            type="text"
                            value={formData.displayName}
                            onChange={e => handleChange('displayName', e.target.value)}
                            placeholder="Seu nome"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                                <Scale className="w-4 h-4" /> Peso (kg)
                            </label>
                            <input
                                type="text"
                                value={formData.weight}
                                onChange={e => handleChange('weight', e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                            />
                        </div>
                         <div>
                             <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                                <Ruler className="w-4 h-4" /> Altura (cm)
                            </label>
                            <input
                                type="text"
                                value={formData.height}
                                onChange={e => handleChange('height', e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                                <Calendar className="w-4 h-4" /> Idade
                            </label>
                            <input
                                type="text"
                                value={formData.age}
                                onChange={e => handleChange('age', e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                     <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                            <Target className="w-4 h-4" /> Objetivo Principal
                        </label>
                        <input
                            type="text"
                            value={formData.goal}
                            onChange={e => handleChange('goal', e.target.value)}
                            placeholder="Ex: Hipertrofia, Emagrecimento"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                    </div>
                 </div>

                 <button
                    type="submit"
                    className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg ${isSaved ? 'bg-emerald-600 text-white scale-95' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-emerald-500/20'}`}
                 >
                    {isSaved ? <><Check className="w-5 h-5" /> Salvo!</> : <><Save className="w-5 h-5" /> Salvar Perfil</>}
                 </button>
            </form>
        </div>
    </div>
  );
};

export default Profile;