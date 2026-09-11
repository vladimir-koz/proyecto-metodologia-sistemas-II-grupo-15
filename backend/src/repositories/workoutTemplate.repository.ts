import { Op } from 'sequelize';
import { WorkoutTemplate } from '../models';

export interface WorkoutTemplateCreateData {
  nombre: string;
  descripcion?: string | null;
  tipo?: string | null;
  grupoMuscularEtiqueta?: string | null;
  dificultad?: string | null;
  tiempoEstimado?: number | null;
  userId?: number | null;
}

export async function findWorkoutTemplates(userId: number) {
  return WorkoutTemplate.findAll({
    where: {
      [Op.or]: [{ userId: null }, { userId }]
    },
    order: [['createdAt', 'DESC']]
  });
}

export async function findWorkoutTemplateById(id: number, userId: number) {
  return WorkoutTemplate.findOne({
    where: {
      id,
      [Op.or]: [{ userId: null }, { userId }]
    }
  });
}

export async function createWorkoutTemplate(data: WorkoutTemplateCreateData) {
  return WorkoutTemplate.create(data);
}

export async function updateWorkoutTemplate(id: number, data: Partial<WorkoutTemplateCreateData>, userId: number) {
  const workoutTemplate = await WorkoutTemplate.findByPk(id);

  if (!workoutTemplate || workoutTemplate.userId !== userId) {
    return null;
  }

  return workoutTemplate.update(data);
}

export async function deleteWorkoutTemplate(id: number, userId: number) {
  const workoutTemplate = await WorkoutTemplate.findByPk(id);

  if (!workoutTemplate || workoutTemplate.userId !== userId) {
    return null;
  }

  await workoutTemplate.destroy();
  return workoutTemplate;
}
