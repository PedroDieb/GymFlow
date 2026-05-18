import { CompletedExerciseSnapshot, Exercise, WorkoutHistory, WorkoutSession } from '../types';

const normalizeExerciseName = (name: string): string => (
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
);

const stopWords = new Set([
  'a',
  'as',
  'com',
  'cabo',
  'cada',
  'da',
  'de',
  'do',
  'em',
  'e',
  'maquina',
  'no',
  'ou',
]);

const getNameTokens = (name: string): string[] => (
  normalizeExerciseName(name)
    .split(' ')
    .filter(token => token.length > 1 && !stopWords.has(token))
);

const namesAreCompatible = (left: string, right: string): boolean => {
  const normalizedLeft = normalizeExerciseName(left);
  const normalizedRight = normalizeExerciseName(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;

  const leftTokens = getNameTokens(left);
  const rightTokens = getNameTokens(right);
  const shorter = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
  const longer = leftTokens.length > rightTokens.length ? leftTokens : rightTokens;
  if (shorter.length < 2) return false;

  const shared = shorter.filter(token => longer.includes(token)).length;
  return shared / shorter.length >= 0.75;
};

const findExerciseSnapshot = (sessions: WorkoutSession[], exercise: Exercise): CompletedExerciseSnapshot | null => {
  for (const session of sessions) {
    const byId = session.exercises.find(snapshot => snapshot.exerciseId === exercise.id);
    if (byId) return byId;

    const byName = session.exercises.find(snapshot => namesAreCompatible(snapshot.name, exercise.name));
    if (byName) return byName;
  }

  return null;
};

export const findPreviousExerciseSnapshot = (
  workoutHistory: WorkoutHistory,
  programId: string,
  dayTab: string,
  exercise: Exercise,
): CompletedExerciseSnapshot | null => {
  const programHistory = workoutHistory[programId] || {};
  const sameDaySessions = programHistory[dayTab] || [];
  const sameDaySnapshot = findExerciseSnapshot(sameDaySessions, exercise);
  if (sameDaySnapshot) return sameDaySnapshot;

  const otherSessions = Object.entries(programHistory)
    .filter(([historyDay]) => historyDay !== dayTab)
    .flatMap(([, sessions]) => sessions)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  return findExerciseSnapshot(otherSessions, exercise);
};
