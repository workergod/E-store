import { create } from 'zustand';
import type { User } from '../types/User';
import type { Company } from '../types/Company';
import { Role } from '../constants/roles';
import type { Permission } from '../constants/permissions';

interface AuthState {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | null;
  permissions: Permission[];
  
  setUser: (user: User | null) => void;
  setCompany: (company: Company | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  company: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,
  permissions: [],

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    role: user?.role || null,
    permissions: user?.permissions || []
  }),

  setCompany: (company) => set({ company }),

  setIsLoading: (isLoading) => set({ isLoading }),

  logout: () => set({
    user: null,
    company: null,
    isAuthenticated: false,
    role: null,
    permissions: []
  })
}));
