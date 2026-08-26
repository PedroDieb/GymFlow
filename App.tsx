import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithCustomToken, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// Services & Components
import { auth, db, appId, isFirebaseInitialized } from './services/firebase';
import Dashboard from './components/Dashboard';
import ProgramList from './components/ProgramList';
import ProgramDaysManager from './components/ProgramDaysManager';
import WorkoutTracker from './components/WorkoutTracker';
import Profile from './components/Profile';
import WeeklyReview from './components/WeeklyReview';
import WorkoutCalendar from './components/WorkoutCalendar';

// Types
import { ActiveWorkout, Program, WorkoutHistory, WorkoutNotes, ViewState, UserProfile } from './types';

const LOCAL_PROGRAMS_KEY = 'gymflow_programs';
const LOCAL_NOTES_KEY = 'gymflow_notes';
const LOCAL_PROFILE_KEY = 'gymflow_profile';
const LOCAL_HISTORY_KEY = 'gymflow_workout_history';
const LOCAL_NAVIGATION_KEY = 'gymflow_navigation';
const LOCAL_ACTIVE_WORKOUT_KEY = 'gymflow_active_workout';

type NavigationState = {
  currentView: ViewState;
  selectedProgramId: string | null;
  selectedDayTab: string | null;
};

type GymFlowBackup = {
  version: 1;
  exportedAt: string;
  programs: Program[];
  workoutNotes: WorkoutNotes;
  workoutHistory: WorkoutHistory;
  userProfile: UserProfile;
};

