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

// Types
import { Program, WorkoutNotes, ViewState, UserProfile } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workoutNotes, setWorkoutNotes] = useState<WorkoutNotes>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({
      displayName: '', weight: '', height: '', age: '', goal: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('dashboard'); 
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState<string | null>(null);

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

      return () => {
          unsubPrograms();
          unsubNotes();
          unsubProfile();
      };
    } catch (e) {
      console.error("Firestore sync error:", e);
    }
  }, [user]);

  // --- Database Handlers ---

  const handleCreateProgram = async (program: Program) => {
    // Optimistic update for immediate feedback
    setPrograms(prev => [...prev, program]);

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
    setPrograms(prev => prev.map(p => p.id === program.id ? program : p));
    
    if (!user || !isFirebaseInitialized() || !db) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'programs', program.id), program, { merge: true });
    } catch (e) { console.error("Error updating program", e); }
  };

  const handleDeleteProgram = async (programId: string) => {
    // Optimistic Update
    setPrograms(prev => prev.filter(p => p.id !== programId));

    if (!user || !isFirebaseInitialized() || !db) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'programs', programId));
    } catch (e) { console.error("Error deleting program", e); }
  };

  const handleUpdateNotes = async (newNotes: WorkoutNotes) => {
      setWorkoutNotes(newNotes); // Optimistic
      if (!user || !isFirebaseInitialized() || !db) return;
      try {
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', 'general_notes'), newNotes, { merge: true });
      } catch(e) { console.error("Error saving notes", e); }
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    if (!user || !isFirebaseInitialized() || !db) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), profile, { merge: true });
    } catch(e) { console.error("Error saving profile", e); }
  };

  // --- Routing Logic ---
  const navigateToProgramDays = (progId: string) => { setSelectedProgramId(progId); setCurrentView('programDays'); };
  const navigateToTracker = (dayTab: string) => { setSelectedDayTab(dayTab); setCurrentView('tracker'); };

  const currentProgram = programs.find(p => p.id === selectedProgramId);

  return (
    <>
      {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} user={user} isLoading={isLoading} />}
      
      {currentView === 'profile' && (
        <Profile 
          profile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === 'weeklyReview' && (
        <WeeklyReview 
          programs={programs}
          notes={workoutNotes}
          profile={userProfile}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === 'programList' && (
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
          initialTab={selectedDayTab}
          onBack={() => setCurrentView('programDays')}
        />
      )}
    </>
  );
}