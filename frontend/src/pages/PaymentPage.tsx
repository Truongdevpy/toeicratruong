import React, { useState, useEffect, useRef } from 'react';
import {
  Crown, Check, Copy, CheckCircle2, Clock, Sparkles, ArrowRight,
  ArrowLeft, RefreshCw, AlertCircle, QrCode, Shield, Zap, Building2,
  History as HistoryIcon, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface PaymentPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
}

interface VipPlan {
  id: string;
  name: string;
  price: number;
  original_price: number;
  duration_days: number;
  badge: string;
  is_popular?: boolean;
  discount_percent?: number;
  description: string;
  features: string[];
}

interface BankInfo {
  enabled: boolean;
  bank_name: string;
  bank_code: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  content_prefix: string;
  vietqr_template: string;
}

interface PaymentOrder {
  order_id: number;
  user_id: number;
  user_name: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  formatted_amount: string;
  transaction_code: string;
  status: string;
  bank_name: string;
  bank_code: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  qr_url: string;
  created_at: string;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { user, refreshMe } = useAuth();

  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [_bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('vip_6m');
  const [activeTab, setActiveTab] = useState<'checkout' | 'history'>('checkout');

  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);
  const [checkingPayment, setCheckingPayment] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const pollingTimerRef = useRef<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900);

  const loadPlansAndBank = async () => {
    try {
      const [plansRes, bankRes] = await Promise.all([
        api.getVipPlans(),
        api.getPublicBankInfo()
      ]);
      if (plansRes && plansRes.plans) {
        setPlans(plansRes.plans);
      }
      if (bankRes) {
        setBankInfo(bankRes);
      }
    } catch (err) {
      console.error('Failed to load plans or bank info:', err);
    }
  };

  useEffect(() => {
    loadPlansAndBank();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getUserPaymentHistory();
      if (res && res.payments) {
        setHistoryOrders(res.payments);
      }
    } catch (err) {
      console.error('Failed to load user history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && user) {
      loadHistory();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'COMPLETED') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentOrder]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'COMPLETED') {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    pollingTimerRef.current = setInterval(async () => {
      try {
        const res = await api.checkTransactionStatus(currentOrder.transaction_code);
        if (res && res.is_completed) {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setCurrentOrder((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
          setIsSuccessModalOpen(true);
          await refreshMe();
        }
      } catch {
        // silence polling error
      }
    }, 3000);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [currentOrder?.transaction_code, currentOrder?.status]);

  const handleCreateOrder = async (planId: string) => {
    if (!user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    setLoadingOrder(true);
    setCheckMessage(null);
    try {
      const res = await api.createVipOrder(planId);
      if (res && res.order) {
        setCurrentOrder(res.order);
        setTimeLeft(900);
        setTimeout(() => {
          document.getElementById('vietqr-box')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể tạo đơn hàng, vui lòng thử lại.');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleCheckNow = async () => {
    if (!currentOrder) return;
    setCheckingPayment(true);
    setCheckMessage(null);

    try {
      const res = await api.checkOrderNow(currentOrder.order_id);
      if (res && res.is_completed) {
        setCurrentOrder((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
        setIsSuccessModalOpen(true);
        await refreshMe();
      } else {
        setCheckMessage(res?.message || 'Hệ thống đang kiểm tra giao dịch...');
      }
    } catch (err: any) {
      setCheckMessage(err.message || 'Chưa nhận được giao dịch. Vui lòng đợi trong giây lát.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[1] || null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-20 backdrop-blur-md bg-opacity-95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
                <Crown className="w-4 h-4 fill-slate-950" />
              </span>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">TOEIC Master VIP Pro</h1>
                <p className="text-[10px] text-amber-400 font-medium">Kích hoạt đặc quyền học tập & luyện thi</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('checkout')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'checkout'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Gói VIP Pro
            </button>
            {user && (
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <HistoryIcon className="w-3.5 h-3.5" /> Lịch sử
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>NÂNG CẤP TÀI KHOẢN VIP PRO</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mở khóa toàn diện mọi công cụ bứt phá TOEIC
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Học không giới hạn với bộ đề ETS bản quyền, tra từ song ngữ, annotator vẽ trên đề thi và gia sư trí tuệ nhân tạo Gemini 24/7.
          </p>

          {user && (user.role === 'vip' || user.is_vip) && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tài khoản của bạn hiện đang kích hoạt gói VIP Pro! Bạn vẫn có thể mua thêm để gia hạn.</span>
            </div>
          )}
        </div>

        {activeTab === 'checkout' && (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                  Chọn gói học viên VIP Pro phù hợp
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`relative rounded-3xl p-5 sm:p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-white border-2 border-amber-500 shadow-xl ring-4 ring-amber-500/10'
                          : 'bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md'
                      }`}
                    >
                      {p.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                          {p.badge}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-3 mt-1">
                          <h4 className="text-base sm:text-lg font-bold text-slate-900">{p.name}</h4>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-slate-300 bg-slate-50'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{p.description}</p>

                        <div className="mb-5 pb-5 border-b border-slate-100">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900">
                              {Number(p.price).toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-slate-500">VNĐ</span>
                          </div>
                          {p.original_price && p.original_price > p.price && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400 line-through">
                                {Number(p.original_price).toLocaleString()} đ
                              </span>
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                                -{Math.round((1 - p.price / p.original_price) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Đặc quyền gói này:
                          </div>
                          {p.features?.map((f, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanId(p.id);
                            handleCreateOrder(p.id);
                          }}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <span>Thanh toán gói này</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          ) : (
                            'Chọn gói này'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div id="vietqr-box" className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                  Quét mã VietQR chuyển khoản tự động
                </h3>
              </div>

              {!user ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Vui lòng đăng nhập để nâng cấp VIP</h4>
                  <p className="text-xs text-slate-600">
                    Gói VIP sẽ được gắn trực tiếp vào tài khoản của bạn để đồng bộ tiến độ học tập trên mọi thiết bị.
                  </p>
                  <button
                    onClick={() => onOpenAuth?.('login')}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Đăng nhập hoặc Đăng ký ngay
                  </button>
                </div>
              ) : !currentOrder ? (
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-8 text-center max-w-xl mx-auto space-y-4 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Gói đã chọn: {selectedPlan?.name || 'VIP Pro 6 Tháng'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Tổng tiền thanh toán:{' '}
                      <span className="font-bold text-slate-900">
                        {Number(selectedPlan?.price || 499000).toLocaleString()} VNĐ
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreateOrder(selectedPlanId)}
                    disabled={loadingOrder}
                    className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    {loadingOrder ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    <span>Tạo mã QR thanh toán ngay</span>
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Hỗ trợ quét qua tất cả ứng dụng ngân hàng: Vietcombank, MB, Techcombank, ACB, MoMo...
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 sm:p-7">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-5 flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="relative p-3 bg-white rounded-2xl shadow-xs border border-slate-200">
                        <img
                          src={currentOrder.qr_url}
                          alt="Mã QR Chuyển khoản VietQR"
                          className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                        />
                        <div className="absolute top-4 right-4 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                          VietQR
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Hết hạn trong: </span>
                        <span className="font-mono font-bold text-amber-600">
                          {formatCountdown(timeLeft)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                        Mở App Ngân hàng hoặc MoMo &gt; Quét mã QR &gt; Tiền & Nội dung sẽ tự động điền chính xác.
                      </p>
                    </div>

                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Đơn hàng
                          </span>
                          <h4 className="text-base font-bold text-slate-900">{currentOrder.plan_name}</h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Đang chờ chuyển khoản
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Ngân hàng thụ hưởng</div>
                            <div className="font-bold text-slate-900">{currentOrder.bank_name} ({currentOrder.bank_code})</div>
                          </div>
                          <Building2 className="w-5 h-5 text-slate-400" />
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Số tài khoản</div>
                            <div className="font-mono text-sm font-black text-blue-700 tracking-wider">
                              {currentOrder.account_number}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(currentOrder.account_number, 'acc')}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'acc' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedKey === 'acc' ? 'Đã sao chép' : 'Sao chép'}</span>
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Chủ tài khoản</div>
                            <div className="font-bold text-slate-900 uppercase">{currentOrder.account_name}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(currentOrder.account_name, 'holder')}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'holder' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedKey === 'holder' ? 'Đã sao chép' : 'Sao chép'}</span>
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-amber-700 uppercase">Số tiền chuyển khoản chính xác</div>
                            <div className="text-base font-black text-amber-950">
                              {currentOrder.formatted_amount}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(currentOrder.amount), 'amt')}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold text-xs hover:bg-amber-50 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === 'amt' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedKey === 'amt' ? 'Đã sao chép' : 'Sao chép'}</span>
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-blue-50/70 border-2 border-blue-300 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-blue-700 uppercase">
                              Nội dung chuyển khoản (Bắt buộc giữ nguyên)
                            </div>
                            <div className="font-mono text-sm font-black text-blue-900 tracking-wider">
                              {currentOrder.transaction_code}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(currentOrder.transaction_code, 'code')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            {copiedKey === 'code' ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedKey === 'code' ? 'Đã sao chép' : 'Sao chép'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>Quy tắc kích hoạt tự động 100%:</span>
                        </div>
                        <p className="text-rose-700 leading-relaxed pl-5">
                          Ngân hàng sẽ tự động đối soát nội dung <strong>{currentOrder.transaction_code}</strong> để kích hoạt VIP trong vòng 5 - 30 giây. Vui lòng không thay đổi nội dung chuyển khoản.
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                        <button
                          type="button"
                          onClick={handleCheckNow}
                          disabled={checkingPayment}
                          className="w-full sm:flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                        >
                          {checkingPayment ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>Tôi đã chuyển khoản - Kiểm tra ngay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentOrder(null);
                            setCheckMessage(null);
                          }}
                          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs cursor-pointer transition-colors"
                        >
                          Hủy / Đổi gói khác
                        </button>
                      </div>

                      {checkMessage && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium text-center animate-in fade-in">
                          {checkMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Kích hoạt tự động 24/7</h5>
                  <p className="text-[11px] text-slate-500">Hệ thống khớp lệnh ngân hàng tức thì</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">An toàn tuyệt đối</h5>
                  <p className="text-[11px] text-slate-500">Chuyển khoản trực tiếp tới tài khoản chính chủ</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Đặc quyền trọn bộ</h5>
                  <p className="text-[11px] text-slate-500">Mở khóa 100% đề thi & tài liệu độc quyền</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Lịch sử đơn hàng của bạn
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh sách các lần đăng ký và trạng thái thanh toán gói VIP
                </p>
              </div>
              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Đang tải lịch sử giao dịch...
              </div>
            ) : historyOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <p>Bạn chưa có đơn hàng nào.</p>
                <button
                  onClick={() => setActiveTab('checkout')}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xs cursor-pointer"
                >
                  Xem các gói VIP Pro ngay
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Mã đơn</th>
                      <th className="py-2.5 px-3">Gói học</th>
                      <th className="py-2.5 px-3">Số tiền</th>
                      <th className="py-2.5 px-3">Nội dung chuyển</th>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">#{ord.id}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{ord.plan_name}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{ord.formatted_amount}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{ord.transaction_code}</td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">{ord.created_at}</td>
                        <td className="py-3 px-3">
                          {ord.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã kích hoạt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Đang chờ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-amber-300 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <Crown className="w-8 h-8 fill-slate-950" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                THANH TOÁN THÀNH CÔNG
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Chúc mừng bạn đã là VIP Pro!
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Đặc quyền gói <strong>{currentOrder?.plan_name}</strong> đã được kích hoạt trên tài khoản của bạn. Toàn bộ đề thi ETS, tra song ngữ và gia sư AI đã sẵn sàng.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-left text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Bạn có thể bắt đầu ngay:</span>
              </div>
              <ul className="text-[11px] text-amber-800 pl-4 list-disc space-y-0.5">
                <li>Làm trọn vẹn 200 câu các đề thi ETS mới nhất</li>
                <li>Bật chế độ Tra từ song ngữ và ghi chú màu Annotator</li>
                <li>Trò chuyện hỏi bài không giới hạn với gia sư AI Gemini</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setIsSuccessModalOpen(false);
                onNavigate('/mock-tests');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer"
            >
              Vào luyện thi đề VIP ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};