const readLocalData = <T,>(key: string, fallback: T): T => {
  if (typeof localStorage === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch (e) {
    console.warn(`Failed to read ${key} from local storage.`, e);
    return fallback;
  }
};

const writeLocalData = <T,>(key: string, value: T) => {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key} to local storage.`, e);
  }
};

const hasObjectData = (value: Record<string, unknown> | null | undefined): boolean => (
  !!value && Object.keys(value).length > 0
);

const hasProfileData = (profile: UserProfile): boolean => (
  Object.values(profile).some(value => String(value || '').trim().length > 0)
);

const getAuthErrorMessage = (error: any): string => {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return 'Esse e-mail já tem conta. Use Entrar.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/missing-email':
      return 'Digite seu e-mail primeiro.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.';
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Falha de conexão. Tente de novo.';
    default:
      return 'Não consegui autenticar agora.';
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [programs, setPrograms] = useState<Program[]>(() => readLocalData<Program[]>(LOCAL_PROGRAMS_KEY, []));
  const [workoutNotes, setWorkoutNotes] = useState<WorkoutNotes>(() => readLocalData<WorkoutNotes>(LOCAL_NOTES_KEY, {}));
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory>(() => readLocalData<WorkoutHistory>(LOCAL_HISTORY_KEY, {}));
  const [userProfile, setUserProfile] = useState<UserProfile>(() => readLocalData<UserProfile>(LOCAL_PROFILE_KEY, {
      displayName: '', weight: '', height: '', age: '', goal: ''
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [authActionLoading, setAuthActionLoading] = useState(false);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>(() => (
    readLocalData<NavigationState>(LOCAL_NAVIGATION_KEY, {
      currentView: 'dashboard',
      selectedProgramId: null,
      selectedDayTab: null,
    }).currentView
  ));
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(() => (
    readLocalData<NavigationState>(LOCAL_NAVIGATION_KEY, {
      currentView: 'dashboard',
      selectedProgramId: null,
      selectedDayTab: null,
    }).selectedProgramId
  ));
  const [selectedDayTab, setSelectedDayTab] = useState<string | null>(() => (
    readLocalData<NavigationState>(LOCAL_NAVIGATION_KEY, {
      currentView: 'dashboard',
      selectedProgramId: null,
      selectedDayTab: null,
    }).selectedDayTab
  ));

  useEffect(() => {
    writeLocalData<NavigationState>(LOCAL_NAVIGATION_KEY, {
      currentView,
      selectedProgramId,
      selectedDayTab,
    });
  }, [currentView, selectedProgramId, selectedDayTab]);

  // Treino em andamento (retomada): { programId, dayTab, startedAt }
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(() => (
    readLocalData<ActiveWorkout | null>(LOCAL_ACTIVE_WORKOUT_KEY, null)
  ));

  const handleSetActiveWorkout = (aw: ActiveWorkout) => {
    const sameWorkout = activeWorkout && activeWorkout.programId === aw.programId && activeWorkout.dayTab === aw.dayTab;
    if (sameWorkout) return; // já marcado — preserva o startedAt original
    const updated: ActiveWorkout = { ...aw, startedAt: activeWorkout?.startedAt ?? aw.startedAt };
    setActiveWorkout(updated);
    writeLocalData<ActiveWorkout | null>(LOCAL_ACTIVE_WORKOUT_KEY, updated);
    if (user && isFirebaseInitialized() && db) {
      setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'state', 'active_workout'), updated, { merge: true }).catch(() => {});
    }
  };

  const handleClearActiveWorkout = () => {
    setActiveWorkout(null);
    writeLocalData<ActiveWorkout | null>(LOCAL_ACTIVE_WORKOUT_KEY, null);
    if (user && isFirebaseInitialized() && db) {
      // Tombstone (não deleteDoc) pra outros dispositivos saberem que foi descartado
      setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'state', 'active_workout'), { clearedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
  };

  // 1. Authentication
  useEffect(() => {
    if (!isFirebaseInitialized() || !auth) {
      console.log("Offline Mode: Firebase not configured.");
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });

    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      signInWithCustomToken(auth, __initial_auth_token).catch((e) => {
        console.error("Auth Error:", e);
        setIsLoading(false);
      });
    }

    return () => unsubscribe();
  }, []);

  // 2. Data Sync
  useEffect(() => {
    // Verify everything is ready before trying to sync
    if (!user || !isFirebaseInitialized() || !db) return;

    try {
      // Listen to Programs
      const progQuery = collection(db, 'artifacts', appId, 'users', user.uid, 'programs');
      const unsubPrograms = onSnapshot(progQuery, async (snapshot) => {
        const loadedProgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program));
        if (snapshot.empty) {
          const localPrograms = readLocalData<Program[]>(LOCAL_PROGRAMS_KEY, []);
          if (localPrograms.length > 0) {
            setPrograms(localPrograms);
            await Promise.all(localPrograms.map(program => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'programs', program.id), program)));
            return;
          }
        }
        setPrograms(loadedProgs);
        writeLocalData(LOCAL_PROGRAMS_KEY, loadedProgs);
      }, (error) => console.error("Error fetching programs:", error));

      // Listen to Notes
      const notesDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'notes', 'general_notes');
      const unsubNotes = onSnapshot(notesDoc, async (docSnap) => {
          if (docSnap.exists()) {
              const loadedNotes = docSnap.data() as WorkoutNotes;
              setWorkoutNotes(loadedNotes);
              writeLocalData(LOCAL_NOTES_KEY, loadedNotes);
          } else {
              const localNotes = readLocalData<WorkoutNotes>(LOCAL_NOTES_KEY, {});
              if (hasObjectData(localNotes)) {
                  await setDoc(notesDoc, localNotes, { merge: true });
              }
          }
      });

      // Listen to Profile
      const profileDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      const unsubProfile = onSnapshot(profileDoc, async (docSnap) => {
          if (docSnap.exists()) {
              const loadedProfile = docSnap.data() as UserProfile;
              setUserProfile(loadedProfile);
              writeLocalData(LOCAL_PROFILE_KEY, loadedProfile);
          } else {
              const localProfile = readLocalData<UserProfile>(LOCAL_PROFILE_KEY, {
                displayName: '', weight: '', height: '', age: '', goal: ''
              });
              if (hasProfileData(localProfile)) {
                  await setDoc(profileDoc, localProfile, { merge: true });
              }
          }
      });

      // Listen to Workout History
      const historyDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'history', 'workout_sessions');
      const unsubHistory = onSnapshot(historyDoc, (docSnap) => {
          if (docSnap.exists()) {
              const loadedHistory = docSnap.data() as WorkoutHistory;
              setWorkoutHistory(loadedHistory);
              writeLocalData(LOCAL_HISTORY_KEY, loadedHistory);
          } else {
              const localHistory = readLocalData<WorkoutHistory>(LOCAL_HISTORY_KEY, {});
              if (hasObjectData(localHistory)) {
                  setDoc(historyDoc, localHistory, { merge: true });
              }
          }
      });

      // Listen to Active Workout (retomada entre dispositivos)
      const activeWorkoutDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'state', 'active_workout');
      const unsubActiveWorkout = onSnapshot(activeWorkoutDoc, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data() as (ActiveWorkout & { clearedAt?: string });
              if (!data.programId) {
                  // Tombstone: outro dispositivo descartou o treino em andamento
                  setActiveWorkout(null);
                  writeLocalData<ActiveWorkout | null>(LOCAL_ACTIVE_WORKOUT_KEY, null);
                  return;
              }
              const loaded: ActiveWorkout = { programId: data.programId, dayTab: data.dayTab, startedAt: data.startedAt };
              setActiveWorkout(loaded);
              writeLocalData<ActiveWorkout | null>(LOCAL_ACTIVE_WORKOUT_KEY, loaded);
          } else {
              // Nada no cloud: sobe o que tiver localmente (uso offline)
              const localActive = readLocalData<ActiveWorkout | null>(LOCAL_ACTIVE_WORKOUT_KEY, null);
              if (localActive) setDoc(activeWorkoutDoc, localActive).catch(() => {});
          }
      });

      return () => {
          unsubPrograms();
          unsubNotes();
          unsubProfile();
          unsubHistory();
          unsubActiveWorkout();
      };
    } catch (e) {
      console.error("Firestore sync error:", e);
    }
  }, [user]);

  const handleEmailAuth = async (email: string, password: string, mode: 'signin' | 'signup') => {
    if (!auth || !isFirebaseInitialized()) {
      setAuthError('Firebase ainda não está configurado neste deploy.');
      return;
    }

    setAuthActionLoading(true);
    setAuthError('');
    setAuthInfo('');
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setAuthError(getAuthErrorMessage(e));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!auth || !isFirebaseInitialized()) {
      setAuthError('Firebase ainda não está configurado neste deploy.');
      return;
    }

    setAuthActionLoading(true);
    setAuthError('');
    setAuthInfo('');
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthInfo('E-mail de recuperação enviado! Confere a caixa de entrada (e o spam).');
    } catch (e) {
      setAuthError(getAuthErrorMessage(e));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    setAuthError('');
    await signOut(auth);
  };

  // --- Database Handlers ---

  const handleCreateProgram = async (program: Program) => {
    // Optimistic update for immediate feedback
    setPrograms(prev => {
      const updatedPrograms = [...prev, program];
      writeLocalData(LOCAL_PROGRAMS_KEY, updatedPrograms);
      return updatedPrograms;
    });

    if (!user || !isFirebaseInitialized() || !db) {
       console.log("Offline mode: Program saved locally only (in memory).");
       return;
    }
    try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'programs', program.id), program);
    } catch (e) { console.error("Error creating program", e); }
  };

  const handleUpdateProgram = async (program: Program) => {
    // Optimistic Update
    setPrograms(prev => {
      const updatedPrograms = prev.map(p => p.id === program.id ? program : p);
      writeLocalData(LOCAL_PROGRAMS_KEY, updatedPrograms);
      return updatedPrograms;
    });
    
    if (!user || !isFirebaseInitialized() || !db) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'programs', program.id), program, { merge: true });
    } catch (e) { console.error("Error updating program", e); }
  };

  const handleDeleteProgram = async (programId: string) => {
    // Optimistic Update
    setPrograms(prev => {
      const updatedPrograms = prev.filter(p => p.id !== programId);
      writeLocalData(LOCAL_PROGRAMS_KEY, updatedPrograms);
      return updatedPrograms;
    });

    if (!user || !isFirebaseInitialized() || !db) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'programs', programId));
    } catch (e) { console.error("Error deleting program", e); }
  };

  const handleUpdateNotes = async (newNotes: WorkoutNotes) => {
      setWorkoutNotes(newNotes); // Optimistic
      writeLocalData(LOCAL_NOTES_KEY, newNotes);
      if (!user || !isFirebaseInitialized() || !db) return;
      try {
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', 'general_notes'), newNotes, { merge: true });
      } catch(e) { console.error("Error saving notes", e); }
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    writeLocalData(LOCAL_PROFILE_KEY, profile);
    if (!user || !isFirebaseInitialized() || !db) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), profile, { merge: true });
    } catch(e) { console.error("Error saving profile", e); }
  };

  const handleUpdateWorkoutHistory = async (history: WorkoutHistory) => {
    setWorkoutHistory(history);
    writeLocalData(LOCAL_HISTORY_KEY, history);
    if (!user || !isFirebaseInitialized() || !db) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'history', 'workout_sessions'), history, { merge: true });
    } catch(e) { console.error("Error saving workout history", e); }
  };

  const handleDeleteWorkoutSession = async (programId: string, dayTab: string, sessionId: string) => {
    const programHistory = workoutHistory[programId];
    if (!programHistory) return;

    const updatedDayHistory = (programHistory[dayTab] || []).filter(session => session.id !== sessionId);
    const updatedProgramHistory = { ...programHistory };

    if (updatedDayHistory.length > 0) {
      updatedProgramHistory[dayTab] = updatedDayHistory;
    } else {
      delete updatedProgramHistory[dayTab];
    }

    const updatedHistory = { ...workoutHistory };
    if (Object.keys(updatedProgramHistory).length > 0) {
      updatedHistory[programId] = updatedProgramHistory;
    } else {
      delete updatedHistory[programId];
    }

    await handleUpdateWorkoutHistory(updatedHistory);
  };

  const handleExportBackup = () => {
    const backup: GymFlowBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      programs,
      workoutNotes,
      workoutHistory,
      userProfile,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gymflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as Partial<GymFlowBackup>;

      if (!Array.isArray(backup.programs) || !backup.workoutNotes || !backup.workoutHistory || !backup.userProfile) {
        alert('Backup inválido.');
        return;
      }

      setPrograms(backup.programs);
      setWorkoutNotes(backup.workoutNotes);
      setWorkoutHistory(backup.workoutHistory);
      setUserProfile(backup.userProfile);
      writeLocalData(LOCAL_PROGRAMS_KEY, backup.programs);
      writeLocalData(LOCAL_NOTES_KEY, backup.workoutNotes);
      writeLocalData(LOCAL_HISTORY_KEY, backup.workoutHistory);
      writeLocalData(LOCAL_PROFILE_KEY, backup.userProfile);

      if (user && isFirebaseInitialized() && db) {
        await Promise.all([
          ...backup.programs.map(program => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'programs', program.id), program)),
          setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', 'general_notes'), backup.workoutNotes, { merge: true }),
          setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'history', 'workout_sessions'), backup.workoutHistory, { merge: true }),
          setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), backup.userProfile, { merge: true }),
        ]);
      }

      alert('Backup restaurado.');
    } catch (e) {
      console.error('Backup import failed:', e);
      alert('Não consegui restaurar esse backup.');
    }
  };

  // --- Routing Logic ---
  const navigateToProgramDays = (progId: string) => { setSelectedProgramId(progId); setCurrentView('programDays'); };
  const navigateToTracker = (dayTab: string) => { setSelectedDayTab(dayTab); setCurrentView('tracker'); };
  const navigateFromCalendarToTracker = (programId: string, dayTab: string) => {
    setSelectedProgramId(programId);
    setSelectedDayTab(dayTab);
    setCurrentView('tracker');
  };

  const resumeActiveWorkout = () => {
    if (!activeWorkout) return;
    const program = programs.find(p => p.id === activeWorkout.programId);
    if (!program) return; // programa não existe mais — ignora
    setSelectedProgramId(activeWorkout.programId);
    setSelectedDayTab(activeWorkout.dayTab);
    setCurrentView('tracker');
  };

  const currentProgram = programs.find(p => p.id === selectedProgramId);
  const routeNeedsMissingProgram = (currentView === 'programDays' || currentView === 'tracker') && !currentProgram;
  const activeWorkoutProgram = activeWorkout ? programs.find(p => p.id === activeWorkout.programId) : null;
  const activeWorkoutLabel = activeWorkoutProgram && activeWorkout ? `${activeWorkoutProgram.name} · ${activeWorkout.dayTab}` : '';
  const activeWorkoutStartedLabel = activeWorkout?.startedAt
    ? `começou ${new Date(activeWorkout.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${new Date(activeWorkout.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  return (
    <>
      {currentView === 'dashboard' && !routeNeedsMissingProgram && (
        <Dashboard
          onNavigate={setCurrentView}
          user={user}
          isLoading={isLoading}
          isCloudReady={isFirebaseInitialized()}
          authError={authError}
          authInfo={authInfo}
          authActionLoading={authActionLoading}
          onEmailAuth={handleEmailAuth}
          onPasswordReset={handlePasswordReset}
          activeWorkout={activeWorkout}
          activeWorkoutLabel={activeWorkoutLabel}
          activeWorkoutStartedLabel={activeWorkoutStartedLabel}
          onResumeWorkout={resumeActiveWorkout}
          onDismissActiveWorkout={handleClearActiveWorkout}
          onSignOut={handleSignOut}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />
      )}
      
      {currentView === 'profile' && !routeNeedsMissingProgram && (
        <Profile 
          profile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === 'weeklyReview' && !routeNeedsMissingProgram && (
        <WeeklyReview 
          programs={programs}
          notes={workoutNotes}
          profile={userProfile}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === 'workoutCalendar' && !routeNeedsMissingProgram && (
        <WorkoutCalendar
          programs={programs}
          workoutHistory={workoutHistory}
          onNavigate={setCurrentView}
          onOpenWorkout={navigateFromCalendarToTracker}
          onDeleteSession={handleDeleteWorkoutSession}
        />
      )}

      {(currentView === 'programList' || routeNeedsMissingProgram) && (
        <ProgramList 
          programs={programs} 
          onCreateProgram={handleCreateProgram}
          onUpdateProgram={handleUpdateProgram}
          onDeleteProgram={handleDeleteProgram}
          onSelectProgram={navigateToProgramDays}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === 'programDays' && currentProgram && (
        <ProgramDaysManager 
          program={currentProgram}
          onUpdateProgram={handleUpdateProgram}
          onNavigate={setCurrentView}
          onSelectDay={navigateToTracker}
          workoutHistory={workoutHistory}
          workoutNotes={workoutNotes}
        />
      )}

      {currentView === 'tracker' && currentProgram && (
        <WorkoutTracker 
          program={currentProgram}
          onUpdateProgram={handleUpdateProgram}
          workoutNotes={workoutNotes}
          onUpdateNotes={handleUpdateNotes}
          workoutHistory={workoutHistory}
          onUpdateWorkoutHistory={handleUpdateWorkoutHistory}
          initialTab={selectedDayTab}
          onActiveTabChange={setSelectedDayTab}
          onOpenCalendar={() => setCurrentView('workoutCalendar')}
          onDeleteSession={handleDeleteWorkoutSession}
          onSetActiveWorkout={handleSetActiveWorkout}
          onClearActiveWorkout={handleClearActiveWorkout}
          onBack={() => setCurrentView('programDays')}
        />
      )}
    </>
  );
}
