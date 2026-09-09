export interface RegisterRequestBody {
  nombre: string;
  email: string;
  password: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface AuthUserPayload {
  id: number;
  email: string;
}
