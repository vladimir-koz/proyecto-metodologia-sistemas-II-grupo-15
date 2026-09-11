import { User } from '../models';
import { LoginRequestBody, RegisterRequestBody } from '../types/auth.types';
import { AppError } from '../utils/AppError';
import { generarToken } from '../middlewares/auth.middleware';

function validarDatosRegistro(data: RegisterRequestBody): void {
  if (!data.nombre || !data.email || !data.password) {
    throw new AppError('Nombre, email y password son obligatorios', 400);
  }

  if (data.password.length < 6) {
    throw new AppError('La password debe tener al menos 6 caracteres', 400);
  }
}

export async function registerUser(data: RegisterRequestBody) {
  validarDatosRegistro(data);

  const existente = await User.findOne({ where: { email: data.email } });

  if (existente) {
    throw new AppError('El email ya esta registrado', 400);
  }

  const user = await User.create({
    nombre: data.nombre,
    email: data.email,
    password: data.password
  });

  const token = generarToken(user);

  return {
    message: 'Usuario registrado exitosamente',
    user,
    token
  };
}

export async function loginUser(data: LoginRequestBody) {
  if (!data.email || !data.password) {
    throw new AppError('Email y password son obligatorios', 400);
  }

  const user = await User.findOne({ where: { email: data.email } });

  if (!user) {
    throw new AppError('Credenciales invalidas', 401);
  }

  const passwordValida = await user.validarPassword(data.password);

  if (!passwordValida) {
    throw new AppError('Credenciales invalidas', 401);
  }

  const token = generarToken(user);

  return {
    message: 'Login exitoso',
    user,
    token
  };
}

export async function getProfile(userId: number) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return { user };
}
