import { MetricSet } from '../../types/metrics.types';
import { roundTo } from '../../utils/runningMath';

export const round = roundTo;

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getSetVolume(set: MetricSet): number {
  return set.repeticiones * set.peso;
}

export function getEstimatedOneRepMax(set: MetricSet): number {
  return set.peso * (1 + set.repeticiones / 30);
}

export function getAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function definedNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => value !== null && value !== undefined);
}