export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.dailycook.io.vn';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('admin_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('admin_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('admin_token');
};

