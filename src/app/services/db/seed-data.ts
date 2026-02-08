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

const now = new Date().toISOString();

/**
 * Default exercises seeded on first install.
 * Fixed IDs ensure idempotent seeding.
 */
export const DEFAULT_EXERCISES: Exercise[] = [
  // ─────────────────────────
  // Chest
  // ─────────────────────────
  {
    id: 'seed-exercise-bench-press',
    name: 'Bench Press',
    category: 'chest',
    equipmentType: 'barbell',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-chest-press',
    name: 'Chest Press',
    category: 'chest',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-chest-fly',
    name: 'Chest Fly',
    category: 'chest',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },

  // ─────────────────────────
  // Back
  // ─────────────────────────
  {
    id: 'seed-exercise-lat-pulldown',
    name: 'Lat Pulldown',
    category: 'back',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-seated-row',
    name: 'Seated Row',
    category: 'back',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-deadlift',
    name: 'Deadlift',
    category: 'back',
    equipmentType: 'barbell',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-pull-up',
    name: 'Pull-Up',
    category: 'back',
    equipmentType: 'bodyweight',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },

  // ─────────────────────────
  // Legs
  // ─────────────────────────
  {
    id: 'seed-exercise-squat',
    name: 'Squat',
    category: 'legs',
    equipmentType: 'barbell',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-leg-press',
    name: 'Leg Press',
    category: 'legs',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-leg-extension',
    name: 'Leg Extension',
    category: 'legs',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-leg-curl',
    name: 'Leg Curl',
    category: 'legs',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-calf-raise',
    name: 'Calf Raise',
    category: 'legs',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },

  // ─────────────────────────
  // Shoulders
  // ─────────────────────────
  {
    id: 'seed-exercise-shoulder-press',
    name: 'Shoulder Press',
    category: 'shoulders',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-lateral-raise',
    name: 'Lateral Raise',
    category: 'shoulders',
    equipmentType: 'dumbbell',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-rear-delt-fly',
    name: 'Rear Delt Fly',
    category: 'shoulders',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },

  // ─────────────────────────
  // Arms
  // ─────────────────────────
  {
    id: 'seed-exercise-bicep-curl',
    name: 'Bicep Curl',
    category: 'arms',
    equipmentType: 'dumbbell',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-hammer-curl',
    name: 'Hammer Curl',
    category: 'arms',
    equipmentType: 'dumbbell',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-tricep-pushdown',
    name: 'Tricep Pushdown',
    category: 'arms',
    equipmentType: 'machine',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-tricep-extension',
    name: 'Tricep Extension',
    category: 'arms',
    equipmentType: 'dumbbell',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },

  // ─────────────────────────
  // Core
  // ─────────────────────────
  {
    id: 'seed-exercise-plank',
    name: 'Plank',
    category: 'core',
    equipmentType: 'bodyweight',
    logType: 'timed',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-crunch',
    name: 'Crunch',
    category: 'core',
    equipmentType: 'bodyweight',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    equipmentType: 'bodyweight',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },

  // ─────────────────────────
  // Cardio
  // ─────────────────────────
  {
    id: 'seed-exercise-treadmill',
    name: 'Treadmill',
    category: 'cardio',
    equipmentType: 'cardio',
    logType: 'cardio',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-stationary-bike',
    name: 'Stationary Bike',
    category: 'cardio',
    equipmentType: 'cardio',
    logType: 'cardio',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-rowing-machine',
    name: 'Rowing Machine',
    category: 'cardio',
    equipmentType: 'cardio',
    logType: 'cardio',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-elliptical',
    name: 'Elliptical',
    category: 'cardio',
    equipmentType: 'cardio',
    logType: 'cardio',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-stair-climber',
    name: 'Stair Climber',
    category: 'cardio',
    equipmentType: 'cardio',
    logType: 'cardio',
    createdAt: now,
    updatedAt: now
  },

  // ─────────────────────────
  // Bodyweight / Full body
  // ─────────────────────────
  {
    id: 'seed-exercise-push-up',
    name: 'Push-Up',
    category: 'full-body',
    equipmentType: 'bodyweight',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-bodyweight-squat',
    name: 'Bodyweight Squat',
    category: 'full-body',
    equipmentType: 'bodyweight',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-lunge',
    name: 'Lunge',
    category: 'full-body',
    equipmentType: 'bodyweight',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-exercise-burpee',
    name: 'Burpee',
    category: 'full-body',
    equipmentType: 'bodyweight',
    logType: 'strength',
    createdAt: now,
    updatedAt: now
  }
];

/**
 * Default gamification state for new installs.
 */
export const DEFAULT_GAMIFICATION_STATE = {
  id: GAMIFICATION_STATE_ID,
  totalXp: 0
};



