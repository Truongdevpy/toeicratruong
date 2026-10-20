import React, { useState } from 'react';
import { Lock, Crown, Shield, User, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthRequiredGateProps {
  featureName: string;
  featureDesc?: string;
  onNavigate: (path: string) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onOpenRBAC?: () => void;
}

export const AuthRequiredGate: React.FC<AuthRequiredGateProps> = ({
  featureName,
  featureDesc,
  onNavigate,
  onOpenAuth,
  onOpenRBAC: _onOpenRBAC,
}) => {
  const { loginDemo } = useAuth();
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);

  const handleQuickDemo = async (role: 'student' | 'vip' | 'admin') => {
    try {
      setLoggingInRole(role);
      await loginDemo(role);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đăng nhập tài khoản demo');
    } finally {
      setLoggingInRole(null);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 bg-slate-50 font-sans">
      <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            <span>Khách (Chưa đăng nhập): 🔒 Tính năng bị khóa</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Yêu cầu đăng nhập để học {featureName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            {featureDesc || `Tính năng ${featureName} chỉ dành cho học viên đã đăng nhập (Gói Thường hoặc Gói VIP Pro).`}
          </p>
        </div>

        {/* Feature Permission Matrix Pill */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-around text-xs">
          <div className="text-center">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Khách</div>
            <div className="text-xs font-bold text-rose-600 mt-0.5">🔒 Bị khóa</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-[11px] font-bold text-blue-600 uppercase">Gói Thường</div>
            <div className="text-xs font-bold text-blue-700 mt-0.5">✅ Mở khóa</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-[11px] font-bold text-amber-700 uppercase flex items-center justify-center gap-1">
              <Crown className="w-3 h-3 text-amber-500" /> VIP Pro
            </div>
            <div className="text-xs font-bold text-amber-700 mt-0.5">👑 Toàn bộ</div>
          </div>
        </div>

        {/* 1-Click Quick Demo Accounts Box */}
        <div className="space-y-2.5 text-left pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              Đăng nhập 1-Click tài khoản có sẵn:
            </span>
            <span className="text-[11px] text-slate-400">Không cần gõ mật khẩu</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Student */}
            <button
              type="button"
              disabled={Boolean(loggingInRole)}
              onClick={() => handleQuickDemo('student')}
              className="p-3 border border-blue-200 bg-blue-50/80 hover:bg-blue-100 rounded-2xl text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs group disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="p-1 bg-blue-600 text-white rounded-md shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-blue-900 group-hover:text-blue-700">Gói Thường</span>
              </div>
              <div className="text-[10px] text-blue-700/80 font-mono truncate">student@toeicai.vn</div>
              <div className="text-[10px] text-slate-500 mt-1">Luyện Part 1-7, 30 từ vựng</div>
            </button>

            {/* VIP Pro */}
            <button
              type="button"
              disabled={Boolean(loggingInRole)}
              onClick={() => handleQuickDemo('vip')}
              className="p-3 border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-200/80 rounded-2xl text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs ring-1 ring-amber-300 group disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="p-1 bg-amber-500 text-white rounded-md shrink-0">
                  <Crown className="w-3 h-3 fill-white" />
                </div>
                <span className="text-xs font-bold text-amber-950 group-hover:text-amber-800">Gói VIP Pro 👑</span>
              </div>
              <div className="text-[10px] text-amber-800 font-mono truncate">vip@toeicai.vn</div>
              <div className="text-[10px] text-amber-900/80 mt-1">Không giới hạn mọi đề thi</div>
            </button>

            {/* Admin */}
            <button
              type="button"
              disabled={Boolean(loggingInRole)}
              onClick={() => handleQuickDemo('admin')}
              className="p-3 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs group disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="p-1 bg-slate-800 text-white rounded-md shrink-0">
                  <Shield className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-slate-900 group-hover:text-slate-700">Admin</span>
              </div>
              <div className="text-[10px] text-slate-600 font-mono truncate">admin@toeicai.vn</div>
              <div className="text-[10px] text-slate-500 mt-1">Toàn quyền hệ thống</div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onNavigate('/payment')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 fill-slate-950" />
            <span>Mua gói VIP Pro</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth ? onOpenAuth('login') : onNavigate('/')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Đăng nhập tài khoản cá nhân
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth ? onOpenAuth('register') : onNavigate('/')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Tạo tài khoản mới
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full sm:w-auto px-4 py-2.5 text-slate-400 hover:text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            Về Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};
