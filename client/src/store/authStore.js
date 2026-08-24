import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../lib/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Login ──────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { user, accessToken } = res.data.data;
          localStorage.setItem('accessToken', accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
          return { success: true, user };
        } catch (err) {
          const resData = err.response?.data;
          let message = resData?.error;
          if (resData?.errors && typeof resData.errors === 'object') {
            const fieldMsgs = Object.entries(resData.errors)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join(' | ');
            if (fieldMsgs) message = fieldMsgs;
          }
          if (!message) {
            message = err.message || 'Login failed. Please try again.';
          }
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      // ── Register ───────────────────────────────────────────────────────────
      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/register', data);
          const { user, accessToken } = res.data.data;
          localStorage.setItem('accessToken', accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
          return { success: true, user };
        } catch (err) {
          const resData = err.response?.data;
          let message = resData?.error;
          if (resData?.errors && typeof resData.errors === 'object') {
            const fieldMsgs = Object.entries(resData.errors)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join(' | ');
            if (fieldMsgs) message = fieldMsgs;
          }
          if (!message) {
            message = err.message || 'Registration failed. Please try again.';
          }
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      // ── Logout ─────────────────────────────────────────────────────────────
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Silent — even if server logout fails, clear local state
        }
        localStorage.removeItem('accessToken');
        // Clear persisted storage too
        useAuthStore.persist.clearStorage();
        set({ user: null, accessToken: null, isAuthenticated: false, error: null });
        window.location.href = '/login';
      },

      // ── Fetch current user (on app init) ───────────────────────────────────
      fetchMe: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        try {
          const res = await api.get('/users/me');
          set({ user: res.data.data, isAuthenticated: true });
        } catch {
          // Token invalid — clear everything silently
          localStorage.removeItem('accessToken');
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      // ── Update user data in store (after profile edits) ────────────────────
      updateUser: (userData) =>
        set({ user: { ...get().user, ...userData } }),

      // ── Clear error ────────────────────────────────────────────────────────
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
