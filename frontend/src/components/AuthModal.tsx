import { BrandLogo } from './BrandLogo';
import React, { useState } from 'react';
import { X, Sparkles, Shield, Crown, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onSuccess,
}) => {
  const { login, register, loginDemo, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && clientId) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              await loginWithGoogle(response.credential);
              onSuccess?.();
              onClose();
            }
          },
        });
        (window as any).google.accounts.id.prompt();
        return;
      }

      const googleEmail = email.trim() || undefined;
      const googleName = fullName.trim() || undefined;
      await loginWithGoogle({ email: googleEmail, full_name: googleName });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        if (!fullName.trim()) throw new Error('Vui lòng nhập họ và tên');
        await register(fullName, email, password);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Thao tác không thành công, vui lòng kiểm tra lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: 'student' | 'vip' | 'admin') => {
    setIsSubmitting(true);
    try {
      await loginDemo(role);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đăng nhập demo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-b from-blue-50/80 to-transparent relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-3">
            <BrandLogo size="md" showSubtitle={true} subtitle="Nền tảng luyện thi thích ứng & Gia sư AI cá nhân hóa" />
          </div>

          {/* Quick Demo 1-Click Box - Prominent placement */}
          <div className="mt-4 p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Đăng nhập 1-Click tài khoản có sẵn (Demo):
              </span>
              <span className="text-[10px] text-slate-400">Không cần mật khẩu</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Free Student */}
              <button
                type="button"
                onClick={() => handleQuickDemo('student')}
                disabled={isSubmitting}
                className="p-2 sm:p-2.5 border border-blue-200 bg-white hover:bg-blue-100/70 rounded-xl text-left transition-all flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
                title="Học viên Gói Thường: Part 1-7, 30 từ vựng, 3 lượt hỏi AI/ngày"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="p-1 bg-blue-600 text-white rounded-md shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-bold text-blue-900 group-hover:text-blue-700">Gói Thường</span>
                </div>
                <div className="text-[10px] text-blue-700/80 font-mono truncate">student@toeicai.vn</div>
                <div className="text-[9px] text-slate-500 mt-0.5 truncate">Luyện Part 1-7</div>
              </button>

              {/* VIP Member */}
              <button
                type="button"
                onClick={() => handleQuickDemo('vip')}
                disabled={isSubmitting}
                className="p-2 sm:p-2.5 border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/80 hover:from-amber-100 hover:to-amber-200 rounded-xl text-left transition-all flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-xs ring-1 ring-amber-300 disabled:opacity-50"
                title="Học viên Gói VIP: Mở toàn bộ đề ETS, không giới hạn AI, Song ngữ"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="p-1 bg-amber-500 text-white rounded-md shrink-0">
                    <Crown className="w-3 h-3 fill-white" />
                  </div>
                  <span className="text-[11px] font-black text-amber-950 group-hover:text-amber-800">VIP Pro 👑</span>
                </div>
                <div className="text-[10px] text-amber-800 font-mono truncate">vip@toeicai.vn</div>
                <div className="text-[9px] text-amber-700/90 mt-0.5 truncate">Toàn bộ đề ETS</div>
              </button>

              {/* Admin */}
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                disabled={isSubmitting}
                className="p-2 sm:p-2.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-xl text-left transition-all flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
                title="Quản trị viên: Toàn quyền hệ thống, Gemini API keys, duyệt báo lỗi"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="p-1 bg-slate-800 text-white rounded-md shrink-0">
                    <Shield className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 group-hover:text-slate-700">Admin</span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono truncate">admin@toeicai.vn</div>
                <div className="text-[9px] text-slate-500 mt-0.5 truncate">Toàn quyền HT</div>
              </button>
            </div>
          </div>

          {/* Form Tabs */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl mt-4">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tab === 'login' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đăng nhập tài khoản
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                tab === 'register' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đăng ký mới
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 overflow-y-auto space-y-3.5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="student@toeicai.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              'Đang xử lý...'
            ) : tab === 'login' ? (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Tạo tài khoản & Bắt đầu</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Google Sign-in Button */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2.5 text-slate-400 font-semibold tracking-wider text-[10px]">
                Hoặc
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{tab === 'login' ? 'Đăng nhập với Google' : 'Đăng ký bằng Google'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
