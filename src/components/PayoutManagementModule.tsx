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
  DollarSign
} from "lucide-react";
import { formatDateVN, formatDateTimeVN } from "../utils/formatters";
import { getBankLogo } from "../lib/banks";

interface PayoutManagementModuleProps {
  payoutRequests: PayoutRequest[];
  onUpdatePayoutRequest: (updatedReq: PayoutRequest) => void;
  currentRole: "admin" | "accountant" | "ctv" | "editor" | "customer";
  currentUserFullName?: string;
}

export const PayoutManagementModule: React.FC<PayoutManagementModuleProps> = ({
  payoutRequests,
  onUpdatePayoutRequest,
  currentRole,
  currentUserFullName = "Nguyễn Thị B"
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedLogRequest, setSelectedLogRequest] = useState<PayoutRequest | null>(null);

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

  return (
    <div className="space-y-6">
      
      {/* Visual Workflow Header Banner - 5 Steps Flow */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-amber-600" /> QUY TRÌNH DUYỆT RÚT TIỀN 5 BƯỚC CHUẨN KẾ TOÁN & ADMIN:
          </span>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
            Hệ Thống Ghi Log Audit 24/7
          </span>
        </div>

        {/* 5 Steps Timeline Diagram */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
          <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 font-black text-amber-900 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">1</span>
              <span>CTV Gửi Yêu Cầu</span>
            </div>
            <p className="text-[10px] text-amber-800 leading-tight">Yêu cầu rút hoa hồng khả dụng về tài khoản</p>
          </div>

          <div className="bg-blue-50/90 border border-blue-200 p-3 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 font-black text-blue-900 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
              <span>Kế Toán Kiểm Tra</span>
            </div>
            <p className="text-[10px] text-blue-800 leading-tight">Đối soát ngân hàng VietQR & số dư hoa hồng</p>
          </div>

          <div className="bg-purple-50/90 border border-purple-200 p-3 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 font-black text-purple-900 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
              <span>Admin Phê Duyệt</span>
            </div>
            <p className="text-[10px] text-purple-800 leading-tight">Ban Giám Đốc ký duyệt cấp phép giải ngân</p>
          </div>

          <div className="bg-emerald-50/90 border border-emerald-200 p-3 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 font-black text-emerald-900 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
              <span>Kế Toán Chi Tiền</span>
            </div>
            <p className="text-[10px] text-emerald-800 leading-tight">Chuyển VietQR & nhập mã giao dịch chi tiết</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 font-black text-slate-900 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">5</span>
              <span>Ghi Log Chi Tiết</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">Tự động lưu lịch sử người duyệt & mốc thời gian</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-amber-600" /> Tìm Kiếm & Lọc Yêu Cầu Rút Tiền:
          </span>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
            {filteredRequests.length} Yêu Cầu Trong Danh Sách
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Tìm theo Tên CTV, Mã CTV, Ngân hàng, Số tài khoản hoặc Mã giao dịch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs transition"
            />
          </div>

          <div className="md:col-span-4">
            <select
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

      {/* Payout Cards Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const statusBadgeConfig = {
              "Chờ kế toán kiểm tra": { bg: "bg-amber-100 text-amber-900 border-amber-300", step: "Bước 1/4", icon: Clock },
              "Kế toán đã kiểm tra - Chờ Admin duyệt": { bg: "bg-blue-100 text-blue-900 border-blue-300", step: "Bước 2/4", icon: UserCheck },
              "Admin đã phê duyệt - Chờ kế toán chi tiền": { bg: "bg-purple-100 text-purple-900 border-purple-300", step: "Bước 3/4", icon: Crown },
              "Hoàn thành - Đã chi tiền VietQR": { bg: "bg-emerald-100 text-emerald-900 border-emerald-300", step: "Hoàn thành", icon: CheckCircle2 },
              "Từ chối yêu cầu": { bg: "bg-rose-100 text-rose-900 border-rose-300", step: "Đã hủy", icon: XCircle }
            }[req.status] || { bg: "bg-slate-100 text-slate-700 border-slate-300", step: "CRM", icon: Clock };

            const StatusIcon = statusBadgeConfig.icon;

            return (
              <div
                key={req.id}
                className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl p-5 text-slate-900 space-y-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  
                  {/* Top Bar: ID & Status Badge */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-amber-800 font-mono font-black text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      {req.id}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 ${statusBadgeConfig.bg}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{req.status}</span>
                    </span>
                  </div>

                  {/* CTV Info & Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-base text-slate-900">{req.ctvName}</h4>
                      <span className="font-mono text-xs text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {req.ctvCode}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Số tiền rút:</span>
                      <span className="text-base font-black font-mono text-emerald-700">
                        {req.amount.toLocaleString("vi-VN")} <span className="text-xs">đ</span>
                      </span>
                    </div>
                  </div>

                  {/* Bank Account Box */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-medium">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-bold">Ngân hàng thụ hưởng:</span>
                        <div className="flex items-center gap-1.5">
                          <img 
                            src={getBankLogo(req.bankName)} 
                            alt={req.bankName} 
                            className="w-5 h-5 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0" 
                          />
                          <span className="font-bold text-slate-900">{req.bankName}</span>
                        </div>
                      </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Số tài khoản:</span>
                      <span className="font-mono font-black text-blue-800">{req.accountNumber}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Chủ tài khoản:</span>
                      <span className="font-black text-slate-900 uppercase">{req.accountHolder}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60">
                      <span className="text-slate-500 font-bold">Thời gian yêu cầu:</span>
                      <span className="font-mono text-[11px] text-slate-600">{req.requestedAt}</span>
                    </div>
                  </div>

                  {/* Transaction Ref & Proof Image Badge */}
                  {req.transactionRef && (
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-bold">Mã Giao Dịch Chi Tiết:</span>
                        <span className="font-mono font-black text-emerald-800">{req.transactionRef}</span>
                      </div>

                      {req.proofImage && (
                        <div 
                          onClick={() => setViewingProofImage(req.proofImage!)}
                          className="flex items-center justify-between pt-1 border-t border-emerald-200/80 cursor-pointer hover:underline text-[11px] font-bold text-emerald-900"
                        >
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Biên lai chuyển khoản:</span>
                          </span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-extrabold">Xem ảnh</span>
                        </div>
                      )}
                    </div>
                  )}

                  {req.rejectedReason && (
                    <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-xs text-rose-800 italic">
                      Lý do từ chối: "{req.rejectedReason}"
                    </div>
                  )}
                </div>

                {/* Bottom Step Actions & Audit Log Button */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  
                  {/* Step Action Buttons depending on role & status */}
                  {req.status === "Chờ kế toán kiểm tra" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccountantVerify(req)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Kế Toán Kiểm Tra</span>
                      </button>

                      <button
                        onClick={() => setRejectModalRequest(req)}
                        className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs transition"
                        title="Từ chối"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {req.status === "Kế toán đã kiểm tra - Chờ Admin duyệt" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdminApprove(req)}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-[#0B192C] font-black py-2 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Crown className="w-4 h-4" />
                        <span>Admin Duyệt Giải Ngân</span>
                      </button>

                      <button
                        onClick={() => setRejectModalRequest(req)}
                        className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs transition"
                        title="Từ chối"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {req.status === "Admin đã phê duyệt - Chờ kế toán chi tiền" && (
                    <button
                      onClick={() => {
                        setTxModalRequest(req);
                        setTxCodeInput(`FT${Date.now().toString().slice(-10)}`);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Kế Toán Cập Nhật Mã VietQR</span>
                    </button>
                  )}

                  {/* Audit Log Timeline Drawer Button */}
                  <button
                    onClick={() => setSelectedLogRequest(req)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-xl text-[11px] transition flex items-center justify-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5 text-slate-600" />
                    <span>Xem Audit Log Chi Tiết ({req.logs?.length || 0} bước)</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs font-medium space-y-2">
            <p>Không có yêu cầu rút tiền nào phù hợp với bộ lọc.</p>
          </div>
        )}
      </div>

      {/* MODAL 1: STEP 4 - ACCOUNTANT SUBMIT TRANSACTION CODE (FT...) */}
      {txModalRequest && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" /> Kế Toán Cập Nhật Giao Dịch Chi Tiết
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
                <input
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
                  <input
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
                <textarea
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

      {/* MODAL 2: REJECT REQUEST */}
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
                <textarea
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

      {/* MODAL 3: AUDIT LOG TIMELINE DRAWER */}
      {selectedLogRequest && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 text-slate-900 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600" /> Nật Ký Audit Log Chi Tiết Giao Dịch
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

            {/* Audit Log Timeline */}
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

      {/* MODAL 4: PROOF IMAGE LIGHTBOX */}
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
