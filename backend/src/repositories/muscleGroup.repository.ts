import { Op } from 'sequelize';
import { MuscleGroup } from '../models';

export interface MuscleGroupCreateData {
  nombre: string;
  userId?: number | null;
}

export async function findMuscleGroups(userId: number) {
  return MuscleGroup.findAll({
    where: {
      [Op.or]: [{ userId: null }, { userId }]
    },
    order: [['nombre', 'ASC']]
  });
}

export async function findMuscleGroupById(id: number, userId: number) {
  return MuscleGroup.findOne({
    where: {
      id,
      [Op.or]: [{ userId: null }, { userId }]
    }
  });
}

export async function createMuscleGroup(data: MuscleGroupCreateData) {
  return MuscleGroup.create(data);
}

export async function updateMuscleGroup(id: number, data: Partial<MuscleGroupCreateData>, userId: number) {
  const muscleGroup = await MuscleGroup.findByPk(id);

  if (!muscleGroup || muscleGroup.userId !== userId) {
    return null;
  }

  return muscleGroup.update(data);
}

export async function deleteMuscleGroup(id: number, userId: number) {
  const muscleGroup = await MuscleGroup.findByPk(id);

  if (!muscleGroup || muscleGroup.userId !== userId) {
    return null;
  }

  await muscleGroup.destroy();
  return muscleGroup;
}
