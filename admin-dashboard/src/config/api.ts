export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('admin_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('admin_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('admin_token');
};

