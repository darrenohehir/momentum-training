import { Set } from '../models';

/**
 * Format a set for display (in-session or history).
 * Strength: "weight kg × reps"
 * Cardio/timed: "MM:SS · X.X km · Y%" (duration required; distance and incline optional)
 */
export function formatSetDisplay(set: Set): string {
  const kind = set.kind ?? 'strength';
  if (kind === 'cardio' || kind === 'timed') {
    const parts: string[] = [];
    const sec = set.durationSec ?? 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    parts.push(`${m}:${s.toString().padStart(2, '0')}`);
    if (set.distance !== undefined && set.distance !== null) {
      const km = set.distanceUnit === 'mi' ? set.distance * 1.60934 : set.distance;
      parts.push(`${km.toFixed(1)} km`);
    }
    if (set.incline !== undefined && set.incline !== null) {
      parts.push(`${set.incline}%`);
    }
    return parts.join(' · ');
  }
  const weightStr = set.weight !== undefined ? `${set.weight} kg` : '—';
  const repsStr = set.reps !== undefined ? `${set.reps}` : '—';
  return `${weightStr} × ${repsStr}`;
}
