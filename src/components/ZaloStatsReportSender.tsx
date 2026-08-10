import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart3, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Users, 
  RefreshCw, 
  MessageSquare,
  Sparkles,
  Eye
} from "lucide-react";
import { 
  fetchAppointmentsFromSupabase, 
  fetchPayoutRequestsFromSupabase, 
  fetchAllUserProfilesFromSupabase 
} from "../lib/supabase";
import { sendZaloAdminStatsReport } from "../services/zaloService";

interface ZaloStatsReportSenderProps {
  defaultChatId?: string;
  onToast?: (msg: string) => void;
}

export const ZaloStatsReportSender: React.FC<ZaloStatsReportSenderProps> = ({
  defaultChatId = "",
  onToast
}) => {
  const [period, setPeriod] = useState<"today" | "this_month" | "all_time">("this_month");
  const [targetChatId, setTargetChatId] = useState<string>(defaultChatId);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dữ liệu báo cáo động từ DB
  const [appointments, setAppointments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (defaultChatId && !targetChatId) {
      setTargetChatId(defaultChatId);
    }
  }, [defaultChatId]);

  // Load live data from Supabase/LocalStorage
  const loadSystemStatsData = async () => {
    setLoadingData(true);
    try {
      const [remoteApts, remotePayouts, remoteUsers] = await Promise.all([
        fetchAppointmentsFromSupabase(),
        fetchPayoutRequestsFromSupabase(),
        fetchAllUserProfilesFromSupabase()
      ]);

      if (remoteApts) setAppointments(remoteApts);
      if (remotePayouts) setPayouts(remotePayouts);
      if (remoteUsers) setUsers(remoteUsers);
    } catch (e) {
      // Quiet catch
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadSystemStatsData();
  }, []);

  // Tính toán chỉ số theo kỳ báo cáo
  const computedStats = useMemo(() => {
    const now = new Date();
    const curMStr = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
    const curYMD = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const curVNDate = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

    let periodText = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
    if (period === "today") periodText = `Hôm nay (${curVNDate})`;
    if (period === "all_time") periodText = "Tất cả thời gian";

    // Lọc Lịch hẹn
    const filteredApts = appointments.filter((a) => {
      if (period === "all_time") return true;
      const d = a.date || "";
      if (period === "today") {
        return d.includes(curVNDate) || d.startsWith(curYMD);
      }
      return d.includes(curMStr) || d.startsWith(curYMD.slice(0, 7));
    });

    const completedApts = filteredApts.filter((a) => a.status === "Hoàn thành");
    const totalRevenue = completedApts.reduce((sum, a) => sum + (a.estimatedValue || 35000000), 0);

    // Lọc Yêu cầu Rút tiền
    const filteredPayouts = payouts.filter((p) => {
      if (period === "all_time") return true;
      const reqAt = p.requestedAt || "";
      if (period === "today") {
        return reqAt.includes(curVNDate) || reqAt.startsWith(curYMD);
      }
      return reqAt.includes(curMStr) || reqAt.startsWith(curYMD.slice(0, 7));
    });

    const paidPayouts = filteredPayouts.filter(
      (p) => p.status === "Giải ngân thành công" || p.status === "Đã chuyển tiền" || p.status === "Đã duyệt"
    );
    const totalCommissionPaid = paidPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingPayouts = payouts.filter(
      (p) => p.status === "Chờ kế toán kiểm tra" || p.status === "Kế toán đã kiểm tra - Chờ Admin duyệt"
    );
    const totalPendingPayout = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    const activeUsers = users.filter((u) => u.status !== "suspended" && !u.isSuspended).length;

    return {
      periodText,
      totalRevenue,
      totalAppointments: filteredApts.length,
      completedAppointments: completedApts.length,
      totalCommissionPaid,
      totalPendingPayout,
      totalUsers: users.length || 1,
      activeUsers: activeUsers || 1
    };
  }, [period, appointments, payouts, users]);

  // Preview nội dung tin nhắn Zalo OA
  const previewMessageText = useMemo(() => {
    return (
      `📊 *BÁO CÁO THỐNG KÊ DOANH SỐ & HỆ THỐNG KOREAN STAR*\n` +
      `🗓 Kỳ báo cáo: *${computedStats.periodText}*\n\n` +
      `💵 Tổng doanh số: *${computedStats.totalRevenue.toLocaleString("vi-VN")} VNĐ*\n` +
      `📅 Tổng lịch hẹn: *${computedStats.totalAppointments} ca* (*${computedStats.completedAppointments}* hoàn thành)\n` +
      `🎉 Hoa hồng đã chi trả: *${computedStats.totalCommissionPaid.toLocaleString("vi-VN")} VNĐ*\n` +
      `⏳ Chờ giải ngân ví: *${computedStats.totalPendingPayout.toLocaleString("vi-VN")} VNĐ*\n` +
      `👥 Số CTV hoạt động: *${computedStats.activeUsers}/${computedStats.totalUsers} CTV*\n\n` +
      `⚡ Báo cáo tự động từ Bệnh viện Thẩm mỹ Quốc tế Korean Star`
    );
  }, [computedStats]);

  const handleSendReport = async () => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setSending(true);

    try {
      const res = await sendZaloAdminStatsReport(computedStats, targetChatId.trim());
      if (res.success) {
        const msg = `🎉 Đã gửi báo cáo thống kê kỳ "${computedStats.periodText}" qua Zalo OA thành công!`;
        setSuccessMsg(msg);
        onToast?.(msg);
      } else {
        const err = res.error || "Không thể gửi báo cáo Zalo OA. Vui lòng kiểm tra Zalo Bot Token & Chat ID.";
        setErrorMsg(err);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi hệ thống khi gửi báo cáo Zalo OA.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              Gửi Báo Cáo Thống Kê Qua Zalo OA
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Báo cáo doanh số, lịch hẹn & hoa hồng chi trả tự động về Zalo Official Account
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSystemStatsData}
          disabled={loadingData}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition cursor-pointer"
          title="Tải lại dữ liệu thống kê"
        >
          <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Cấu hình tùy chọn gửi báo cáo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-slate-700 font-extrabold mb-1">
            Chọn Kỳ Báo Cáo Thống Kê:
          </label>
          <select
            id="zalo_report_period"
            name="zalo_report_period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="today">🗓️ Hôm Nay (Today)</option>
            <option value="this_month">📅 Tháng Này (This Month)</option>
            <option value="all_time">📈 Tất Cả Thời Gian (All Time)</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-700 font-extrabold mb-1">
            Chat ID Zalo OA Nhận Báo Cáo (*):
          </label>
          <input
            id="zalo_report_chatid"
            name="zalo_report_chatid"
            type="text"
            value={targetChatId}
            onChange={(e) => setTargetChatId(e.target.value)}
            placeholder="Nhập Chat ID hoặc Zalo Phone Admin..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* LIVE PREVIEW BOX - XEM TRƯỚC NỘI DUNG ZALO OA */}
      <div className="space-y-1.5">
        <label className="text-slate-700 font-extrabold text-xs flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-blue-600" /> Xem Trước Tin Nhắn Báo Cáo Zalo OA:
        </label>
        <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-blue-500/20 text-blue-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
            Zalo OA Card
          </div>
          {previewMessageText}
        </div>
      </div>

      {/* BUTTON NÚT GỬI BÁO CÁO */}
      <button
        type="button"
        onClick={handleSendReport}
        disabled={sending}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
      >
        {sending ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" /> Đang Gửi Báo Cáo Qua Zalo OA...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Gửi Báo Cáo Thống Kê Qua Zalo OA Ngay
          </>
        )}
      </button>

      {/* Thông báo kết quả */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Lỗi Zalo OA: {errorMsg}</span>
        </div>
      )}
    </div>
  );
};
