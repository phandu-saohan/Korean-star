import React, { useState, useMemo } from "react";
import { 
  Appointment, 
  AppointmentInvoice, 
  CTVUser 
} from "../types";
import { generateVietQRUrl } from "../lib/banks";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/formatters";
import { 
  DollarSign, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Printer, 
  CreditCard, 
  QrCode, 
  UserCheck, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  X, 
  FileText, 
  ShieldCheck, 
  Wallet,
  AlertCircle,
  Stethoscope,
  Copy,
  Check,
  Banknote
} from "lucide-react";

interface RevenueInvoiceModuleProps {
  appointments: Appointment[];
  ctvUser: CTVUser;
  invoices: AppointmentInvoice[];
  onUpdateInvoice: (updatedInvoice: AppointmentInvoice) => void;
  onAddInvoice?: (newInvoice: AppointmentInvoice) => void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment["status"]) => void;
  onCreditCTVCommission?: (ctvCode: string, commissionAmount: number, serviceName: string) => void;
  isAdmin?: boolean;
}

export const RevenueInvoiceModule: React.FC<RevenueInvoiceModuleProps> = ({
  appointments = [],
  ctvUser,
  invoices = [],
  onUpdateInvoice,
  onAddInvoice,
  onUpdateAppointmentStatus,
  onCreditCTVCommission,
  isAdmin = true
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [selectedInvoiceForDeposit, setSelectedInvoiceForDeposit] = useState<AppointmentInvoice | null>(null);
  const [depositInputValue, setDepositInputValue] = useState<string>("");
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<AppointmentInvoice["paymentMethod"]>("VietQR / Chuyển khoản");

  const [selectedInvoiceForFinal, setSelectedInvoiceForFinal] = useState<AppointmentInvoice | null>(null);
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<AppointmentInvoice["paymentMethod"]>("VietQR / Chuyển khoản");

  const [printInvoiceModal, setPrintInvoiceModal] = useState<AppointmentInvoice | null>(null);

  // Create New Invoice Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [customCustomerPhone, setCustomCustomerPhone] = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
  const [customTotalAmount, setCustomTotalAmount] = useState("");
  const [customDepositAmount, setCustomDepositAmount] = useState("0");
  const [customCommissionRate, setCustomCommissionRate] = useState("15");
  const [customPaymentMethod, setCustomPaymentMethod] = useState<AppointmentInvoice["paymentMethod"]>("VietQR / Chuyển khoản");
  const [customCtvCode, setCustomCtvCode] = useState("");
  const [customCtvName, setCustomCtvName] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const handleSelectAppointmentForCreate = (aptId: string) => {
    setSelectedAppointmentId(aptId);
    if (!aptId) return;
    const apt = appointments.find((a) => a.id === aptId);
    if (apt) {
      setCustomCustomerName(apt.customerName || "");
      setCustomCustomerPhone(apt.customerPhone || "");
      setCustomServiceName(apt.serviceName || "");
      setCustomCtvCode(apt.ctvCode || ctvUser?.code || "CTV-SYSTEM");
      setCustomCtvName(apt.ctvName || ctvUser?.name || "Bệnh Viện Korean Star");
      if (!customTotalAmount) {
        setCustomTotalAmount("15000000");
      }
    }
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(customTotalAmount.replace(/\D/g, "")) || 0;
    const deposit = parseInt(customDepositAmount.replace(/\D/g, "")) || 0;
    if (total <= 0) {
      alert("Vui lòng nhập Tổng chi phí dịch vụ phẫu thuật hợp lệ!");
      return;
    }

    const remaining = Math.max(0, total - deposit);
    const commRate = parseInt(customCommissionRate) || 15;
    const commAmount = Math.round(total * (commRate / 100));
    
    let paymentStatus: AppointmentInvoice["paymentStatus"] = "Chờ cọc";
    if (deposit >= total) {
      paymentStatus = "Đã thu đủ (Hoàn thành)";
    } else if (deposit > 0) {
      paymentStatus = "Đã cọc";
    }

    const newInvId = `INV-2026-${String(Math.floor(100 + Math.random() * 900))}`;

    const newInvoice: AppointmentInvoice = {
      id: newInvId,
      appointmentId: selectedAppointmentId || `apt-${Date.now()}`,
      customerName: customCustomerName || "Khách Hàng Thẩm Mỹ",
      customerPhone: customCustomerPhone || "0988888888",
      serviceName: customServiceName || "Dịch Vụ Phẫu Thuật",
      totalAmount: total,
      depositAmount: deposit,
      remainingAmount: remaining,
      commissionRate: commRate,
      commissionAmount: commAmount,
      paymentStatus: paymentStatus,
      ctvCode: customCtvCode || ctvUser?.code || "CTV-ADMIN",
      ctvName: customCtvName || ctvUser?.name || "Kế Toán / Admin",
      createdAt: new Date().toLocaleString("vi-VN"),
      paymentMethod: customPaymentMethod,
      notes: customNotes
    };

    if (onAddInvoice) {
      onAddInvoice(newInvoice);
    } else {
      onUpdateInvoice(newInvoice);
    }

    // Automatically credit CTV commission if fully paid on creation
    if (paymentStatus === "Đã thu đủ (Hoàn thành)" && onCreditCTVCommission && newInvoice.ctvCode) {
      onCreditCTVCommission(newInvoice.ctvCode, commAmount, newInvoice.serviceName);
    }

    // Update appointment status if linked
    if (selectedAppointmentId && onUpdateAppointmentStatus) {
      const targetStatus = deposit >= total ? "Hoàn thành" : (deposit > 0 ? "Đã xác nhận" : "Chờ xác nhận");
      onUpdateAppointmentStatus(selectedAppointmentId, targetStatus);
    }

    setIsCreateModalOpen(false);
  };

  // Sync / Auto-generate invoices for appointments that don't have invoices yet
  const effectiveInvoices = useMemo(() => {
    const invoiceMap = new Map<string, AppointmentInvoice>();
    invoices.forEach((inv) => invoiceMap.set(inv.appointmentId, inv));

    // Generate fallback invoice records for appointments without invoice records
    const generated: AppointmentInvoice[] = appointments.map((apt, idx) => {
      if (invoiceMap.has(apt.id)) {
        return invoiceMap.get(apt.id)!;
      }

      // Estimate prices based on service names or default fallback
      let totalAmount = 25000000;
      let commissionRate = 15;

      const lowerSrv = apt.serviceName.toLowerCase();
      if (lowerSrv.includes("ngực")) {
        totalAmount = 65000000;
        commissionRate = 15;
      } else if (lowerSrv.includes("mũi")) {
        totalAmount = 32000000;
        commissionRate = 18;
      } else if (lowerSrv.includes("mí") || lowerSrv.includes("mắt")) {
        totalAmount = 15000000;
        commissionRate = 20;
      } else if (lowerSrv.includes("hút mỡ") || lowerSrv.includes("bụng")) {
        totalAmount = 55000000;
        commissionRate = 15;
      }

      let paymentStatus: AppointmentInvoice["paymentStatus"] = "Chờ cọc";
      let depositAmount = 0;
      let remainingAmount = totalAmount;

      if (apt.status === "Hoàn thành") {
        paymentStatus = "Đã thu đủ (Hoàn thành)";
        depositAmount = Math.round(totalAmount * 0.2);
        remainingAmount = 0;
      } else if (apt.status === "Đang điều trị" || apt.status === "Đã xác nhận") {
        paymentStatus = "Đã cọc";
        depositAmount = Math.round(totalAmount * 0.2);
        remainingAmount = totalAmount - depositAmount;
      } else if (apt.status === "Đã hủy") {
        paymentStatus = "Đã hủy";
      }

      const commAmt = Math.round((totalAmount * commissionRate) / 100);

      return {
        id: `INV-2026-${(idx + 101).toString().padStart(3, "0")}`,
        appointmentId: apt.id,
        customerName: apt.customerName,
        customerPhone: apt.customerPhone,
        serviceName: apt.serviceName,
        ctvCode: apt.ctvCode || ctvUser.code,
        ctvName: apt.ctvName || ctvUser.name,
        doctorName: apt.doctorName || "BS. CKII Hàn Quốc",
        totalAmount,
        depositAmount,
        depositPaidAt: depositAmount > 0 ? "07/08/2026 09:00" : undefined,
        remainingAmount,
        remainingPaidAt: paymentStatus === "Đã thu đủ (Hoàn thành)" ? "07/08/2026 11:30" : undefined,
        paymentStatus,
        paymentMethod: "VietQR / Chuyển khoản",
        commissionRate,
        commissionAmount: commAmt,
        createdAt: apt.date ? `${apt.date} ${apt.time}` : "07/08/2026"
      };
    });

    return generated;
  }, [invoices, appointments, ctvUser]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return effectiveInvoices.filter((inv) => {
      const matchSearch =
        inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerPhone.includes(searchTerm) ||
        inv.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.ctvCode && inv.ctvCode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && inv.paymentStatus === "Chờ cọc") ||
        (statusFilter === "deposited" && inv.paymentStatus === "Đã cọc") ||
        (statusFilter === "completed" && inv.paymentStatus === "Đã thu đủ (Hoàn thành)") ||
        (statusFilter === "cancelled" && inv.paymentStatus === "Đã hủy");

      return matchSearch && matchStatus;
    });
  }, [effectiveInvoices, searchTerm, statusFilter]);

  // Financial Stats Metrics
  const stats = useMemo(() => {
    let totalRev = 0;
    let totalDep = 0;
    let totalRem = 0;
    let totalComm = 0;

    effectiveInvoices.forEach((inv) => {
      if (inv.paymentStatus !== "Đã hủy") {
        totalRev += inv.totalAmount;
        totalDep += inv.depositAmount;
        totalRem += inv.remainingAmount;
        totalComm += inv.commissionAmount;
      }
    });

    return { totalRev, totalDep, totalRem, totalComm };
  }, [effectiveInvoices]);

  const [copiedAcc, setCopiedAcc] = useState(false);

  // Handle Deposit Submission
  const handleConfirmDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForDeposit) return;

    const depVal = parseInt(depositInputValue.replace(/\D/g, "")) || 0;
    if (depVal <= 0) {
      alert("Vui lòng nhập số tiền đặt cọc hợp lệ (lớn hơn 0 VNĐ)!");
      return;
    }

    const updated: AppointmentInvoice = {
      ...selectedInvoiceForDeposit,
      depositAmount: depVal,
      remainingAmount: Math.max(0, selectedInvoiceForDeposit.totalAmount - depVal),
      paymentStatus: "Đã cọc",
      depositPaidAt: new Date().toLocaleString("vi-VN"),
      paymentMethod: depositPaymentMethod
    };

    onUpdateInvoice(updated);

    // Also update appointment status to "Đã xác nhận"
    if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(selectedInvoiceForDeposit.appointmentId, "Đã xác nhận");
    }

    setSelectedInvoiceForDeposit(null);
    setDepositInputValue("");
  };

  // Handle Final Payment Settlement Submission
  const handleConfirmFinalPayment = () => {
    if (!selectedInvoiceForFinal) return;

    const updated: AppointmentInvoice = {
      ...selectedInvoiceForFinal,
      depositAmount: selectedInvoiceForFinal.depositAmount > 0 ? selectedInvoiceForFinal.depositAmount : Math.round(selectedInvoiceForFinal.totalAmount * 0.2),
      remainingAmount: 0,
      paymentStatus: "Đã thu đủ (Hoàn thành)",
      remainingPaidAt: new Date().toLocaleString("vi-VN"),
      paymentMethod: finalPaymentMethod
    };

    onUpdateInvoice(updated);

    // 1. Update appointment status to "Hoàn thành"
    if (onUpdateAppointmentStatus) {
      onUpdateAppointmentStatus(selectedInvoiceForFinal.appointmentId, "Hoàn thành");
    }

    // 2. Automatically Credit CTV Sales Volume & Commission!
    if (onCreditCTVCommission && selectedInvoiceForFinal.ctvCode) {
      onCreditCTVCommission(
        selectedInvoiceForFinal.ctvCode,
        selectedInvoiceForFinal.commissionAmount,
        selectedInvoiceForFinal.serviceName
      );
    }

    setSelectedInvoiceForFinal(null);
  };

  return (
    <div className="space-y-6">
      
      {/* 2. FINANCIAL KPIS SUMMARY ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng Doanh Thu */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase">1. Doanh Thu Liệu Trình</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-2">
            {stats.totalRev.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
          </div>
          <span className="text-[10px] text-blue-600 font-bold mt-1 block">Tất cả ca phẫu thuật đã đăng ký</span>
        </div>

        {/* KPI 2: Đã Thu Đặt Cọc */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase">2. Tiền Đã Đặt Cọc</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 font-mono mt-2">
            {stats.totalDep.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
          </div>
          <span className="text-[10px] text-amber-600 font-bold mt-1 block">Khách đã cọc giữ lịch phẫu thuật</span>
        </div>

        {/* KPI 3: Còn Phải Thu */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase">3. Tiền Phải Thu Nốt</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-700 font-mono mt-2">
            {stats.totalRem.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
          </div>
          <span className="text-[10px] text-purple-600 font-bold mt-1 block">Thu trước khi xuất viện / phẫu thuật</span>
        </div>

        {/* KPI 4: Trích Hoa Hồng CTV */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase">4. Hoa Hồng CTV Trích</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 font-mono mt-2">
            {stats.totalComm.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Cộng tự động vào ví khi thu đủ</span>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo Mã hóa đơn, Tên/SĐT khách hàng, Mã CTV, Dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nút Tạo Hóa Đơn Mới */}
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setSelectedAppointmentId("");
              setCustomCustomerName("");
              setCustomCustomerPhone("");
              setCustomServiceName("");
              setCustomTotalAmount("");
              setCustomDepositAmount("0");
              setCustomCommissionRate("15");
              setCustomCtvCode(ctvUser?.code || "CTV-ADMIN");
              setCustomCtvName(ctvUser?.name || "Bệnh Viện Korean Star");
              setCustomNotes("");
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-2xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            title="Tạo hóa đơn thu tiền theo dịch vụ đã xác nhận trong CRM"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Hóa Đơn Mới</span>
          </button>

          {/* Status Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: "Tất cả hóa đơn", count: effectiveInvoices.length },
              { id: "pending", label: "Chờ cọc", count: effectiveInvoices.filter((i) => i.paymentStatus === "Chờ cọc").length },
              { id: "deposited", label: "Đã cọc", count: effectiveInvoices.filter((i) => i.paymentStatus === "Đã cọc").length },
              { id: "completed", label: "Đã thu đủ 100%", count: effectiveInvoices.filter((i) => i.paymentStatus === "Đã thu đủ (Hoàn thành)").length }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === btn.id
                    ? "bg-[#0B192C] text-amber-400 shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{btn.label}</span>
                <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                  {btn.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. INVOICES TABLE & CARDS */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4">Mã Hóa Đơn</th>
                <th className="py-3.5 px-4">Khách Hàng & SĐT</th>
                <th className="py-3.5 px-4">CTV Giới Thiệu</th>
                <th className="py-3.5 px-4">Dịch Vụ Phẫu Thuật</th>
                <th className="py-3.5 px-4 text-right">Tổng Chi Phí</th>
                <th className="py-3.5 px-4 text-right">Đã Đặt Cọc</th>
                <th className="py-3.5 px-4 text-right">Còn Phải Thu</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái Thu</th>
                <th className="py-3.5 px-4 text-center">Thao Tác Kế Toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy hóa đơn thu tiền nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isCompleted = inv.paymentStatus === "Đã thu đủ (Hoàn thành)";
                  const isDeposited = inv.paymentStatus === "Đã cọc";
                  const isPending = inv.paymentStatus === "Chờ cọc";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Mã Hóa Đơn */}
                      <td className="py-4 px-4 font-mono font-black text-blue-900">
                        <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded-lg border border-blue-200">
                          {inv.id}
                        </span>
                      </td>

                      {/* Khách Hàng */}
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900">{inv.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{inv.customerPhone}</div>
                      </td>

                      {/* CTV Giới Thiệu */}
                      <td className="py-4 px-4">
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-full font-black text-[11px] border border-amber-200 block w-max">
                          🤝 {inv.ctvCode || "N/A"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{inv.ctvName}</span>
                      </td>

                      {/* Dịch Vụ */}
                      <td className="py-4 px-4 max-w-[200px]">
                        <div className="font-bold text-slate-800 truncate" title={inv.serviceName}>
                          {inv.serviceName}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                          Hoa hồng: {inv.commissionRate}% ({inv.commissionAmount.toLocaleString("vi-VN")}đ)
                        </div>
                      </td>

                      {/* Tổng Tiền */}
                      <td className="py-4 px-4 text-right font-mono font-extrabold text-slate-900">
                        {inv.totalAmount.toLocaleString("vi-VN")} <span className="text-[10px]">đ</span>
                      </td>

                      {/* Đã Đặt Cọc */}
                      <td className="py-4 px-4 text-right font-mono font-extrabold text-amber-600">
                        {inv.depositAmount > 0 ? `${inv.depositAmount.toLocaleString("vi-VN")} đ` : "Chưa cọc"}
                      </td>

                      {/* Còn Phải Thu */}
                      <td className="py-4 px-4 text-right font-mono font-black text-purple-700">
                        {inv.remainingAmount > 0 ? (
                          <span className="text-purple-700 font-bold">{inv.remainingAmount.toLocaleString("vi-VN")} đ</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0 đ (Đã đủ)</span>
                        )}
                      </td>

                      {/* Trạng Thái Thu */}
                      <td className="py-4 px-4 text-center">
                        {isCompleted && (
                          <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[11px] px-2.5 py-1 rounded-full border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đã thu đủ 100%</span>
                          </span>
                        )}
                        {isDeposited && (
                          <span className="bg-blue-100 text-blue-800 font-extrabold text-[11px] px-2.5 py-1 rounded-full border border-blue-300 inline-flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            <span>Đã đặt cọc</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="bg-amber-100 text-amber-800 font-extrabold text-[11px] px-2.5 py-1 rounded-full border border-amber-300 inline-flex items-center gap-1 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Chờ đặt cọc</span>
                          </span>
                        )}
                      </td>

                      {/* Thao Tác Kế Toán */}
                      <td className="py-4 px-4 text-center space-x-1.5">
                        {/* 1. Nút Nhập Đặt Cọc */}
                        {!isCompleted && (
                          <button
                            onClick={() => {
                              setSelectedInvoiceForDeposit(inv);
                              setDepositInputValue(inv.depositAmount > 0 ? inv.depositAmount.toString() : Math.round(inv.totalAmount * 0.2).toString());
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-[#0B192C] font-black text-[11px] px-2.5 py-1.5 rounded-xl transition shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                            title="Cập nhật số tiền cọc"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>{inv.depositAmount > 0 ? "Sửa Cọc" : "Thu Cọc"}</span>
                          </button>
                        )}

                        {/* 2. Nút Thu Đủ Tiền Còn Lại */}
                        {!isCompleted && (
                          <button
                            onClick={() => setSelectedInvoiceForFinal(inv)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] px-2.5 py-1.5 rounded-xl transition shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                            title="Xác nhận thu đủ số tiền còn lại và tự động cộng hoa hồng CTV"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Thu Đủ & Trích CTV</span>
                          </button>
                        )}

                        {/* 3. In Hóa Đơn */}
                        <button
                          onClick={() => setPrintInvoiceModal(inv)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] px-2 py-1.5 rounded-xl transition inline-flex items-center gap-1 border border-slate-300 cursor-pointer"
                          title="In phiếu thu / Hóa đơn tài chính"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>In Phiếu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden divide-y divide-slate-200">
          {filteredInvoices.map((inv) => (
            <div key={inv.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-blue-100 text-blue-900 font-mono font-black text-xs px-2 py-0.5 rounded-lg border border-blue-300">
                  {inv.id}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{inv.createdAt}</span>
              </div>

              <div>
                <h4 className="font-black text-slate-900 text-sm">{inv.customerName} - {inv.customerPhone}</h4>
                <div className="text-xs text-slate-600 font-semibold mt-0.5">Dịch vụ: {inv.serviceName}</div>
                <div className="text-xs text-amber-700 font-bold mt-0.5">🤝 CTV: {inv.ctvCode} ({inv.ctvName})</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng chi phí:</span>
                  <span className="font-black text-slate-900">{inv.totalAmount.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đã đặt cọc:</span>
                  <span className="font-extrabold text-amber-600">{inv.depositAmount.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-700 font-bold">Còn phải thu:</span>
                  <span className="font-black text-purple-700">{inv.remainingAmount.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-bold text-right pt-0.5">
                  ✨ Hoa hồng CTV: {inv.commissionAmount.toLocaleString("vi-VN")} đ ({inv.commissionRate}%)
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {inv.paymentStatus !== "Đã thu đủ (Hoàn thành)" && (
                  <button
                    onClick={() => {
                      setSelectedInvoiceForDeposit(inv);
                      setDepositInputValue(inv.depositAmount > 0 ? inv.depositAmount.toString() : Math.round(inv.totalAmount * 0.2).toString());
                    }}
                    className="flex-1 bg-amber-500 text-[#0B192C] font-black text-xs py-2 rounded-xl text-center"
                  >
                    Thu Cọc
                  </button>
                )}
                {inv.paymentStatus !== "Đã thu đủ (Hoàn thành)" && (
                  <button
                    onClick={() => setSelectedInvoiceForFinal(inv)}
                    className="flex-1 bg-emerald-600 text-white font-black text-xs py-2 rounded-xl text-center"
                  >
                    Thu Đủ & Trích CTV
                  </button>
                )}
                <button
                  onClick={() => setPrintInvoiceModal(inv)}
                  className="bg-slate-100 text-slate-800 font-bold text-xs px-3 py-2 rounded-xl border border-slate-300"
                >
                  In Phiếu
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. MODAL 1: CẬP NHẬT TIỀN ĐẶT CỌC */}
      {selectedInvoiceForDeposit && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600 font-black text-sm">
                <Wallet className="w-5 h-5" />
                <span>XÁC NHẬN THU TIỀN ĐẶT CỌC</span>
              </div>
              <button
                onClick={() => setSelectedInvoiceForDeposit(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
              <div><strong>Mã Hóa Đơn:</strong> {selectedInvoiceForDeposit.id}</div>
              <div><strong>Khách hàng:</strong> {selectedInvoiceForDeposit.customerName} ({selectedInvoiceForDeposit.customerPhone})</div>
              <div><strong>Dịch vụ:</strong> {selectedInvoiceForDeposit.serviceName}</div>
              <div><strong>Tổng chi phí:</strong> {selectedInvoiceForDeposit.totalAmount.toLocaleString("vi-VN")} VNĐ</div>
            </div>

            <form onSubmit={handleConfirmDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Số Tiền Đặt Cọc (VNĐ):
                </label>
                <input
                  type="text"
                  required
                  placeholder="1.000.000"
                  value={formatCurrencyInput(depositInputValue)}
                  onChange={(e) => setDepositInputValue(parseCurrencyInput(e.target.value).toString())}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-base font-black font-mono text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Khuyên dùng cọc tối thiểu 20% ({Math.round(selectedInvoiceForDeposit.totalAmount * 0.2).toLocaleString("vi-VN")} VNĐ).
                </span>
              </div>

              {/* Chọn Phương Thức Thanh Toán */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Phương Thức Thanh Toán:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "VietQR / Chuyển khoản", label: "VietQR Chuyển Khoản", icon: QrCode, color: "text-blue-600 bg-blue-50 border-blue-200" },
                    { id: "Tiền mặt", label: "Tiền Mặt Quầy", icon: Banknote, color: "text-amber-600 bg-amber-50 border-amber-200" },
                    { id: "Thẻ ATM/Visa", label: "Quẹt Thẻ POS", icon: CreditCard, color: "text-purple-600 bg-purple-50 border-purple-200" }
                  ].map((m) => {
                    const IconC = m.icon;
                    const isSel = depositPaymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setDepositPaymentMethod(m.id as any)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                          isSel
                            ? "bg-[#0B192C] text-amber-400 border-[#0B192C] shadow-md ring-2 ring-amber-400"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <IconC className={`w-4 h-4 ${isSel ? "text-amber-400" : m.color.split(" ")[0]}`} />
                        <span className="text-[10px] font-black leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic VietQR Code Box */}
              {depositPaymentMethod === "VietQR / Chuyển khoản" && (
                <div className="bg-[#0B192C] text-white rounded-2xl p-3.5 space-y-3 border border-blue-900 shadow-inner animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-400 uppercase flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5" /> QUÉT MÃ VIETQR CHUYỂN KHOẢN TỰ ĐỘNG
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      MB Bank
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2.5 rounded-xl text-slate-900">
                    <img
                      src={generateVietQRUrl("MB", "888899998888", "BENH VIEN THAM MY KOREAN STAR", parseInt(depositInputValue) || 0, `COC ${selectedInvoiceForDeposit.id}`)}
                      alt="VietQR Code"
                      className="w-32 h-32 object-contain rounded-lg border border-slate-200 shadow-sm shrink-0"
                    />
                    <div className="space-y-1 text-xs text-left w-full">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">TÊN TÀI KHOẢN:</span>
                        <strong className="text-slate-900 text-[11px] font-black uppercase">BỆNH VIỆN THẨM MỸ KOREAN STAR</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">SỐ TÀI KHOẢN (MBBANK):</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-blue-900 font-mono text-sm font-black">8888 9999 8888</strong>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("888899998888");
                              setCopiedAcc(true);
                              setTimeout(() => setCopiedAcc(false), 2000);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-700"
                            title="Sao chép số tài khoản"
                          >
                            {copiedAcc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">NỘI DUNG CHUYỂN KHOẢN:</span>
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-black text-[11px] inline-block">
                          COC {selectedInvoiceForDeposit.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Box */}
              {depositPaymentMethod === "Tiền mặt" && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-center gap-3 text-xs text-amber-900 animate-fadeIn">
                  <Banknote className="w-8 h-8 text-amber-600 shrink-0" />
                  <div>
                    <strong className="font-black text-slate-900 block">Thanh toán Tiền mặt tại Quầy Thu Ngân</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">Thu ngân kiểm đếm tiền mặt trực tiếp và xuất biên nhận giữ suất phẫu thuật.</p>
                  </div>
                </div>
              )}

              {/* POS Card Box */}
              {depositPaymentMethod === "Thẻ ATM/Visa" && (
                <div className="bg-blue-50 border border-blue-300 rounded-2xl p-3 flex items-center gap-3 text-xs text-blue-950 animate-fadeIn">
                  <CreditCard className="w-8 h-8 text-blue-600 shrink-0" />
                  <div>
                    <strong className="font-black text-slate-900 block">Quẹt Thẻ ATM / Visa / POS Quầy Thu Ngân</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">Hỗ trợ tất cả các thẻ ngân hàng nội địa & quốc tế, miễn phí quẹt thẻ.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForDeposit(null)}
                  className="flex-1 bg-slate-100 text-slate-700 font-extrabold text-xs py-3 rounded-2xl cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-[#0B192C] font-black text-xs py-3 rounded-2xl shadow-md cursor-pointer"
                >
                  Xác Nhận Đã Thu Cọc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL 2: THU ĐỦ TIỀN CÒN LẠI & TỰ ĐỘNG CỘNG VÍ CTV */}
      {selectedInvoiceForFinal && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-emerald-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>THU ĐỦ TIỀN CÒN LẠI & TRÍCH HOA HỒNG CTV</span>
              </div>
              <button
                onClick={() => setSelectedInvoiceForFinal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-2">
              <div><strong>Hóa đơn:</strong> {selectedInvoiceForFinal.id}</div>
              <div><strong>Khách hàng:</strong> {selectedInvoiceForFinal.customerName} ({selectedInvoiceForFinal.customerPhone})</div>
              <div><strong>Dịch vụ phẫu thuật:</strong> {selectedInvoiceForFinal.serviceName}</div>
              <div className="border-t border-emerald-200/80 pt-2 font-mono space-y-1">
                <div className="flex justify-between">
                  <span>Tổng chi phí liệu trình:</span>
                  <strong className="text-slate-900">{selectedInvoiceForFinal.totalAmount.toLocaleString("vi-VN")} VNĐ</strong>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Đã cọc trước:</span>
                  <strong>{selectedInvoiceForFinal.depositAmount.toLocaleString("vi-VN")} VNĐ</strong>
                </div>
                <div className="flex justify-between text-purple-700 text-sm font-black pt-1">
                  <span>SỐ TIỀN CẦN THU NỐT:</span>
                  <strong>{selectedInvoiceForFinal.remainingAmount.toLocaleString("vi-VN")} VNĐ</strong>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Hệ Thống Tự Động Hạch Toán Hoa Hồng CTV:</span>
              </div>
              <p className="text-[11px] text-slate-700 mt-1">
                Ngay khi bấm <strong>Xác Nhận Thu Đủ</strong>, hệ thống sẽ tự động cộng <strong className="text-emerald-700">{selectedInvoiceForFinal.commissionAmount.toLocaleString("vi-VN")} VNĐ</strong> ({selectedInvoiceForFinal.commissionRate}%) vào ví tài khoản CTV <strong>{selectedInvoiceForFinal.ctvCode}</strong> ({selectedInvoiceForFinal.ctvName}).
              </p>
            </div>

            <div className="space-y-4">
              {/* Chọn Phương Thức Thanh Toán */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Phương Thức Thu Tiền Còn Lại:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "VietQR / Chuyển khoản", label: "VietQR Chuyển Khoản", icon: QrCode, color: "text-blue-600 bg-blue-50 border-blue-200" },
                    { id: "Tiền mặt", label: "Tiền Mặt Quầy", icon: Banknote, color: "text-amber-600 bg-amber-50 border-amber-200" },
                    { id: "Thẻ ATM/Visa", label: "Quẹt Thẻ POS", icon: CreditCard, color: "text-purple-600 bg-purple-50 border-purple-200" }
                  ].map((m) => {
                    const IconC = m.icon;
                    const isSel = finalPaymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFinalPaymentMethod(m.id as any)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                          isSel
                            ? "bg-[#0B192C] text-amber-400 border-[#0B192C] shadow-md ring-2 ring-amber-400"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <IconC className={`w-4 h-4 ${isSel ? "text-amber-400" : m.color.split(" ")[0]}`} />
                        <span className="text-[10px] font-black leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic VietQR Code Box */}
              {finalPaymentMethod === "VietQR / Chuyển khoản" && (
                <div className="bg-[#0B192C] text-white rounded-2xl p-3.5 space-y-3 border border-blue-900 shadow-inner animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-400 uppercase flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5" /> QUÉT MÃ VIETQR THU ĐỦ NỐT TIỀN
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      MB Bank
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2.5 rounded-xl text-slate-900">
                    <img
                      src={generateVietQRUrl("MB", "888899998888", "BENH VIEN THAM MY KOREAN STAR", selectedInvoiceForFinal.remainingAmount, `THU DU ${selectedInvoiceForFinal.id}`)}
                      alt="VietQR Code"
                      className="w-32 h-32 object-contain rounded-lg border border-slate-200 shadow-sm shrink-0"
                    />
                    <div className="space-y-1 text-xs text-left w-full">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">TÊN TÀI KHOẢN:</span>
                        <strong className="text-slate-900 text-[11px] font-black uppercase">BỆNH VIỆN THẨM MỸ KOREAN STAR</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">SỐ TÀI KHOẢN (MBBANK):</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-blue-900 font-mono text-sm font-black">8888 9999 8888</strong>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("888899998888");
                              setCopiedAcc(true);
                              setTimeout(() => setCopiedAcc(false), 2000);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-700"
                            title="Sao chép số tài khoản"
                          >
                            {copiedAcc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-extrabold uppercase">NỘI DUNG CHUYỂN KHOẢN:</span>
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-black text-[11px] inline-block">
                          THU DU {selectedInvoiceForFinal.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Box */}
              {finalPaymentMethod === "Tiền mặt" && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-center gap-3 text-xs text-amber-900 animate-fadeIn">
                  <Banknote className="w-8 h-8 text-amber-600 shrink-0" />
                  <div>
                    <strong className="font-black text-slate-900 block">Thanh toán Tiền mặt tại Quầy Thu Ngân</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">Thu ngân nhận đủ tiền mặt còn lại ({selectedInvoiceForFinal.remainingAmount.toLocaleString("vi-VN")} VNĐ) trước khi bác sĩ phẫu thuật.</p>
                  </div>
                </div>
              )}

              {/* POS Card Box */}
              {finalPaymentMethod === "Thẻ ATM/Visa" && (
                <div className="bg-blue-50 border border-blue-300 rounded-2xl p-3 flex items-center gap-3 text-xs text-blue-950 animate-fadeIn">
                  <CreditCard className="w-8 h-8 text-blue-600 shrink-0" />
                  <div>
                    <strong className="font-black text-slate-900 block">Quẹt Thẻ ATM / Visa / POS Quầy Thu Ngân</strong>
                    <p className="text-[11px] text-slate-600 mt-0.5">Quẹt thẻ thu nốt {selectedInvoiceForFinal.remainingAmount.toLocaleString("vi-VN")} VNĐ, in bill máy POS dán kèm hóa đơn.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForFinal(null)}
                  className="flex-1 bg-slate-100 text-slate-700 font-extrabold text-xs py-3 rounded-2xl"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFinalPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-2xl shadow-md cursor-pointer"
                >
                  Xác Nhận Thu Đủ 100%
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL 3: IN PHIẾU THU / HÓA ĐƠN CHUYÊN NGHIỆP */}
      {printInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-300 text-slate-900 print:m-0 print:p-0 print:border-none print:shadow-none">
            
            {/* Header hospital */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0B192C] text-amber-400 font-black flex items-center justify-center text-xl">
                  ✨
                </div>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight text-slate-900">BỆNH VIỆN THẨM MỸ KOREAN STAR</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Hệ Thống Phẫu Thuật & Y Khoa Thẩm Mỹ Quốc Tế Hàn Quốc</p>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-xs font-black text-blue-900 block">{printInvoiceModal.id}</span>
                <span className="text-[10px] text-slate-400">{printInvoiceModal.createdAt}</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-lg font-black text-slate-900 uppercase">PHIẾU THU TIỀN DỊCH VỤ THẨM MỸ</h2>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                Trạng thái: {printInvoiceModal.paymentStatus}
              </span>
            </div>

            {/* Info details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Khách Hàng:</span>
                <strong className="text-slate-900 text-sm">{printInvoiceModal.customerName}</strong>
                <div className="text-slate-600 font-mono">{printInvoiceModal.customerPhone}</div>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">CTV Giới Thiệu:</span>
                <strong className="text-amber-800">{printInvoiceModal.ctvName} ({printInvoiceModal.ctvCode})</strong>
                <div className="text-slate-600">Bác sĩ: {printInvoiceModal.doctorName}</div>
              </div>
            </div>

            {/* Financial breakdown */}
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 font-extrabold text-slate-700">
                  <th className="p-2 border border-slate-200">Nội Dung Dịch Vụ</th>
                  <th className="p-2 border border-slate-200 text-right">Tổng Tiền</th>
                  <th className="p-2 border border-slate-200 text-right">Đã Đặt Cọc</th>
                  <th className="p-2 border border-slate-200 text-right">Còn Phải Thu</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2.5 border border-slate-200 font-bold">{printInvoiceModal.serviceName}</td>
                  <td className="p-2.5 border border-slate-200 text-right font-mono font-bold">{printInvoiceModal.totalAmount.toLocaleString("vi-VN")} đ</td>
                  <td className="p-2.5 border border-slate-200 text-right font-mono text-amber-700">{printInvoiceModal.depositAmount.toLocaleString("vi-VN")} đ</td>
                  <td className="p-2.5 border border-slate-200 text-right font-mono font-black text-purple-700">{printInvoiceModal.remainingAmount.toLocaleString("vi-VN")} đ</td>
                </tr>
              </tbody>
            </table>

            {/* Footer signatures */}
            <div className="grid grid-cols-2 text-center text-xs pt-4">
              <div>
                <div className="font-bold text-slate-800">Khách Hàng Ký Tên</div>
                <div className="h-12" />
                <div className="text-slate-500 italic text-[11px]">{printInvoiceModal.customerName}</div>
              </div>
              <div>
                <div className="font-bold text-slate-800">Kế Toán / Thu Ngân</div>
                <div className="h-12" />
                <div className="text-slate-500 italic text-[11px]">Xác nhận đã thu đủ</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2 print:hidden">
              <button
                onClick={() => setPrintInvoiceModal(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-extrabold text-xs py-2.5 rounded-2xl"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#0B192C] hover:bg-blue-900 text-amber-400 font-black text-xs py-2.5 rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Thu Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL 4: TẠO HÓA ĐƠN DỊCH VỤ MỚI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-emerald-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-sm uppercase">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>TẠO HÓA ĐƠN DỊCH VỤ ĐÃ XÁC NHẬN</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 text-xs">
              
              {/* Chọn Lịch Hẹn Đã Xác Nhận Từ CRM */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Chọn Lịch Hẹn Đã Xác Nhận Trong CRM:
                </label>
                <select
                  value={selectedAppointmentId}
                  onChange={(e) => handleSelectAppointmentForCreate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Tạo hóa đơn trực tiếp (Không chọn lịch hẹn CRM) --</option>
                  {appointments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      [{apt.id}] {apt.customerName} - {apt.serviceName} ({apt.status})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  *Chọn lịch hẹn từ CRM để tự động điền Tên khách hàng, SĐT và Tên dịch vụ phẫu thuật.
                </span>
              </div>

              {/* Tên Khách Hàng & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Họ và Tên Khách Hàng:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Thị Hồng"
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Số Điện Thoại Khách Hàng:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 0988 123 456"
                    value={customCustomerPhone}
                    onChange={(e) => setCustomCustomerPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tên Dịch Vụ */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Tên Dịch Vụ Phẫu Thuật / Thẩm Mỹ:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nâng Ngực Ergonomix Nâng Cấp Chuyên Sâu"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Chi Phí & Hoa Hồng & Tiền Cọc */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Tổng Chi Phí (VNĐ):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="15.000.000"
                    value={formatCurrencyInput(customTotalAmount)}
                    onChange={(e) => setCustomTotalAmount(parseCurrencyInput(e.target.value).toString())}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-black font-mono text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Tiền Cọc Nhận Ngay (VNĐ):
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    value={formatCurrencyInput(customDepositAmount)}
                    onChange={(e) => setCustomDepositAmount(parseCurrencyInput(e.target.value).toString())}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-black font-mono text-amber-600 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Hoa Hồng CTV (%):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={customCommissionRate}
                    onChange={(e) => setCustomCommissionRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-black font-mono text-purple-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Thông Tin CTV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 border border-amber-200 rounded-2xl p-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-amber-900 uppercase mb-1">
                    Mã CTV Giới Thiệu:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: CTV8888"
                    value={customCtvCode}
                    onChange={(e) => setCustomCtvCode(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs font-bold text-amber-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-amber-900 uppercase mb-1">
                    Tên CTV Giới Thiệu:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={customCtvName}
                    onChange={(e) => setCustomCtvName(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs font-bold text-amber-950"
                  />
                </div>
              </div>

              {/* Phương Thức Thanh Toán */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Hình Thức Thanh Toán Thu Tiền:
                </label>
                <select
                  value={customPaymentMethod}
                  onChange={(e) => setCustomPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-2.5 text-xs font-bold text-slate-800"
                >
                  <option value="VietQR / Chuyển khoản">VietQR / Chuyển khoản ngân hàng</option>
                  <option value="Tiền mặt">Tiền mặt tại quầy thu ngân</option>
                  <option value="Thẻ ATM/Visa">Thẻ ATM / Visa / Quẹt thẻ POS</option>
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Ghi Chú Hóa Đơn:
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú dịch vụ phẫu thuật, phòng khám..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-2xl cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Xác Nhận Tạo Hóa Đơn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
