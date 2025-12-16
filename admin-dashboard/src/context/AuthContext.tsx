import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';
import { getAuthToken, setAuthToken, removeAuthToken } from '../config/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, twofaCode?: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authApi.getMe();
          if (userData.role === 'ADMIN') {
            setUser({
              id: userData.userId || userData.id,
              email: userData.email,
              name: userData.name || '',
              role: userData.role,
            });
          } else {
            removeAuthToken();
          }
        } catch (error) {
          removeAuthToken();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string, twofaCode?: string) => {
    const response = await authApi.login({ username, password, twofaCode });
    setAuthToken(response.accessToken);
    if (response.user.role === 'ADMIN') {
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || '',
        role: response.user.role,
      });
    } else {
      throw new Error('Access denied. Admin role required.');
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

