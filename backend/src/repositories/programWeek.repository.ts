import { ProgramWeek, ScheduledWorkout, TrainingProgram, WorkoutTemplate } from '../models';

export interface ProgramWeekCreateData {
  trainingProgramId: number;
  numeroSemana: number;
  nombre?: string | null;
  objetivo?: string | null;
  notas?: string | null;
  esDescarga?: boolean;
}

const programWeekInclude = [
  {
    model: ScheduledWorkout,
    as: 'scheduledWorkouts',
    include: [{ model: WorkoutTemplate, as: 'workoutTemplate' }]
  }
];

export function findProgramWeeksByTrainingProgramId(trainingProgramId: number) {
  return ProgramWeek.findAll({
    where: { trainingProgramId },
    include: programWeekInclude,
    order: [['numeroSemana', 'ASC']]
  });
}

export function findProgramWeekById(id: number) {
  return ProgramWeek.findByPk(id, {
    include: programWeekInclude
  });
}

export function findProgramWeekWithProgram(id: number) {
  return ProgramWeek.findByPk(id, {
    include: [{ model: TrainingProgram, as: 'trainingProgram' }]
  });
}

export function createProgramWeek(data: ProgramWeekCreateData) {
  return ProgramWeek.create(data);
}

export async function updateProgramWeek(id: number, data: Partial<ProgramWeekCreateData>) {
  const programWeek = await ProgramWeek.findByPk(id);

  if (!programWeek) {
    return null;
  }

  return programWeek.update(data);
}

export async function deleteProgramWeek(id: number) {
  const programWeek = await ProgramWeek.findByPk(id);

  if (!programWeek) {
    return null;
  }

  await programWeek.destroy();
  return programWeek;
}
