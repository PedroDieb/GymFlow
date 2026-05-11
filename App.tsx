import React, { useState, useEffect } from 'react';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged, User } from 'firebase/auth';
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
import { Program, WorkoutHistory, WorkoutNotes, ViewState, UserProfile } from './types';

const LOCAL_PROGRAMS_KEY = 'gymflow_programs';
const LOCAL_NOTES_KEY = 'gymflow_notes';
const LOCAL_PROFILE_KEY = 'gymflow_profile';
const LOCAL_HISTORY_KEY = 'gymflow_workout_history';
const LOCAL_NAVIGATION_KEY = 'gymflow_navigation';

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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [programs, setPrograms] = useState<Program[]>(() => readLocalData<Program[]>(LOCAL_PROGRAMS_KEY, []));
  const [workoutNotes, setWorkoutNotes] = useState<WorkoutNotes>(() => readLocalData<WorkoutNotes>(LOCAL_NOTES_KEY, {}));
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory>(() => readLocalData<WorkoutHistory>(LOCAL_HISTORY_KEY, {}));
  const [userProfile, setUserProfile] = useState<UserProfile>(() => readLocalData<UserProfile>(LOCAL_PROFILE_KEY, {
      displayName: '', weight: '', height: '', age: '', goal: ''
  }));
  const [isLoading, setIsLoading] = useState(true);
  
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

  // 1. Authentication
  useEffect(() => {
    const initAuth = async () => {
      // Guard: Do not attempt auth if config is missing or auth service is null
      if (!isFirebaseInitialized() || !auth) {
        console.log("Offline Mode: Firebase not configured.");
        setIsLoading(false);
        return;
      }

      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e: any) {
        // Detect specific API Key errors and handle gracefully
        if (e?.code === 'auth/invalid-api-key') {
          console.warn("Invalid API Key detected. Falling back to Offline Mode.");
        } else {
          console.error("Auth Error:", e);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // Subscribe to Auth State
    if (isFirebaseInitialized() && auth) {
      try {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setIsLoading(false); 
        });
        return () => unsubscribe();
      } catch (e) {
        console.warn("AuthState listener failed:", e);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // 2. Data Sync
  useEffect(() => {
    // Verify everything is ready before trying to sync
    if (!user || !isFirebaseInitialized() || !db) return;

    try {
      // Listen to Programs
      const progQuery = collection(db, 'artifacts', appId, 'users', user.uid, 'programs');
      const unsubPrograms = onSnapshot(progQuery, (snapshot) => {
        const loadedProgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program));
        setPrograms(loadedProgs);
      }, (error) => console.error("Error fetching programs:", error));

      // Listen to Notes
      const notesDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'notes', 'general_notes');
      const unsubNotes = onSnapshot(notesDoc, (docSnap) => {
          if (docSnap.exists()) {
              setWorkoutNotes(docSnap.data() as WorkoutNotes);
          }
      });

      // Listen to Profile
      const profileDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main');
      const unsubProfile = onSnapshot(profileDoc, (docSnap) => {
          if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
          }
      });

      // Listen to Workout History
      const historyDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'history', 'workout_sessions');
      const unsubHistory = onSnapshot(historyDoc, (docSnap) => {
          if (docSnap.exists()) {
              const loadedHistory = docSnap.data() as WorkoutHistory;
              setWorkoutHistory(loadedHistory);
              writeLocalData(LOCAL_HISTORY_KEY, loadedHistory);
          }
      });

      return () => {
          unsubPrograms();
          unsubNotes();
          unsubProfile();
          unsubHistory();
      };
    } catch (e) {
      console.error("Firestore sync error:", e);
    }
  }, [user]);

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

  const currentProgram = programs.find(p => p.id === selectedProgramId);
  const routeNeedsMissingProgram = (currentView === 'programDays' || currentView === 'tracker') && !currentProgram;

  return (
    <>
      {currentView === 'dashboard' && !routeNeedsMissingProgram && (
        <Dashboard
          onNavigate={setCurrentView}
          user={user}
          isLoading={isLoading}
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
          onBack={() => setCurrentView('programDays')}
        />
      )}
    </>
  );
}
