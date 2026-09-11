import { WorkoutTemplateExercise } from '../models';
import { Exercise } from '../models/Exercise';

export interface WorkoutTemplateExerciseCreateData {
  workoutTemplateId: number;
  exerciseId: number;
  orden: number;
  repeticiones: number;
  peso?: number | null;
  rirObjetivo?: number | null;
  rpeObjetivo?: number | null;
}

export async function findWorkoutTemplateExercisesByWorkoutTemplateId(workoutTemplateId: number) {
  return WorkoutTemplateExercise.findAll({
    where: { workoutTemplateId },
    order: [['orden', 'ASC']],
    include: [
      {
        model: Exercise,
        as: 'exercise'
      }
    ]
  });
}

export async function findWorkoutTemplateExerciseById(id: number) {
  return WorkoutTemplateExercise.findByPk(id, {
    include: [
      {
        model: Exercise,
        as: 'exercise'
      }
    ]
  });
}

export async function createWorkoutTemplateExercise(data: WorkoutTemplateExerciseCreateData) {
  return WorkoutTemplateExercise.create(data);
}

export async function updateWorkoutTemplateExercise(id: number, data: Partial<WorkoutTemplateExerciseCreateData>) {
  const workoutTemplateExercise = await WorkoutTemplateExercise.findByPk(id);

  if (!workoutTemplateExercise) {
    return null;
  }

  return workoutTemplateExercise.update(data);
}

export async function deleteWorkoutTemplateExercise(id: number) {
  const workoutTemplateExercise = await WorkoutTemplateExercise.findByPk(id);

  if (!workoutTemplateExercise) {
    return null;
  }

  await workoutTemplateExercise.destroy();
  return workoutTemplateExercise;
}
