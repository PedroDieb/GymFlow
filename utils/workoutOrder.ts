import { WorkoutMap } from '../types';

const getDayNumber = (dayKey: string): number | null => {
  const match = dayKey.match(/\bD(\d+)\b/i);
  return match ? Number(match[1]) : null;
};

export const getWorkoutDayKeys = (workouts: WorkoutMap): string[] => (
  Object.keys(workouts || {}).sort((left, right) => {
    const leftNumber = getDayNumber(left);
    const rightNumber = getDayNumber(right);

    if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    if (leftNumber !== null && rightNumber === null) return -1;
    if (leftNumber === null && rightNumber !== null) return 1;

    return left.localeCompare(right, 'pt-BR');
  })
);
