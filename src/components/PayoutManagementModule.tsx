import React, { useState } from "react";
import { PayoutRequest, PayoutStatus, PayoutAuditLog } from "../types";
import { 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ShieldCheck, 
  QrCode, 
  FileCheck, 
  History, 
  Crown, 
  UserCheck, 
  Clock, 
  Send, 
  ArrowRight, 
  X, 
  Save, 
  FileText,
  AlertCircle,
  Building2,
  Lock,
  ChevronRight,
  Sparkles,
  DollarSign,
  Workflow,
  Eye,
  Copy,
  Check,
  Trash2
} from "lucide-react";
import { formatDateVN, formatDateTimeVN } from "../utils/formatters";
import { getBankLogo } from "../lib/banks";
import { notifyPayoutCompleted } from "../lib/onesignal";

interface PayoutManagementModuleProps {
  payoutRequests: PayoutRequest[];
  onUpdatePayoutRequest: (updatedReq: PayoutRequest) => void;
  onDeletePayoutRequest?: (id: string) => void;
  currentRole: "admin" | "accountant" | "ctv" | "editor" | "customer";
  currentUserFullName?: string;
}

export const PayoutManagementModule: React.FC<PayoutManagementModuleProps> = ({
  payoutRequests,
  onUpdatePayoutRequest,
  onDeletePayoutRequest,
  currentRole,
  currentUserFullName = "Nguyễn Thị B"
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedLogRequest, setSelectedLogRequest] = useState<PayoutRequest | null>(null);

  // Workflow 5-step Popup Modal State
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // Mobile Full Detail Modal Popup State
  const [detailModalRequest, setDetailModalRequest] = useState<PayoutRequest | null>(null);
  const [copiedStk, setCopiedStk] = useState(false);

  // Modal State for Step 4: Accountant transaction details input
  const [txModalRequest, setTxModalRequest] = useState<PayoutRequest | null>(null);
  const [txCodeInput, setTxCodeInput] = useState("");
  const [txNotesInput, setTxNotesInput] = useState("");
  const [txProofImageInput, setTxProofImageInput] = useState<string>("");
  const [viewingProofImage, setViewingProofImage] = useState<string | null>(null);

  // Modal State for Rejecting
  const [rejectModalRequest, setRejectModalRequest] = useState<PayoutRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  // Step 2: Accountant Verify
  const handleAccountantVerify = (req: PayoutRequest) => {
    const nowStr = formatDateTimeVN(new Date().toISOString().replace("T", " ").slice(0, 16));
    const newLog: PayoutAuditLog = {
      id: `log-${Date.now()}`,
      payoutId: req.id,
      timestamp: nowStr,
      actorRole: "accountant",
      actorName: currentUserFullName || "Kế Toán Trưởng VietQR",
      action: "Kế toán kiểm tra & đối soát thông tin tài khoản ngân hàng",
      previousStatus: req.status,
      newStatus: "Kế toán đã kiểm tra - Chờ Admin duyệt",
      notes: `Đã đối soát thông tin tài khoản ${req.bankName} (${req.accountNumber}) hợp lệ.`
    };

    const updated: PayoutRequest = {
      ...req,
      status: "Kế toán đã kiểm tra - Chờ Admin duyệt",
      verifiedByAccountantAt: nowStr,
      logs: [...(req.logs || []), newLog]
    };

    onUpdatePayoutRequest(updated);
    if (detailModalRequest?.id === req.id) setDetailModalRequest(updated);
  };

  // Step 3: Admin Approve
  const handleAdminApprove = (req: PayoutRequest) => {
    const nowStr = formatDateTimeVN(new Date().toISOString().replace("T", " ").slice(0, 16));
    const newLog: PayoutAuditLog = {
      id: `log-${Date.now()}`,
      payoutId: req.id,
      timestamp: nowStr,
      actorRole: "admin",
      actorName: currentUserFullName || "Nguyễn Thị B",
      action: "Admin ký duyệt phê duyệt giải ngân khoản hoa hồng",
      previousStatus: req.status,
      newStatus: "Admin đã phê duyệt - Chờ kế toán chi tiền",
      notes: `Đã duyệt duyệt giải ngân khoản tiền ${req.amount.toLocaleString("vi-VN")} VNĐ cho CTV ${req.ctvName}.`
    };

    const updated: PayoutRequest = {
      ...req,
      status: "Admin đã phê duyệt - Chờ kế toán chi tiền",
      approvedByAdminAt: nowStr,
      logs: [...(req.logs || []), newLog]
    };

    onUpdatePayoutRequest(updated);
    if (detailModalRequest?.id === req.id) setDetailModalRequest(updated);
    notifyPayoutCompleted({
      ctvUserId: req.ctvUserId || req.ctvCode,
      ctvName: req.ctvName,
      amount: req.amount,
      status: "Admin đã phê duyệt"
    });
  };

  // Step 4: Accountant Submit Transaction Details + Proof Image
  const handleAccountantCompleteTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txModalRequest || !txCodeInput) return;

    const nowStr = formatDateTimeVN(new Date().toISOString().replace("T", " ").slice(0, 16));
    const newLog: PayoutAuditLog = {
      id: `log-${Date.now()}`,
      payoutId: txModalRequest.id,
      timestamp: nowStr,
      actorRole: "accountant",
      actorName: currentUserFullName || "Kế Toán Trưởng VietQR",
      action: "Kế toán chi tiền thành công qua ngân hàng VietQR & cập nhật mã giao dịch",
      previousStatus: txModalRequest.status,
      newStatus: "Hoàn thành - Đã chi tiền VietQR",
      transactionRef: txCodeInput,
      proofImage: txProofImageInput,
      notes: txNotesInput || `Mã giao dịch ngân hàng: ${txCodeInput}`
    };

    const updated: PayoutRequest = {
      ...txModalRequest,
      status: "Hoàn thành - Đã chi tiền VietQR",
      transactionRef: txCodeInput,
      proofImage: txProofImageInput,
      completedAt: nowStr,
      logs: [...(txModalRequest.logs || []), newLog]
    };

    onUpdatePayoutRequest(updated);
    if (detailModalRequest?.id === txModalRequest.id) setDetailModalRequest(updated);
    notifyPayoutCompleted({
      ctvUserId: txModalRequest.ctvUserId || txModalRequest.ctvCode,
      ctvName: txModalRequest.ctvName,
      amount: txModalRequest.amount,
      status: "Đã giải ngân VietQR thành công"
    });

    setTxModalRequest(null);
    setTxCodeInput("");
    setTxNotesInput("");
    setTxProofImageInput("");
  };

  // Reject Request
  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalRequest) return;

    const nowStr = formatDateTimeVN(new Date().toISOString().replace("T", " ").slice(0, 16));
    const newLog: PayoutAuditLog = {
      id: `log-${Date.now()}`,
      payoutId: rejectModalRequest.id,
      timestamp: nowStr,
      actorRole: currentRole === "admin" ? "admin" : "accountant",
      actorName: currentUserFullName,
      action: "Từ chối lệnh rút tiền từ CTV",
      previousStatus: rejectModalRequest.status,
      newStatus: "Từ chối yêu cầu",
      notes: rejectReasonInput || "Thông tin rút tiền không khớp hoặc chưa đủ điều kiện."
    };

    const updated: PayoutRequest = {
      ...rejectModalRequest,
      status: "Từ chối yêu cầu",
      rejectedReason: rejectReasonInput,
      logs: [...(rejectModalRequest.logs || []), newLog]
    };

    onUpdatePayoutRequest(updated);
    if (detailModalRequest?.id === rejectModalRequest.id) setDetailModalRequest(updated);
    notifyPayoutCompleted({
      ctvUserId: rejectModalRequest.ctvUserId || rejectModalRequest.ctvCode,
      ctvName: rejectModalRequest.ctvName,
      amount: rejectModalRequest.amount,
      status: "Bị từ chối"
    });

    setRejectModalRequest(null);
    setRejectReasonInput("");
  };

  const filteredRequests = payoutRequests.filter((req) => {
    const matchesSearch =
      req.ctvName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.ctvCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.accountNumber.includes(searchTerm) ||
      (req.transactionRef && req.transactionRef.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case "Chờ kế toán kiểm tra":
        return { bg: "bg-amber-100 text-amber-900 border-amber-300", label: "Bước 1: Chờ KT kiểm tra", icon: Clock };
      case "Kế toán đã kiểm tra - Chờ Admin duyệt":
        return { bg: "bg-blue-100 text-blue-900 border-blue-300", label: "Bước 2: Chờ Admin duyệt", icon: UserCheck };
      case "Admin đã phê duyệt - Chờ kế toán chi tiền":
        return { bg: "bg-purple-100 text-purple-900 border-purple-300", label: "Bước 3: Chờ KT chi tiền", icon: Crown };
      case "Hoàn thành - Đã chi tiền VietQR":
        return { bg: "bg-emerald-100 text-emerald-900 border-emerald-300", label: "Hoàn thành VietQR", icon: CheckCircle2 };
      case "Từ chối yêu cầu":
        return { bg: "bg-rose-100 text-rose-900 border-rose-300", label: "Đã từ chối", icon: XCircle };
      default:
        return { bg: "bg-slate-100 text-slate-700 border-slate-300", label: status, icon: Clock };
    }
  };

  const handleCopyStk = (stk: string) => {
    navigator.clipboard.writeText(stk);
    setCopiedStk(true);
    setTimeout(() => setCopiedStk(false), 1500);
  };

  return (
    <div className="space-y-5 font-sans">
      
      {/* Search & Filter Header Bar with Workflow Button */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4.5 h-4.5 text-amber-600" />
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              TÌM KIẾM & LỌC YÊU CẦU RÚT TIỀN:
            </h2>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              {filteredRequests.length} Yêu Cầu
            </span>
          </div>

          {/* Button Tên Quy Trình Duyệt 5 Bước */}
          <button
            onClick={() => setShowWorkflowModal(true)}
            className="bg-[#0B192C] hover:bg-slate-800 text-amber-400 border border-blue-900/60 font-black text-xs px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xs transition cursor-pointer self-stretch sm:self-auto justify-center"
            title="Xem sơ đồ Quy trình duyệt 5 bước chuẩn Kế toán & Admin"
          >
            <Workflow className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Quy Trình Duyệt (5 Bước)</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5" />
            <input id="input_279" name="input_279"
              type="text"
              placeholder="Tìm theo Tên CTV, Mã CTV, Ngân hàng, Số tài khoản hoặc Mã giao dịch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs transition"
            />
          </div>

          <div className="md:col-span-4">
            <select id="status_289" name="status_289"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">✨ Tất cả trạng thái yêu cầu</option>
              <option value="Chờ kế toán kiểm tra">⏳ 1. Chờ kế toán kiểm tra</option>
              <option value="Kế toán đã kiểm tra - Chờ Admin duyệt">🔍 2. Kế toán đã kiểm tra - Chờ Admin duyệt</option>
              <option value="Admin đã phê duyệt - Chờ kế toán chi tiền">👑 3. Admin đã phê duyệt - Chờ chi tiền</option>
              <option value="Hoàn thành - Đã chi tiền VietQR">🎉 4. Hoàn thành - Đã chi tiền VietQR</option>
              <option value="Từ chối yêu cầu">❌ 5. Từ chối yêu cầu</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. DESKTOP LAYOUT: DATA TABLE (DẠNG BẢNG CHO MÀN HÌNH MÁY TÍNH) */}
      {/* ============================================================ */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B192C] text-white text-[11px] font-black uppercase tracking-wider border-b border-blue-900">
                <th className="p-3.5 pl-5">Mã Yêu Cầu & Trạng Thái</th>
                <th className="p-3.5">Cộng Tác Viên</th>
                <th className="p-3.5 text-right">Số Tiền Rút</th>
                <th className="p-3.5">Tài Khoản Thụ Hưởng VietQR</th>
                <th className="p-3.5">Thời Gian Yêu Cầu</th>
                <th className="p-3.5">Mã GD / Biên Lai</th>
                <th className="p-3.5 text-center pr-5">Thao Tác Duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const badge = getStatusBadge(req.status);
                  const StatusIcon = badge.icon;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/90 transition group">
                      {/* 1. Code & Status */}
                      <td className="p-3.5 pl-5 space-y-1">
                        <span className="font-mono font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 block w-max text-xs">
                          {req.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1 ${badge.bg}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* 2. CTV Info */}
                      <td className="p-3.5 space-y-0.5">
                        <div className="font-black text-slate-900 text-sm">{req.ctvName}</div>
                        <span className="font-mono text-[11px] text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                          {req.ctvCode}
                        </span>
                      </td>

                      {/* 3. Amount */}
                      <td className="p-3.5 text-right">
                        <div className="font-mono font-black text-base text-emerald-700">
                          {req.amount.toLocaleString("vi-VN")} <span className="text-xs">đ</span>
                        </div>
                      </td>

                      {/* 4. Bank Details */}
                      <td className="p-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <img 
                            src={getBankLogo(req.bankName)} 
                            alt={req.bankName} 
                            className="w-4 h-4 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0" 
                          />
                          <span>{req.bankName}</span>
                        </div>
                        <div className="font-mono font-black text-blue-900 flex items-center gap-1">
                          <span>{req.accountNumber}</span>
                          <button 
                            onClick={() => handleCopyStk(req.accountNumber)}
                            className="text-slate-400 hover:text-blue-700 transition" 
                            title="Sao chép STK"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">{req.accountHolder}</div>
                      </td>

                      {/* 5. Requested Time */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-600">
                        {req.requestedAt}
                      </td>

                      {/* 6. Tx Ref & Receipt */}
                      <td className="p-3.5 space-y-1">
                        {req.transactionRef ? (
                          <div className="font-mono font-black text-emerald-800 text-[11px]">
                            {req.transactionRef}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Chưa phát sinh</span>
                        )}

                        {req.proofImage && (
                          <button
                            onClick={() => setViewingProofImage(req.proofImage!)}
                            className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-emerald-700" /> Xem biên lai
                          </button>
                        )}
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="p-3.5 pr-5 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {req.status === "Chờ kế toán kiểm tra" && (
                            <>
                              <button
                                onClick={() => handleAccountantVerify(req)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>KT Kiểm Tra</span>
                              </button>
                              {currentRole === "admin" && (
                                <button
                                  onClick={() => handleAdminApprove(req)}
                                  className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1"
                                  title="Admin duyệt trực tiếp khoản hoa hồng này"
                                >
                                  <Crown className="w-3.5 h-3.5" />
                                  <span>Admin Duyệt Nhanh</span>
                                </button>
                              )}
                            </>
                          )}

                          {req.status === "Kế toán đã kiểm tra - Chờ Admin duyệt" && (
                            <button
                              onClick={() => handleAdminApprove(req)}
                              className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>Admin Duyệt</span>
                            </button>
                          )}

                          {req.status === "Admin đã phê duyệt - Chờ kế toán chi tiền" && (
                            <button
                              onClick={() => setTxModalRequest(req)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>KT Chi Tiền</span>
                            </button>
                          )}

                          {req.status !== "Hoàn thành - Đã chi tiền VietQR" && req.status !== "Từ chối yêu cầu" && (
                            <button
                              onClick={() => setRejectModalRequest(req)}
                              className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl transition"
                              title="Từ chối yêu cầu"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedLogRequest(req)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                            title="Xem nhật ký Audit Log"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {(currentRole === "admin" || onDeletePayoutRequest) && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc chắn muốn xóa yêu cầu rút hoa hồng ${req.id} của CTV ${req.ctvName}?`)) {
                                  if (onDeletePayoutRequest) onDeletePayoutRequest(req.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition"
                              title="Xóa yêu cầu rút tiền này"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    Không tìm thấy yêu cầu rút tiền nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MOBILE LAYOUT: COMPACT GRID GỌN GÀNG (CHO MOBILE/TABLET) */}
      {/* ============================================================ */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const badge = getStatusBadge(req.status);
            const StatusIcon = badge.icon;

            return (
              <div
                key={req.id}
                className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl p-4 text-slate-900 space-y-3 shadow-xs transition flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-amber-800 font-mono font-black text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {req.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${badge.bg}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* CTV Name & Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{req.ctvName}</h4>
                      <span className="font-mono text-[10px] text-blue-700 font-extrabold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {req.ctvCode}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block">Rút tiền:</span>
                      <span className="text-sm font-black font-mono text-emerald-700">
                        {req.amount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>

                  {/* Bank Snippet */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs space-y-1 font-medium">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-[11px]">Ngân hàng:</span>
                      <span className="font-bold text-slate-900">{req.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-[11px]">STK:</span>
                      <span className="font-mono font-black text-blue-800">{req.accountNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action & Detail Popup Trigger Button */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <button
                    onClick={() => setDetailModalRequest(req)}
                    className="w-full bg-[#0B192C] hover:bg-slate-800 text-amber-400 font-black text-xs py-2 rounded-2xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem Chi Tiết & VietQR</span>
                  </button>

                  {/* Quick Action Button for Mobile */}
                  {req.status === "Chờ kế toán kiểm tra" && (
                    <button
                      onClick={() => handleAccountantVerify(req)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-1.5 rounded-2xl text-xs transition flex items-center justify-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Kế Toán Kiểm Tra</span>
                    </button>
                  )}

                  {req.status === "Kế toán đã kiểm tra - Chờ Admin duyệt" && (
                    <button
                      onClick={() => handleAdminApprove(req)}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black py-1.5 rounded-2xl text-xs transition flex items-center justify-center gap-1"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Admin Phê Duyệt</span>
                    </button>
                  )}

                  {req.status === "Admin đã phê duyệt - Chờ kế toán chi tiền" && (
                    <button
                      onClick={() => setTxModalRequest(req)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-1.5 rounded-2xl text-xs transition flex items-center justify-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Nhập Mã GD VietQR</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white p-6 text-center text-slate-500 text-xs font-medium rounded-3xl border border-slate-200">
            Không tìm thấy yêu cầu rút tiền nào phù hợp.
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL WORKFLOW 5 BƯỚC (QUY TRÌNH DUYỆT RÚT TIỀN) */}
      {/* ============================================================ */}
      {showWorkflowModal && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-base text-slate-900 uppercase">
                  QUY TRÌNH DUYỆT RÚT TIỀN 5 BƯỚC CHUẨN KẾ TOÁN & ADMIN
                </h3>
              </div>
              <button
                onClick={() => setShowWorkflowModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between font-black text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">1</span>
                    CTV Gửi Yêu Cầu Rút Tiền
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">Khởi tạo</span>
                </div>
                <p className="text-slate-600">CTV gửi lệnh yêu cầu rút tiền khả dụng trong ví hoa hồng về tài khoản ngân hàng cá nhân.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between font-black text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Kế Toán Kiểm Tra & Đối Soát
                  </span>
                  <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold">Bộ Phận Kế Toán</span>
                </div>
                <p className="text-slate-600">Kế toán viên đối soát thông tin chủ tài khoản, số dư hoa hồng lũy kế và xác nhận tính chính xác.</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between font-black text-purple-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Admin Phê Duyệt Giải Ngân
                  </span>
                  <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded font-bold">Ban Giám Đốc / Admin</span>
                </div>
                <p className="text-slate-600">Admin/Ban Giám Đốc xem xét hạn mức và ký duyệt điện tử cho phép giải ngân ngân sách.</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between font-black text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
                    Kế Toán Chi Tiền & Quét Mã VietQR
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">Bộ Phận Kế Toán</span>
                </div>
                <p className="text-slate-600">Kế toán mở mã VietQR tự động, quét mã chuyển tiền qua App ngân hàng và nhập Mã Giao Dịch + Biên lai.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between font-black text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">5</span>
                    Tự Động Ghi Log Audit 24/7
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">Hệ Thống</span>
                </div>
                <p className="text-slate-600">Tự động ghi nhận mốc thời gian, người thao tác duyệt và gửi thông báo hoàn thành giải ngân cho CTV.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowWorkflowModal(false)}
                className="px-5 py-2.5 bg-[#0B192C] text-amber-400 font-extrabold rounded-2xl text-xs hover:bg-slate-800 transition"
              >
                Đã Hiểu Quy Trình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL CHÍNH CHI TIẾT POPUP CHO MOBILE (FULL POPUP CHO MOBILE) */}
      {/* ============================================================ */}
      {detailModalRequest && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl relative text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono font-black text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  {detailModalRequest.id}
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">Chi Tiết Yêu Cầu Rút Tiền</h3>
              </div>
              <button
                onClick={() => setDetailModalRequest(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* VietQR Quick Scan Box */}
            <div className="bg-gradient-to-b from-blue-900 to-[#0B192C] text-white p-4 rounded-3xl space-y-3 text-center border border-blue-800 shadow-md">
              <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider block">
                Mã VietQR Chuyển Khoản Nhanh 24/7
              </span>
              
              <div className="bg-white p-2.5 rounded-2xl inline-block shadow-lg mx-auto">
                <img
                  src={`https://img.vietqr.io/image/${detailModalRequest.bankName.replace(/\s+/g, "")}-${detailModalRequest.accountNumber}-compact.png?amount=${detailModalRequest.amount}&addInfo=${encodeURIComponent(detailModalRequest.id + " " + detailModalRequest.ctvCode)}&accountName=${encodeURIComponent(detailModalRequest.accountHolder)}`}
                  alt="VietQR Scan Code"
                  className="w-44 h-44 object-contain mx-auto"
                />
              </div>

              <div className="font-mono font-black text-lg text-emerald-400">
                {detailModalRequest.amount.toLocaleString("vi-VN")} VNĐ
              </div>
            </div>

            {/* CTV & Bank Details List */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Cộng tác viên:</span>
                <span className="font-black text-slate-900">{detailModalRequest.ctvName} ({detailModalRequest.ctvCode})</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Ngân hàng thụ hưởng:</span>
                <div className="flex items-center gap-1 font-bold text-slate-900">
                  <img 
                    src={getBankLogo(detailModalRequest.bankName)} 
                    alt={detailModalRequest.bankName} 
                    className="w-4 h-4 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0" 
                  />
                  <span>{detailModalRequest.bankName}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Số tài khoản:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-black text-blue-900 text-sm">{detailModalRequest.accountNumber}</span>
                  <button
                    onClick={() => handleCopyStk(detailModalRequest.accountNumber)}
                    className="p-1 text-slate-500 hover:text-blue-700 bg-white rounded border border-slate-200"
                    title="Sao chép STK"
                  >
                    {copiedStk ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Chủ tài khoản:</span>
                <span className="font-black text-slate-900 uppercase">{detailModalRequest.accountHolder}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold">Thời gian tạo lệnh:</span>
                <span className="font-mono text-slate-600">{detailModalRequest.requestedAt}</span>
              </div>
            </div>

            {/* Audit Logs Summary */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-800 uppercase block">Lịch sử thao tác duyệt:</span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {detailModalRequest.logs && detailModalRequest.logs.length > 0 ? (
                  detailModalRequest.logs.map((log, i) => (
                    <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-0.5">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{log.action}</span>
                        <span className="font-mono text-[10px] text-slate-500">{log.timestamp}</span>
                      </div>
                      <div className="text-slate-600">{log.actorName} ({log.actorRole})</div>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic block">Chưa có lịch sử audit log.</span>
                )}
              </div>
            </div>

            {/* Interactive Action Buttons */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {detailModalRequest.status === "Chờ kế toán kiểm tra" && (
                <button
                  onClick={() => handleAccountantVerify(detailModalRequest)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Xác Nhận Kế Toán Kiểm Tra</span>
                </button>
              )}

              {detailModalRequest.status === "Kế toán đã kiểm tra - Chờ Admin duyệt" && (
                <button
                  onClick={() => handleAdminApprove(detailModalRequest)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black py-2.5 rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-4 h-4" />
                  <span>Ký Duyệt Admin Cấp Phép</span>
                </button>
              )}

              {detailModalRequest.status === "Admin đã phê duyệt - Chờ kế toán chi tiền" && (
                <button
                  onClick={() => {
                    const req = detailModalRequest;
                    setDetailModalRequest(null);
                    setTxModalRequest(req);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Nhập Mã GD VietQR & Hoàn Thành</span>
                </button>
              )}

              {detailModalRequest.status !== "Hoàn thành - Đã chi tiền VietQR" && detailModalRequest.status !== "Từ chối yêu cầu" && (
                <button
                  onClick={() => {
                    const req = detailModalRequest;
                    setDetailModalRequest(null);
                    setRejectModalRequest(req);
                  }}
                  className="w-full bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold py-2 rounded-2xl text-xs transition"
                >
                  Từ Chối Yêu Cầu Này
                </button>
              )}

              <button
                onClick={() => setDetailModalRequest(null)}
                className="w-full bg-slate-100 text-slate-700 font-bold py-2 rounded-2xl text-xs hover:bg-slate-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL COMPLETE TRANSACTION & PROOF IMAGE */}
      {/* ============================================================ */}
      {txModalRequest && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-emerald-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" /> Xác Nhận Giải Ngân Chuyển Tiền VietQR
              </h3>
              <button
                onClick={() => setTxModalRequest(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-emerald-900">Thông tin giải ngân CTV: {txModalRequest.ctvName}</div>
              <div className="font-mono text-emerald-800 font-bold">Số tiền: {txModalRequest.amount.toLocaleString("vi-VN")} VNĐ</div>
              <div className="text-slate-600">{txModalRequest.bankName} - STK: {txModalRequest.accountNumber}</div>
            </div>

            <form onSubmit={handleAccountantCompleteTx} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Mã Giao Dịch Ngân Hàng VietQR (*):</label>
                <input id="vDFt262139044812_886" name="vDFt262139044812_886"
                  type="text"
                  required
                  placeholder="Ví dụ: FT262139044812..."
                  value={txCodeInput}
                  onChange={(e) => setTxCodeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Upload Hình Ảnh Chuyển Khoản / Biên Lai (*):</label>
                <div className="space-y-2">
                  <input id="file_899" name="file_899"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setTxProofImageInput(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-medium text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />

                  {/* Sample Receipt Image Quick Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-bold">Mẫu minh họa:</span>
                    <button
                      type="button"
                      onClick={() => setTxProofImageInput("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80")}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold"
                    >
                      MBBank VietQR
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxProofImageInput("https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80")}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-[10px] font-bold"
                    >
                      Vietcombank
                    </button>
                  </div>

                  {/* Image Preview Box */}
                  {txProofImageInput && (
                    <div className="relative border border-emerald-300 rounded-2xl overflow-hidden bg-slate-900">
                      <img src={txProofImageInput} alt="Biên lai chuyển khoản" className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        onClick={() => setTxProofImageInput("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs shadow-md"
                        title="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-2 left-2 bg-[#0B192C]/90 text-amber-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                        ✓ Đã đính kèm ảnh chuyển khoản
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Ghi Chú Chứng Từ Giao Dịch:</label>
                <textarea id="nhPGhiChGiaoDChGiINgNTNg_956" name="nhPGhiChGiaoDChGiINgNTNg_956"
                  rows={2}
                  placeholder="Nhập ghi chú giao dịch giải ngân tự động..."
                  value={txNotesInput}
                  onChange={(e) => setTxNotesInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTxModalRequest(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Xác Nhận Hoàn Thành VietQR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REJECT REQUEST */}
      {rejectModalRequest && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-rose-700 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Từ Chối Yêu Cầu Rút Tiền
              </h3>
              <button
                onClick={() => setRejectModalRequest(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Lý Do Từ Chối (*):</label>
                <textarea id="textarea_1005" name="textarea_1005"
                  rows={3}
                  required
                  placeholder="Nhập lý do từ chối (ví dụ: Số tài khoản ngân hàng không chính chủ)..."
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalRequest(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <span>Xác Nhận Từ Chối</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AUDIT LOG TIMELINE */}
      {selectedLogRequest && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 text-slate-900 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600" /> Nhật Ký Audit Log Chi Tiết Giao Dịch
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Mã lệnh chi: {selectedLogRequest.id} • CTV {selectedLogRequest.ctvName}
                </p>
              </div>

              <button
                onClick={() => setSelectedLogRequest(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {selectedLogRequest.logs && selectedLogRequest.logs.length > 0 ? (
                selectedLogRequest.logs.map((log, idx) => (
                  <div key={log.id || idx} className="relative pl-9 space-y-1">
                    <div className={`absolute left-0 top-0.5 w-7 h-7 rounded-full border-2 bg-white flex items-center justify-center shrink-0 ${
                      log.actorRole === "admin"
                        ? "border-purple-500 text-purple-600"
                        : log.actorRole === "accountant"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-amber-500 text-amber-600"
                    }`}>
                      {log.actorRole === "admin" ? <Crown className="w-3.5 h-3.5" /> : log.actorRole === "accountant" ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900">{log.action}</span>
                        <span className="font-mono text-[10px] text-slate-500">{log.timestamp}</span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                        <span>Thực hiện bởi:</span>
                        <strong className="text-slate-800">{log.actorName}</strong>
                        <span className="text-[10px] font-bold uppercase bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                          {log.actorRole}
                        </span>
                      </div>

                      {log.newStatus && (
                        <div className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                          Trạng thái: {log.newStatus}
                        </div>
                      )}

                      {log.transactionRef && (
                        <div className="text-[11px] font-mono font-black text-blue-800 bg-blue-50 p-1.5 rounded border border-blue-200 mt-1">
                          Mã giao dịch chi tiết: {log.transactionRef}
                        </div>
                      )}

                      {log.proofImage && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 block">Biên lai chuyển khoản đã đính kèm:</span>
                          <div 
                            onClick={() => setViewingProofImage(log.proofImage!)}
                            className="relative group rounded-xl overflow-hidden border border-emerald-300 max-w-xs cursor-pointer shadow-2xs"
                          >
                            <img src={log.proofImage} alt="Ảnh chuyển khoản" className="w-full h-24 object-cover group-hover:scale-105 transition" />
                            <div className="absolute inset-0 bg-[#0B192C]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                              Click để xem ảnh phóng to
                            </div>
                          </div>
                        </div>
                      )}

                      {log.notes && (
                        <div className="text-[11px] text-slate-600 italic mt-1">
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs font-medium">
                  Chưa có nhật ký audit log ghi nhận cho lệnh này.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLogRequest(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROOF IMAGE LIGHTBOX */}
      {viewingProofImage && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-4 space-y-3 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Chứng Từ / Biên Lai Chuyển Khoản Ngân Hàng
              </h4>
              <button
                onClick={() => setViewingProofImage(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
              <img src={viewingProofImage} alt="Biên lai chuyển khoản thực tế" className="max-h-[70vh] w-auto object-contain" />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewingProofImage(null)}
                className="px-4 py-2 bg-slate-800 text-white font-extrabold rounded-xl text-xs hover:bg-slate-700 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
