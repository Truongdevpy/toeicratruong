import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Zap,
  Play,
  CreditCard,
  History as HistoryIcon
} from 'lucide-react';
import { api } from '../services/api';

export interface BankingConfig {
  enabled: boolean;
  api_type: string;
  bank_name: string;
  bank_code: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  content_prefix: string;
  vietqr_template: string;
  token?: string;
  has_token?: boolean;
  token_masked?: string;
  webhook_secret?: string;
  has_webhook_secret?: boolean;
  webhook_secret_masked?: string;
  vietqr_preview_url?: string;
}

export function AdminBankingCard() {
  const [config, setConfig] = useState<BankingConfig>({
    enabled: true,
    api_type: 'thueapi',
    bank_name: 'MB Bank',
    bank_code: 'MBBANK',
    bank_bin: '970422',
    account_number: '0868133346',
    account_name: 'NGUYEN THE TRUONG',
    content_prefix: 'TOEIC',
    vietqr_template: 'compact2',
    token: '',
    has_token: false,
    webhook_secret: '',
    has_webhook_secret: false,
  });

  const [bankDirectory, setBankDirectory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [testingFetch, setTestingFetch] = useState<boolean>(false);
  const [testModalData, setTestModalData] = useState<any | null>(null);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cfgRes, statsRes, txsRes, revRes] = await Promise.all([
        api.getAdminBankingConfig(),
        api.getAdminBankingStats(),
        api.getAdminBankingTransactions(50),
        api.getAdminRevenue()
      ]);

      if (cfgRes && cfgRes.config) {
        setConfig(cfgRes.config);
      }
      if (cfgRes && cfgRes.bank_directory) {
        setBankDirectory(cfgRes.bank_directory);
      }
      if (statsRes) {
        setStats(statsRes);
      }
      if (txsRes && txsRes.transactions) {
        setTransactions(txsRes.transactions);
      }
      if (revRes && revRes.recent_orders) {
        setRecentOrders(revRes.recent_orders);
      }
    } catch (err) {
      console.error('Failed to load banking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSelectBankPreset = (bankCode: string) => {
    const found = bankDirectory.find((b: any) => b.code === bankCode);
    if (found) {
      setConfig((prev: BankingConfig) => ({
        ...prev,
        bank_name: found.name,
        bank_code: found.code,
        bank_bin: found.bin
      }));
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.updateAdminBankingConfig(config);
      if (res && res.config) {
        setConfig(res.config);
      }
      showToast('Đã lưu cấu hình ngân hàng & VietQR thành công!');
      // Reload stats & preview
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncBanking = async () => {
    setSyncing(true);
    try {
      const res = await api.syncAdminBanking();
      showToast(res.message || 'Đồng bộ giao dịch ngân hàng thành công!');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đồng bộ ngân hàng.');
    } finally {
      setSyncing(false);
    }
  };

  const handleTestFetch = async () => {
    setTestingFetch(true);
    try {
      const res = await api.testAdminBankingFetch(config);
      setTestModalData(res);
    } catch (err: any) {
      setTestModalData({
        success: false,
        error: err.message || 'Không thể kết nối đến API ngân hàng.'
      });
    } finally {
      setTestingFetch(false);
    }
  };

  const handleApproveOrder = async (orderId: number) => {
    if (!window.confirm(`Xác nhận duyệt thanh toán thủ công cho đơn hàng #${orderId}? Tài khoản học viên sẽ được kích hoạt VIP Pro ngay lập tức.`)) {
      return;
    }
    try {
      const res = await api.adminApprovePayment(orderId);
      showToast(res.message || 'Đã duyệt đơn hàng thành công!');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi duyệt đơn hàng.');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const previewQrUrl = `https://img.vietqr.io/image/${config.bank_code}-${config.account_number}-${config.vietqr_template || 'compact2'}.png?amount=499000&addInfo=${encodeURIComponent(config.content_prefix + ' DEMO123')}&accountName=${encodeURIComponent(config.account_name)}`;
  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Cấu hình Ngân hàng, VietQR & Tự động duyệt thanh toán</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động tạo mã QR VietQR Napas247, đọc biến động số dư và kích hoạt VIP Pro khi nội dung chuyển khoản trùng khớp
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleTestFetch}
            disabled={testingFetch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${testingFetch ? 'animate-spin' : ''}`} />
            <span>Kiểm tra kết nối</span>
          </button>

          <button
            type="button"
            onClick={handleSyncBanking}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Đồng bộ ngay</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer transition-colors"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng GD Ngân hàng</div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {stats?.total_bank_transactions || 0}
          </div>
          <div className="text-[10px] text-slate-400">Giao dịch thu thập được</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã khớp VIP Pro</div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {stats?.credited_bank_transactions || 0}
          </div>
          <div className="text-[10px] text-emerald-600">Khớp nội dung & kích hoạt</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giao dịch bỏ qua</div>
          <div className="text-xl font-black text-slate-600 mt-1">
            {stats?.ignored_bank_transactions || 0}
          </div>
          <div className="text-[10px] text-slate-400">Không khớp mã hoặc thiếu tiền</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Doanh thu thực tế</div>
          <div className="text-xl font-black text-blue-700 mt-1">
            {Number(stats?.total_revenue || 0).toLocaleString()} <span className="text-xs font-normal">đ</span>
          </div>
          <div className="text-[10px] text-blue-600">Đơn hàng hoàn tất</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Đơn chờ duyệt</div>
          <div className="text-xl font-black text-amber-600 mt-1">
            {stats?.pending_orders || 0}
          </div>
          <div className="text-[10px] text-amber-600">Có thể duyệt tay thủ công</div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Settings (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Thông tin tài khoản thụ hưởng & Kết nối
            </h4>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="text-xs font-bold text-slate-700">
                {config.enabled ? 'Đang bật nhận tiền' : 'Đang tạm tắt'}
              </span>
            </label>
          </div>

          {/* Quick Bank Presets */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Chọn nhanh ngân hàng hỗ trợ VietQR
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {bankDirectory.slice(0, 8).map((b: any) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => handleSelectBankPreset(b.code)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    config.bank_code === b.code
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                  }`}
                >
                  <div className="truncate">{b.short_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{b.code}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên ngân hàng</label>
              <input
                type="text"
                value={config.bank_name}
                onChange={(e) => setConfig({ ...config, bank_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                placeholder="MB Bank"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mã ngân hàng (Bank Code / BIN)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={config.bank_code}
                  onChange={(e) => setConfig({ ...config, bank_code: e.target.value.toUpperCase() })}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono font-bold"
                  placeholder="MBBANK"
                />
                <input
                  type="text"
                  value={config.bank_bin}
                  onChange={(e) => setConfig({ ...config, bank_bin: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  placeholder="970422"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số tài khoản nhận tiền</label>
              <input
                type="text"
                value={config.account_number}
                onChange={(e) => setConfig({ ...config, account_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono font-bold text-blue-700"
                placeholder="Ví dụ: 0868133346"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên chủ tài khoản (In hoa không dấu)</label>
              <input
                type="text"
                value={config.account_name}
                onChange={(e) => setConfig({ ...config, account_name: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                placeholder="NGUYEN THE TRUONG"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiền tố nội dung chuyển khoản</label>
              <input
                type="text"
                value={config.content_prefix}
                onChange={(e) => setConfig({ ...config, content_prefix: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono font-black text-amber-700"
                placeholder="TOEIC"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Hệ thống tạo mã memo dạng: {config.content_prefix || 'TOEIC'} &lt;USER_ID&gt; &lt;MÃ_ĐƠN&gt;</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mẫu giao diện VietQR</label>
              <select
                value={config.vietqr_template}
                onChange={(e) => setConfig({ ...config, vietqr_template: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                <option value="compact2">Compact 2 (Chuẩn có khung tiền)</option>
                <option value="compact">Compact (Đơn giản)</option>
                <option value="qr_only">QR Only (Chỉ mã QR thuần)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Phương thức kết nối tự động</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại API đồng bộ</label>
                <select
                  value={config.api_type}
                  onChange={(e) => setConfig({ ...config, api_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-medium"
                >
                  <option value="thueapi">ThueAPI MBBank (Đọc lịch sử giao dịch qua API Token)</option>
                  <option value="webhook">Webhook SePay / Cass / Ngân hàng (Nhận thông báo tức thì)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {config.api_type === 'thueapi' ? 'API Token MBBank (ThueAPI)' : 'Webhook Secret Key'}
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={config.token || ''}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    placeholder={config.has_token ? '•••••••• (Đã cấu hình token)' : 'Nhập API Token MBBank'}
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Endpoint Webhook nhận thông báo tự động:</div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-blue-700 bg-white p-2 rounded-lg border border-slate-200">
                <span className="flex-1 truncate">{window.location.origin}/api/payments/webhook</span>
                <button
                  type="button"
                  onClick={() => handleCopy(`${window.location.origin}/api/payments/webhook`, 'wh')}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500"
                >
                  {copiedKey === 'wh' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live VietQR Preview (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between items-center text-center">
          <div className="w-full">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Xem trước mã VietQR học viên sẽ quét
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-3 flex items-center justify-center">
              <img
                src={previewQrUrl}
                alt="Xem trước VietQR"
                className="w-48 h-48 object-contain rounded-xl shadow-xs bg-white p-2 border border-slate-200"
              />
            </div>
            <div className="text-xs space-y-1 text-slate-600">
              <div className="font-bold text-slate-900">{config.bank_name}</div>
              <div className="font-mono text-blue-700 font-bold">{config.account_number}</div>
              <div className="font-semibold text-slate-800">{config.account_name}</div>
              <div className="font-mono text-amber-700 font-bold text-[11px] bg-amber-50 p-1 rounded-md">
                Nội dung mẫu: {config.content_prefix || 'TOEIC'} DEMO123
              </div>
            </div>
          </div>

          <div className="w-full pt-4 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {saving ? 'Đang lưu cấu hình...' : 'Lưu cấu hình ngân hàng'}
            </button>
          </div>
        </div>
      </div>
      {/* Orders & Manual Approval Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Danh sách Đơn hàng VIP & Duyệt tay thủ công</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Nếu học viên chuyển khoản sai cú pháp hoặc ngân hàng bảo trì, Admin có thể duyệt tay 1-click để cấp quyền VIP Pro ngay
            </p>
          </div>
          <button
            type="button"
            onClick={loadAllData}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Chưa có đơn hàng nào phát sinh.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Mã đơn</th>
                  <th className="py-2.5 px-3">Học viên</th>
                  <th className="py-2.5 px-3">Gói học</th>
                  <th className="py-2.5 px-3">Số tiền</th>
                  <th className="py-2.5 px-3">Nội dung memo</th>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((ord: any) => (
                  <tr key={ord.id || ord.raw_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{ord.id}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{ord.user_name}</div>
                      <div className="text-[10px] text-slate-400">{ord.email}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-blue-700">{ord.plan_name}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">{ord.formatted_amount}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800 bg-amber-50/60 px-2 py-0.5 rounded">
                      {ord.transaction_code}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{ord.created_at}</td>
                    <td className="py-2.5 px-3">
                      {ord.raw_status === 'COMPLETED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Thành công
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Chờ thanh toán
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {ord.raw_status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleApproveOrder(ord.raw_id || ord.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                        >
                          Duyệt tay ngay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Bank Transactions Log Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-blue-600" />
              <span>Lịch sử Biến động Số dư từ Ngân hàng (Audit Log)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Giao dịch thực tế nhận được từ tài khoản ngân hàng và kết quả đối soát tự động của hệ thống
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Chưa có bản ghi giao dịch ngân hàng nào được ghi nhận.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Mã GD Bank</th>
                  <th className="py-2.5 px-3">Ngân hàng</th>
                  <th className="py-2.5 px-3">Số tiền</th>
                  <th className="py-2.5 px-3">Nội dung chuyển khoản</th>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Kết quả đối soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{tx.bank_transaction_id}</td>
                    <td className="py-2.5 px-3 font-bold text-blue-700">{tx.provider}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">{tx.formatted_amount}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 max-w-xs truncate" title={tx.content}>
                      {tx.content}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{tx.created_at}</td>
                    <td className="py-2.5 px-3">
                      {tx.status === 'PROCESSED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" /> Đã khớp VIP Pro
                        </span>
                      ) : tx.status === 'IGNORED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600" title={tx.error_message}>
                          Bỏ qua
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                          Chờ duyệt
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

      {/* Test Connection Modal */}
      {testModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${testModalData.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <h4 className="text-sm font-bold text-slate-900">Kết quả kiểm tra kết nối API Ngân hàng</h4>
              </div>
              <button
                type="button"
                onClick={() => setTestModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 text-xs">
              <div className={`p-3 rounded-xl border ${
                testModalData.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {testModalData.message || testModalData.error}
              </div>

              {testModalData.transactions && testModalData.transactions.length > 0 && (
                <div>
                  <div className="font-bold text-slate-800 mb-2">
                    Các giao dịch ngân hàng đọc được gần đây ({testModalData.transactions.length}):
                  </div>
                  <div className="space-y-2">
                    {testModalData.transactions.map((it: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700">Mã: {it.transaction_id}</span>
                          <span className="font-bold text-emerald-700">+{Number(it.amount).toLocaleString()} đ</span>
                        </div>
                        <div className="text-slate-700">{it.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setTestModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}