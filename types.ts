export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  completed: boolean;
  performedReps: string[];
  notes: string;
  rir: string; // Reps in Reserve
  cadence: string; // Tempo e.g., 3010
  restSeconds: number;
  linkedToNext: boolean;
}

export interface WorkoutMap {
  [key: string]: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  workouts: WorkoutMap;
  objectives: string;
}

export interface WorkoutNotes {
  [key: string]: string;
}

export interface UserProfile {
  displayName: string;
  weight: string;
  height: string;
  age: string;
  goal: string;
}

export interface WeeklyReviewData {
  summary: string;
  consistencyScore: number; // 0-100
  highlight: string; // Best exercise or achievement
  improvementArea: string; // What to focus on
  motivationalQuote: string;
}

export type ViewState = 'dashboard' | 'programList' | 'programDays' | 'tracker' | 'profile' | 'weeklyReview';

// Global declarations for the environment variables injected by the platform
declare global {
  const __firebase_config: string;
  const __app_id: string;
  const __initial_auth_token: string | undefined;
}