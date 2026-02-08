import { Exercise } from '../../models';

/**
 * Fixed ID for the single GamificationState record.
 * Using a constant ensures we always reference the same record.
 */
export const GAMIFICATION_STATE_ID = 'default';

/**
 * Default exercises seeded on first install.
 * These use fixed UUIDs to ensure idempotent seeding.
 */
export const DEFAULT_EXERCISES: Exercise[] = [
  {
    id: 'seed-exercise-chest-press',
    name: 'Chest Press',
    category: 'chest',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed-exercise-bicep-curl',
    name: 'Bicep Curl',
    category: 'arms',
    equipmentType: 'dumbbell',
    logType: 'strength',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed-exercise-treadmill',
    name: 'Treadmill',
    category: 'cardio',
    equipmentType: 'cardio',
    logType: 'cardio',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Default gamification state for new installs.
 */
export const DEFAULT_GAMIFICATION_STATE = {
  id: GAMIFICATION_STATE_ID,
  totalXp: 0
};



