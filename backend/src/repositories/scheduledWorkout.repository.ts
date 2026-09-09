import { ProgramWeek, ScheduledWorkout, TrainingProgram, WorkoutTemplate } from '../models';

export interface ScheduledWorkoutCreateData {
  programWeekId: number;
  workoutTemplateId: number;
  nombre: string;
  diaSemana?: number | null;
  fechaProgramada?: Date | null;
  orden: number;
  notas?: string | null;
}

const scheduledWorkoutInclude = [
  { model: WorkoutTemplate, as: 'workoutTemplate' }
];

export function findScheduledWorkoutsByProgramWeekId(programWeekId: number) {
  return ScheduledWorkout.findAll({
    where: { programWeekId },
    include: scheduledWorkoutInclude,
    order: [['orden', 'ASC']]
  });
}

export function findScheduledWorkoutById(id: number) {
  return ScheduledWorkout.findByPk(id, {
    include: scheduledWorkoutInclude
  });
}

export function findScheduledWorkoutWithProgram(id: number) {
  return ScheduledWorkout.findByPk(id, {
    include: [
      {
        model: ProgramWeek,
        as: 'programWeek',
        include: [{ model: TrainingProgram, as: 'trainingProgram' }]
      },
      { model: WorkoutTemplate, as: 'workoutTemplate' }
    ]
  });
}

export function createScheduledWorkout(data: ScheduledWorkoutCreateData) {
  return ScheduledWorkout.create(data);
}

export async function updateScheduledWorkout(id: number, data: Partial<ScheduledWorkoutCreateData>) {
  const scheduledWorkout = await ScheduledWorkout.findByPk(id);

  if (!scheduledWorkout) {
    return null;
  }

  return scheduledWorkout.update(data);
}

export async function deleteScheduledWorkout(id: number) {
  const scheduledWorkout = await ScheduledWorkout.findByPk(id);

  if (!scheduledWorkout) {
    return null;
  }

  await scheduledWorkout.destroy();
  return scheduledWorkout;
}
