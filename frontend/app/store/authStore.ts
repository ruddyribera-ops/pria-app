// Zustand store for authentication state
import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  school_id?: number;
}

interface AuthStore {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, full_name: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  // Check auth on store initialization
  const checkStorageAuth = () => {
    // Skip if server-side
    if (typeof window === 'undefined') {
      return;
    }

    const token = localStorage.getItem('access_token');
    const userJson = localStorage.getItem('user');

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
  };

  // Initialize on first create
  checkStorageAuth();

  return {
    // Initial state
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,

    // Login
    login: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await axios.post(
          `${API_URL}/api/auth/token`,
          formData,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        const { access_token, user } = response.data;

        // Store in localStorage
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        set({
          token: access_token,
          user,
          isAuthenticated: true,
          loading: false,
        });
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.detail || 'Login failed'
          : 'Login failed';
        set({ error: message, loading: false });
        throw error;
      }
    },

    // Register
    register: async (email, full_name, password) => {
      set({ loading: true, error: null });
      try {
        const response = await axios.post(
          `${API_URL}/api/auth/register`,
          {
            email,
            full_name,
            password,
          }
        );

        const { access_token, user } = response.data;

        // Store in localStorage
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        set({
          token: access_token,
          user,
          isAuthenticated: true,
          loading: false,
        });
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.detail || 'Registration failed'
          : 'Registration failed';
        set({ error: message, loading: false });
        throw error;
      }
    },

    // Logout
    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    },

    // Check auth status
    checkAuth: () => {
      checkStorageAuth();
    },

    // Clear error
    clearError: () => {
      set({ error: null });
    },
  };
});
