import React, { useState, useMemo } from "react";
import { CTVUser, Appointment, AppointmentInvoice } from "../types";
import { 
  X, 
  Wallet, 
  CheckCircle2, 
  RotateCw, 
  QrCode, 
  CalendarCheck, 
  TrendingDown, 
  CheckSquare, 
  Square,
  AlertCircle
} from "lucide-react";

import { notifyPayoutRequested } from "../lib/onesignal";
import { notifyZaloPayoutRequested } from "../services/zaloService";

interface PayoutModalProps {
  ctvUser: CTVUser;
  appointments?: Appointment[];
  invoices?: AppointmentInvoice[];
  onClose: () => void;
  onConfirmPayout: (
    amount: number,
    bankDetails?: { bankName: string; accountNumber: string; accountHolder: string },
    selectedItems?: { selectedAptIds: string[]; selectedInvoiceIds: string[]; deductedRevenue: number }
  ) => void;
}

interface CompletedItem {
  id: string;
  aptId: string;
  invId?: string;
  customerName: string;
  serviceName: string;
  date: string;
  revenue: number;
  commission: number;
  type: "invoice" | "appointment";
}

export const PayoutModal: React.FC<PayoutModalProps> = ({
  ctvUser,
  appointments = [],
  invoices = [],
  onClose,
  onConfirmPayout
}) => {
  const registeredBankName = ctvUser.bankAccount?.bankName || (ctvUser as any).bankName || "MBBank (Ngân Hàng Quân Đội)";
  const registeredAccountNumber = ctvUser.bankAccount?.accountNumber || (ctvUser as any).accountNumber || "";
  const registeredAccountHolder = ctvUser.bankAccount?.accountHolder || (ctvUser as any).accountHolder || ctvUser.name || "";

  // 1. TỔNG HỢP DANH SÁCH LỊCH HẸN / HÓA ĐƠN ĐÃ HOÀN THÀNH CHƯA RÚT HOA HỒNG CỦA CTV
  const eligibleItems = useMemo(() => {
    const codeUpper = (ctvUser.code || "").trim().toUpperCase();
    const nameLower = (ctvUser.name || "").trim().toLowerCase();

    // Hóa đơn đã thu đủ hoàn thành
    const ctvInvoices = invoices.filter((i) => {
      const matchCode = i.ctvCode && i.ctvCode.trim().toUpperCase() === codeUpper;
      const matchName = i.ctvName && i.ctvName.trim().toLowerCase() === nameLower;
      return (matchCode || matchName) && i.paymentStatus === "Đã thu đủ (Hoàn thành)" && !i.isCommissionWithdrawn;
    });

    const invoiceAptIds = new Set(ctvInvoices.map((i) => i.appointmentId).filter(Boolean));

    // Lịch hẹn hoàn thành chưa tạo hóa đơn
    const ctvAppointments = appointments.filter((a) => {
      const matchCode = a.ctvCode && a.ctvCode.trim().toUpperCase() === codeUpper;
      const matchName = a.ctvName && a.ctvName.trim().toLowerCase() === nameLower;
      return (matchCode || matchName) && a.status === "Hoàn thành" && !invoiceAptIds.has(a.id) && !a.isCommissionWithdrawn;
    });

    const items: CompletedItem[] = [];

    ctvInvoices.forEach((i) => {
      items.push({
        id: `inv-${i.id}`,
        aptId: i.appointmentId || i.id,
        invId: i.id,
        customerName: i.customerName || "Khách hàng",
        serviceName: i.serviceName || "Dịch vụ Thẩm mỹ",
        date: i.createdAt || i.depositPaidAt || "Gần đây",
        revenue: i.totalAmount || 35000000,
        commission: i.commissionAmount || Math.round((i.totalAmount || 35000000) * 0.15),
        type: "invoice"
      });
    });

    ctvAppointments.forEach((a) => {
      items.push({
        id: `apt-${a.id}`,
        aptId: a.id,
        customerName: a.customerName || "Khách hàng",
        serviceName: a.serviceName || "Dịch vụ Thẩm mỹ",
        date: a.date || "Gần đây",
        revenue: 35000000,
        commission: Math.round(35000000 * 0.15),
        type: "appointment"
      });
    });

    // Nếu dữ liệu mẫu ban đầu chưa có trong DB nhưng CTV có số dư khả dụng > 0 -> Tự động sinh mục hoàn thành ứng với ví
    if (items.length === 0 && ctvUser.availableBalance > 0) {
      const estRevenue = Math.round(ctvUser.availableBalance / 0.15);
      items.push({
        id: `demo-item-1`,
        aptId: `apt-demo-1`,
        customerName: "Nguyễn Thị Mai (Ca Hoàn Thành)",
        serviceName: "Phẫu Thuật Thẩm Mỹ Nâng Mũi / Hút Mỡ",
        date: new Date().toLocaleDateString("vi-VN"),
        revenue: estRevenue,
        commission: ctvUser.availableBalance,
        type: "appointment"
      });
    }

    return items;
  }, [ctvUser, appointments, invoices]);

  // 2. STATE CHỌN MỤC RÚT HOA HỒNG
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(eligibleItems.map((item) => item.id)));

  // 3. TÍNH TOÁN TỔNG HOA HỒNG VÀ DOANH SỐ SẼ TRỪ THÁNG
  const { totalCommission, totalDeductedRevenue, selectedAptIds, selectedInvoiceIds } = useMemo(() => {
    let commSum = 0;
    let revSum = 0;
    const aptIds: string[] = [];
    const invIds: string[] = [];

    eligibleItems.forEach((item) => {
      if (selectedIds.has(item.id)) {
        commSum += item.commission;
        revSum += item.revenue;
        if (item.aptId) aptIds.push(item.aptId);
        if (item.invId) invIds.push(item.invId);
      }
    });

    return {
      totalCommission: commSum,
      totalDeductedRevenue: revSum,
      selectedAptIds: aptIds,
      selectedInvoiceIds: invIds
    };
  }, [eligibleItems, selectedIds]);

  const [bankName, setBankName] = useState<string>(registeredBankName);
  const [accountNumber, setAccountNumber] = useState<string>(registeredAccountNumber);
  const [accountHolder, setAccountHolder] = useState<string>(registeredAccountHolder);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === eligibleItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleItems.map((item) => item.id)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCommission <= 0) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      notifyPayoutRequested({
        ctvUserId: ctvUser.id,
        ctvName: ctvUser.name,
        amount: totalCommission,
        bankName: bankName || registeredBankName,
        accountNumber: accountNumber || registeredAccountNumber
      });
      notifyZaloPayoutRequested(
        {
          ctvUserId: ctvUser.id,
          ctvCode: ctvUser.code,
          ctvName: ctvUser.name,
          amount: totalCommission,
          bankName: bankName || registeredBankName,
          accountNumber: accountNumber || registeredAccountNumber
        },
        ctvUser.zaloChatId
      );
      onConfirmPayout(
        totalCommission,
        {
          bankName: bankName || registeredBankName,
          accountNumber: accountNumber || registeredAccountNumber,
          accountHolder: accountHolder || registeredAccountHolder
        },
        {
          selectedAptIds,
          selectedInvoiceIds,
          deductedRevenue: totalDeductedRevenue
        }
      );
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-4 sm:p-6 text-slate-900 space-y-4 animate-scaleUp shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 relative shrink-0">
          <div className="w-8" />
          <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center justify-center gap-2 uppercase tracking-wide text-center">
            <Wallet className="w-5 h-5 text-amber-500" /> Rút Hoa Hồng Theo Lịch Hẹn
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Yêu Cầu Rút Tiền Đã Khởi Tạo!</h4>
            <div className="space-y-1 text-xs text-slate-600 max-w-sm mx-auto font-medium">
              <p>
                Đã gửi yêu cầu rút <span className="text-amber-700 font-mono font-black text-sm">{totalCommission.toLocaleString("vi-VN")} VNĐ</span> từ {selectedIds.size} ca hoàn thành.
              </p>
              <p className="text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                ⚡ Doanh số tháng đã được khấu trừ tương ứng: -{totalDeductedRevenue.toLocaleString("vi-VN")} VNĐ
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Số tiền sẽ được giải ngân về ngân hàng <strong>{bankName}</strong> ({accountNumber} - {accountHolder}).
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md cursor-pointer"
            >
              Hoàn Tất
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs overflow-y-auto pr-1 custom-scrollbar">
            {/* Thống kê Ví & Thông báo Khấu Trừ */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 p-3.5 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-900 font-bold uppercase block">Số dư khả dụng:</span>
                <span className="text-amber-800 font-black font-mono text-base">
                  {ctvUser.availableBalance.toLocaleString("vi-VN")} VNĐ
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-medium block">Số ca chờ rút:</span>
                <span className="text-slate-900 font-black text-xs font-mono">
                  {eligibleItems.length} Ca Hoàn Thành
                </span>
              </div>
            </div>

            {/* DANH SÁCH LỊCH HẸN HOÀN THÀNH ĐƯỢC CHỌN ĐỂ RÚT */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-slate-800 font-extrabold text-xs flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>Chọn ca hoàn thành cần rút hoa hồng ({selectedIds.size}/{eligibleItems.length}):</span>
                </label>

                {eligibleItems.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {selectedIds.size === eligibleItems.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-200 custom-scrollbar">
                {eligibleItems.length > 0 ? (
                  eligibleItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSelectItem(item.id)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? "bg-white border-amber-400 shadow-2xs"
                            : "bg-slate-100/70 border-slate-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button type="button" className="text-amber-600 shrink-0">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                          </button>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate text-[11px]">
                              {item.customerName}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate font-medium">
                              {item.serviceName} • <span className="font-mono text-slate-600">{item.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-amber-700 font-black font-mono text-[11px]">
                            +{item.commission.toLocaleString("vi-VN")}đ
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono">
                            Doanh số: {item.revenue.toLocaleString("vi-VN")}đ
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs font-medium space-y-1">
                    <AlertCircle className="w-5 h-5 mx-auto text-slate-300" />
                    <p>Hiện không có ca hẹn nào hoàn thành chưa rút hoa hồng.</p>
                  </div>
                )}
              </div>
            </div>

            {/* THẺ TỔNG KẾT KHẤU TRỪ DOANH SỐ THÁNG */}
            {selectedIds.size > 0 && (
              <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-3 space-y-1.5 animate-fadeIn text-[11px]">
                <div className="flex justify-between items-center text-slate-700 font-semibold">
                  <span>Hoa hồng thực nhận rút ví:</span>
                  <span className="text-amber-700 font-mono font-black text-xs sm:text-sm">
                    {totalCommission.toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-800 font-bold border-t border-rose-200/60 pt-1.5">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    <span>Khấu trừ doanh số tháng:</span>
                  </span>
                  <span className="font-mono font-black text-rose-700 text-xs sm:text-sm">
                    -{totalDeductedRevenue.toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
                <p className="text-[10px] text-rose-700 font-medium italic pt-0.5">
                  * Sau khi gửi yêu cầu, doanh số tích lũy tháng hiện tại sẽ tự động trừ tương ứng <strong>{totalDeductedRevenue.toLocaleString("vi-VN")}đ</strong>.
                </p>
              </div>
            )}

            {/* THÔNG TIN NGÂN HÀNG THỤ HƯỞNG */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="block text-slate-800 font-extrabold text-[11px]">Ngân hàng thụ hưởng giải ngân:</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Ngân Hàng:</span>
                  <select
                    id="payout_modal_bankname"
                    name="payout_modal_bankname"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-bold focus:outline-none focus:border-amber-500 text-[11px]"
                  >
                    <option value="MBBank (Ngân Hàng Quân Đội)">MBBank (Ngân Hàng Quân Đội)</option>
                    <option value="Vietcombank">Vietcombank (VCB)</option>
                    <option value="Techcombank">Techcombank (TCB)</option>
                    <option value="VietinBank">VietinBank (CTG)</option>
                    <option value="BIDV">BIDV</option>
                    <option value="Agribank">Agribank</option>
                    <option value="ACB">ACB (Á Châu)</option>
                    <option value="VPBank">VPBank</option>
                    <option value="TPBank">TPBank</option>
                    <option value="Sacombank">Sacombank</option>
                    <option value="VIB">VIB</option>
                    <option value="SHB">SHB</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Số Tài Khoản:</span>
                  <input
                    id="payout_modal_accnum"
                    name="payout_modal_accnum"
                    type="text"
                    required
                    placeholder="Nhập số tài khoản..."
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-medium">Chủ Tài Khoản (Viết Hoa Không Dấu):</span>
                <input
                  id="payout_modal_accholder"
                  name="payout_modal_accholder"
                  type="text"
                  required
                  placeholder="VD: NGUYEN VAN A"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 uppercase font-black focus:outline-none focus:border-amber-500 text-[11px]"
                />
              </div>
            </div>

            {/* BUTTON NÚT XÁC NHẬN */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || totalCommission <= 0 || selectedIds.size === 0}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" /> Đang Khởi Tạo Lệnh Rút Tiền...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" /> Xác Nhận Rút {totalCommission.toLocaleString("vi-VN")}đ (Trừ {totalDeductedRevenue.toLocaleString("vi-VN")}đ Doanh Số)
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
