import React, { useState } from "react";
import { CTVUser, ReferralLead, PayoutRequest, Appointment, AppointmentInvoice } from "../types";
import { PayoutManagementModule } from "./PayoutManagementModule";
import { RevenueInvoiceModule } from "./RevenueInvoiceModule";
import { 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Building2, 
  FileCheck, 
  ArrowUpRight, 
  DollarSign, 
  ShieldCheck,
  QrCode,
  CreditCard,
  History,
  AlertCircle,
  Receipt
} from "lucide-react";

interface AccountantDashboardProps {
  ctvUser: CTVUser;
  leads: ReferralLead[];
  appointments?: Appointment[];
  invoices?: AppointmentInvoice[];
  payoutRequests: PayoutRequest[];
  onApprovePayoutRequest: (requestId: string) => void;
  onRejectPayoutRequest: (requestId: string) => void;
  onUpdatePayoutRequest?: (updatedReq: PayoutRequest) => void;
  onUpdateInvoice?: (updatedInvoice: AppointmentInvoice) => void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment["status"]) => void;
  onCreditCTVCommission?: (ctvCode: string, commissionAmount: number, serviceName: string) => void;
}

export const AccountantDashboard: React.FC<AccountantDashboardProps> = ({
  ctvUser,
  leads,
  appointments = [],
  invoices = [],
  payoutRequests,
  onApprovePayoutRequest,
  onRejectPayoutRequest,
  onUpdatePayoutRequest,
  onUpdateInvoice = () => {},
  onUpdateAppointmentStatus,
  onCreditCTVCommission
}) => {
  const [activeTab, setActiveTab] = useState<"invoices" | "requests" | "history" | "audit">("invoices");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const totalSystemRevenue = leads.reduce((acc, l) => acc + (l.status === "Đã hoàn thành" ? l.estimatedValue : 0), 0);
  const totalCommissionPaid = leads.reduce((acc, l) => acc + (l.status === "Đã hoàn thành" ? l.commission : 0), 0);
  const pendingPayoutCount = payoutRequests.filter((r) => 
    r.status === "Chờ kế toán kiểm tra" || 
    r.status === "Admin đã phê duyệt - Chờ kế toán chi tiền" || 
    r.status === "Chờ kế toán duyệt" || 
    r.status === "Chờ duyệt"
  ).length;

  const filteredRequests = payoutRequests.filter((req) => {
    const matchesSearch =
      req.ctvName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.ctvCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.accountNumber.includes(searchTerm);
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner - Accountant Financial Control Center */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] border border-blue-900/60 rounded-3xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
            <Wallet className="w-4 h-4 text-emerald-400" /> BẢNG QUẢN TRỊ KẾ TOÁN & TÀI CHÍNH BỆNH VIỆN
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-white">
            Trung Tâm Kiểm Toán Giao Dịch & Giải Ngân Hoa Hồng CTV
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Duyệt yêu cầu rút tiền tự động qua VietQR 24/7 • Kiểm toán hợp đồng & Quản lý sổ nhật ký giao dịch.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Quỹ Giải Ngân VietQR Tự Động
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white border border-emerald-300/80 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-1 shadow-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[11px] sm:text-xs font-extrabold uppercase truncate">Yêu Cầu Rút Tiền Chờ Duyệt</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base sm:text-2xl font-black font-mono text-amber-600">
            {pendingPayoutCount} Yêu Cầu
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Cần kế toán xác nhận VietQR</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-1 shadow-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[11px] sm:text-xs font-extrabold uppercase truncate">Tổng Hoa Hồng Đã Giải Ngân</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-2xl font-black font-mono text-emerald-700 truncate">
            {totalCommissionPaid.toLocaleString("vi-VN")} <span className="text-xs">VNĐ</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold">Giải ngân 100% thành công</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-1 shadow-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[11px] sm:text-xs font-extrabold uppercase truncate">Doanh Thu Hệ Thống Thực Nhận</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base sm:text-2xl font-black font-mono text-slate-900 truncate">
            {totalSystemRevenue.toLocaleString("vi-VN")} <span className="text-xs">VNĐ</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Từ các ca dịch vụ thẩm mỹ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-1 shadow-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[11px] sm:text-xs font-extrabold uppercase truncate">Hạn Mức Quỹ VietQR Tự Động</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-base sm:text-2xl font-black font-mono text-purple-700">
            500,000,000 <span className="text-xs">VNĐ</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Sẵn sàng chi trả 24/7</div>
        </div>

      </div>

      {/* Main Accountant Control Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 text-slate-900 space-y-5 shadow-sm">
        
        {/* Navigation sub-tabs */}
        <div className="flex border-b border-slate-100 gap-3 sm:gap-6 text-xs font-extrabold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`pb-3 border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "invoices" ? "border-emerald-600 text-emerald-800 font-black" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>1. Quản Lý Doanh Thu & Hóa Đơn (Cọc ➔ Thu Đủ ➔ CTV)</span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "requests" ? "border-emerald-600 text-emerald-800 font-black" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>2. Duyệt Rút Tiền VietQR ({pendingPayoutCount} Chờ)</span>
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "history" ? "border-emerald-600 text-emerald-800 font-black" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>3. Sổ Nhật Ký Giao Dịch & Giải Ngân</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "audit" ? "border-emerald-600 text-emerald-800 font-black" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>4. Đối Kháng & Kiểm Toán Hợp Đồng</span>
          </button>
        </div>

        {/* TAB 0: QUẢN LÝ DOANH THU & HÓA ĐƠN THU TIỀN */}
        {activeTab === "invoices" && (
          <RevenueInvoiceModule
            appointments={appointments}
            ctvUser={ctvUser}
            invoices={invoices}
            onUpdateInvoice={onUpdateInvoice}
            onUpdateAppointmentStatus={onUpdateAppointmentStatus}
            onCreditCTVCommission={onCreditCTVCommission}
            isAdmin={true}
          />
        )}

        {/* TAB 1: DUYỆT YÊU CẦU RÚT TIỀN HOA HỒNG VIETQR (5 BƯỚC FLOW & AUDIT LOG) */}
        {activeTab === "requests" && (
          <PayoutManagementModule
            payoutRequests={payoutRequests}
            onUpdatePayoutRequest={onUpdatePayoutRequest || (() => {})}
            currentRole="accountant"
            currentUserFullName="Kế Toán Trưởng VietQR"
          />
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-700" /> Sổ Nhật Ký Kiểm Toán & Biến Động Số Dư
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Theo dõi lịch sử giải ngân hoa hồng và chuyển khoản thực tế</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {payoutRequests.filter(r => 
                r.status === "Giải ngân thành công" || 
                r.status === "Đã chuyển tiền" || 
                r.status === "Đã duyệt" || 
                r.status === "Đã giải ngân VietQR" ||
                r.status === "Hoàn thành - Đã chi tiền VietQR"
              ).map((r) => (
                <div key={r.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Giải ngân hoa hồng cho CTV {r.ctvName} ({r.ctvCode})</div>
                      <div className="text-[10px] text-slate-500 font-mono">Chuyển tới {r.bankName} - {r.accountNumber} ({r.requestedAt})</div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-emerald-700 text-sm">
                    -{r.amount.toLocaleString("vi-VN")} VNĐ
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-purple-700" /> Đối Kháng & Kiểm Toán Hợp Đồng Thẩm Mỹ
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Kiểm soát khớp nối giữa doanh thu phẫu thuật và % hoa hồng thực chi</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-2 font-medium text-slate-700">
              <div className="flex justify-between">
                <span>Tỷ lệ trích quỹ hoa hồng trung bình:</span>
                <strong className="text-amber-700 font-mono font-bold">15.0% - 17.5%</strong>
              </div>
              <div className="flex justify-between">
                <span>Tổng giá trị hợp đồng dịch vụ đã chốt:</span>
                <strong className="text-slate-900 font-mono font-bold">{totalSystemRevenue.toLocaleString("vi-VN")} VNĐ</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Chênh lệch đối soát kế toán:</span>
                <strong className="text-emerald-700 font-mono font-black">0 VNĐ (Hoàn toàn khớp lệnh)</strong>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
