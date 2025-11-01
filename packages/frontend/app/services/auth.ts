import api from '../utils/axios.client';
import { localStorageHelper } from '../utils/localStorage.client';

export interface User {
  _id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      '/api/auth/login',
      credentials
    );
    const { user, accessToken, refreshToken } = response.data;

    localStorageHelper.set(TOKEN_KEY, accessToken);
    localStorageHelper.set(REFRESH_TOKEN_KEY, refreshToken);
    localStorageHelper.set(USER_KEY, user);

    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    const { user, accessToken, refreshToken } = response.data;

    localStorageHelper.set(TOKEN_KEY, accessToken);
    localStorageHelper.set(REFRESH_TOKEN_KEY, refreshToken);
    localStorageHelper.set(USER_KEY, user);

    return response.data;
  },

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorageHelper.get<string>(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<{
      accessToken: string;
      refreshToken: string;
    }>('/api/auth/refresh', { refreshToken });

    localStorageHelper.set(TOKEN_KEY, response.data.accessToken);
    localStorageHelper.set(REFRESH_TOKEN_KEY, response.data.refreshToken);

    return response.data;
  },

  async verifyToken(): Promise<User | null> {
    try {
      const response = await api.get<{ valid: boolean; user: User }>(
        '/api/auth/verify'
      );
      if (response.data.valid && response.data.user) {
        localStorageHelper.set(USER_KEY, response.data.user);
        return response.data.user;
      }
      return null;
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorageHelper.remove(TOKEN_KEY);
    localStorageHelper.remove(REFRESH_TOKEN_KEY);
    localStorageHelper.remove(USER_KEY);
  },

  getToken(): string | null {
    return localStorageHelper.get<string>(TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorageHelper.get<string>(REFRESH_TOKEN_KEY);
  },

  getUser(): User | null {
    return localStorageHelper.get<User>(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
