import { ExerciseMuscleGroup } from '../models';

export async function replaceExerciseMuscleGroups(exerciseId: number, muscleGroupIds: number[]) {
  await ExerciseMuscleGroup.destroy({
    where: { exerciseId }
  });

  const uniqueMuscleGroupIds = Array.from(new Set(muscleGroupIds));

  if (uniqueMuscleGroupIds.length === 0) {
    return [];
  }

  return ExerciseMuscleGroup.bulkCreate(
    uniqueMuscleGroupIds.map((muscleGroupId) => ({
      exerciseId,
      muscleGroupId
    }))
  );
}
