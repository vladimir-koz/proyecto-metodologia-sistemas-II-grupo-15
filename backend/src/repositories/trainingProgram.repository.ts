import { Op } from 'sequelize';
import { ProgramWeek, ScheduledWorkout, TrainingProgram, WorkoutTemplate } from '../models';

export interface TrainingProgramCreateData {
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  userId?: number | null;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
  estado?: string | null;
}

const trainingProgramInclude = [
  {
    model: ProgramWeek,
    as: 'weeks',
    include: [
      {
        model: ScheduledWorkout,
        as: 'scheduledWorkouts',
        include: [{ model: WorkoutTemplate, as: 'workoutTemplate' }]
      }
    ]
  }
];

export function findTrainingPrograms(userId: number) {
  return TrainingProgram.findAll({
    where: {
      [Op.or]: [{ userId: null }, { userId }]
    },
    order: [['createdAt', 'DESC']]
  });
}

export function findTrainingProgramById(id: number, userId: number) {
  return TrainingProgram.findOne({
    where: {
      id,
      [Op.or]: [{ userId: null }, { userId }]
    },
    include: trainingProgramInclude,
    order: [[{ model: ProgramWeek, as: 'weeks' }, 'numeroSemana', 'ASC']]
  });
}

export function createTrainingProgram(data: TrainingProgramCreateData) {
  return TrainingProgram.create(data);
}

export async function updateTrainingProgram(id: number, data: Partial<TrainingProgramCreateData>, userId: number) {
  const trainingProgram = await TrainingProgram.findByPk(id);

  if (!trainingProgram || trainingProgram.userId !== userId) {
    return null;
  }

  return trainingProgram.update(data);
}

export async function deleteTrainingProgram(id: number, userId: number) {
  const trainingProgram = await TrainingProgram.findByPk(id);

  if (!trainingProgram || trainingProgram.userId !== userId) {
    return null;
  }

  await trainingProgram.destroy();
  return trainingProgram;
}
