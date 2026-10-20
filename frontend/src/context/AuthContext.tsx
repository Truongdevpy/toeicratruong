import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserProfile } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  unreadNotifications: number;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  loginDemo: (role?: 'student' | 'vip' | 'admin') => Promise<void>;
  loginWithGoogle: (payloadOrCredential?: string | { credential?: string; email?: string; full_name?: string; avatar_url?: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const data = await api.getMe();
      setUser({
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role as 'student' | 'admin' | 'vip',
        membership_tier: data.role === 'admin' ? 'admin' : (data.role === 'vip' ? 'vip' : 'free'),
        is_vip: data.role === 'vip' || data.role === 'admin' || Boolean(data.is_vip),
        is_admin: data.role === 'admin',
        avatar_url: data.avatar_url,
        onboarding_completed: data.profile?.onboarding_completed ?? true,
        placement_completed: data.profile?.placement_completed ?? true,
        current_score: data.profile?.current_score ?? 425,
        target_score: data.profile?.target_score ?? 650,
      });
      setProfile(data.profile);
      setUnreadNotifications(data.unread_notifications || 0);
    } catch (err) {
      console.warn('Could not refresh user session, clearing invalid auth state');
      removeAuthToken();
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      refreshMe();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    setAuthToken(res.access_token);
    await refreshMe();
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.register({ full_name: name, email, password: pass });
    setAuthToken(res.access_token);
    await refreshMe();
  };

  const loginDemo = async (role: 'student' | 'vip' | 'admin' = 'student') => {
    try {
      const res = await api.loginDemo(role);
      setAuthToken(res.access_token);
      await refreshMe();
    } catch {
      try {
        if (role === 'admin') {
          await login('admin@toeicai.vn', 'admin123');
        } else if (role === 'vip') {
          await login('vip@toeicai.vn', 'vip123');
        } else {
          await login('student@toeicai.vn', 'password123');
        }
      } catch {
      setUser({
        id: role === 'admin' ? 2 : (role === 'vip' ? 9 : 1),
        email: role === 'admin' ? 'Quản trị viên Hệ thống' : (role === 'vip' ? 'Nguyễn Hoàng Nam (VIP 👑)' : 'Trần Quang Trường'),
        full_name: role === 'admin' ? 'Quản trị viên Hệ thống' : (role === 'vip' ? 'Nguyễn Hoàng Nam (VIP 👑)' : 'Trần Quang Trường'),
        role: role as 'student' | 'admin' | 'vip',
        membership_tier: role === 'admin' ? 'Quản trị viên Hệ thống' : (role === 'vip' ? 'Nguyễn Hoàng Nam (VIP 👑)' : 'Trần Quang Trường'),
        is_vip: role === 'vip' || role === 'admin',
        is_admin: role === 'admin',
        avatar_url: role === 'admin'
          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
          : (role === 'vip'
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
        onboarding_completed: true,
        placement_completed: true,
        current_score: role === 'vip' ? 785 : 425,
        target_score: role === 'vip' ? 900 : 650,
        });
        setIsLoading(false);
      }
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setProfile(null);
  };

  const loginWithGoogle = async (payloadOrCredential?: string | { credential?: string; email?: string; full_name?: string; avatar_url?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.googleAuth(payloadOrCredential || '');
      if (res && res.access_token) {
        setAuthToken(res.access_token);
        await refreshMe();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        unreadNotifications,
        isLoading,
        login,
        register,
        loginDemo,
        loginWithGoogle,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
