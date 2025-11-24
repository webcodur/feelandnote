import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  initializeSubscription: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  initializeSubscription: () => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.nickname || session.user.email!.split('@')[0],
            avatarUrl: session.user.user_metadata.avatar_url,
          },
          isAuthenticated: true,
        });
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.nickname || session.user.email!.split('@')[0],
            avatarUrl: session.user.user_metadata.avatar_url,
          },
          isAuthenticated: true,
        });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    });

    return () => subscription.unsubscribe();
  },
}));
