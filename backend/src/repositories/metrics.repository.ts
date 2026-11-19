import { Op, WhereOptions } from 'sequelize';
import { Exercise, Workout, WorkoutSet } from '../models';
import { ParsedMetricsRange } from '../types/metrics.types';
import { Modalidad } from '../types/workout.types';

function buildWorkoutWhere(userId: number, range: ParsedMetricsRange, modalidad: Modalidad): WhereOptions {
  const where: WhereOptions = { userId, modalidad };

  if (range.from || range.to) {
    where.timestamp = {
      ...(range.from ? { [Op.gte]: range.from } : {}),
      ...(range.to ? { [Op.lte]: range.to } : {})
    };
  }

  return where;
}

export function findMetricWorkouts(
  userId: number,
  range: ParsedMetricsRange,
  modalidad: Modalidad = 'fuerza'
): Promise<Workout[]> {
  return Workout.findAll({
    where: buildWorkoutWhere(userId, range, modalidad),
    include: [
      {
        model: WorkoutSet,
        as: 'series',
        include: [{ model: Exercise, as: 'exercise' }]
      }
    ],
    order: [['timestamp', 'ASC']]
  });
}