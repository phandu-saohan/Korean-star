import React, { useState } from "react";
import { CTVUser } from "../types";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/formatters";
import { 
  X, 
  Wallet, 
  CheckCircle2, 
  RotateCw, 
  QrCode, 
  Building2, 
  ShieldCheck, 
  ArrowRight
} from "lucide-react";

import { notifyPayoutRequested } from "../lib/onesignal";
import { notifyZaloPayoutRequested } from "../services/zaloService";

interface PayoutModalProps {
  ctvUser: CTVUser;
  onClose: () => void;
  onConfirmPayout: (amount: number, bankDetails?: { bankName: string; accountNumber: string; accountHolder: string }) => void;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({
  ctvUser,
  onClose,
  onConfirmPayout
}) => {
  const registeredBankName = ctvUser.bankAccount?.bankName || (ctvUser as any).bankName || "MBBank (Ngân Hàng Quân Đội)";
  const registeredAccountNumber = ctvUser.bankAccount?.accountNumber || (ctvUser as any).accountNumber || "";
  const registeredAccountHolder = ctvUser.bankAccount?.accountHolder || (ctvUser as any).accountHolder || ctvUser.name || "";

  const [amount, setAmount] = useState<number>(ctvUser.availableBalance);
  const [bankName, setBankName] = useState<string>(registeredBankName);
  const [accountNumber, setAccountNumber] = useState<string>(registeredAccountNumber);
  const [accountHolder, setAccountHolder] = useState<string>(registeredAccountHolder);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > ctvUser.availableBalance) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      notifyPayoutRequested({
        ctvUserId: ctvUser.id,
        ctvName: ctvUser.name,
        amount,
        bankName: bankName || registeredBankName,
        accountNumber: accountNumber || registeredAccountNumber
      });
      notifyZaloPayoutRequested({
        ctvUserId: ctvUser.id,
        ctvCode: ctvUser.code,
        ctvName: ctvUser.name,
        amount,
        bankName: bankName || registeredBankName,
        accountNumber: accountNumber || registeredAccountNumber
      }, ctvUser.zaloChatId);
      onConfirmPayout(amount, {
        bankName: bankName || registeredBankName,
        accountNumber: accountNumber || registeredAccountNumber,
        accountHolder: accountHolder || registeredAccountHolder
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 space-y-5 animate-scaleUp shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 relative">
          <div className="w-8" />
          <h3 className="font-black text-base text-slate-900 flex items-center justify-center gap-2 uppercase tracking-wide text-center">
            <Wallet className="w-5 h-5 text-amber-500" /> Yêu Cầu Rút Tiền Hoa Hồng
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
            <h4 className="text-lg font-bold text-slate-900">Khởi Tạo Yêu Cầu Rút Tiền Thành Công!</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto font-medium">
              Đã gửi yêu cầu rút <span className="text-amber-700 font-mono font-bold">{amount.toLocaleString("vi-VN")} VNĐ</span> về ngân hàng <strong className="text-slate-900">{bankName}</strong> ({accountNumber} - {accountHolder}). Kế toán & Admin sẽ duyệt giải ngân VietQR 24/7.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md cursor-pointer"
            >
              Hoàn Tất
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
              <span className="text-slate-500 font-semibold uppercase">Số dư khả dụng có thể rút:</span>
              <span className="text-amber-700 font-bold font-mono text-sm">
                {ctvUser.availableBalance.toLocaleString("vi-VN")} VNĐ
              </span>
            </div>

            {/* Thẻ thông báo tự động điền theo tài khoản CTV */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-emerald-900 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã tự động lấy thông tin ngân hàng thụ hưởng đăng ký của CTV.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số Tiền Muốn Rút (VNĐ):</label>
              <input id="formatcurrencyAmount_120" name="formatcurrencyAmount_120"
                type="text"
                value={formatCurrencyInput(amount)}
                onChange={(e) => setAmount(parseCurrencyInput(e.target.value))}
                placeholder="5.000.000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-amber-700 font-black font-mono text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngân Hàng Thụ Hưởng:</label>
              <select id="bankname_131" name="bankname_131"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
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
                <option value="MSB">MSB (Hàng Hải)</option>
                <option value="LPBank">LPBank (Lộc Phát)</option>
                <option value="SeABank">SeABank</option>
                <option value="HDBank">HDBank</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số Tài Khoản Ngân Hàng:</label>
              <input id="nhPSTIKhoN_157" name="nhPSTIKhoN_157"
                type="text"
                required
                placeholder="Nhập số tài khoản..."
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên Chủ Tài Khoản (Viết Hoa Không Dấu):</label>
              <input id="vdNguyenVanA_169" name="vdNguyenVanA_169"
                type="text"
                required
                placeholder="VD: NGUYEN VAN A"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 uppercase font-black focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || amount <= 0 || amount > ctvUser.availableBalance}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" /> Đang Khởi Tạo Yêu Cầu Rút Tiền...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" /> Xác Nhận Rút {amount.toLocaleString("vi-VN")}đ Qua VietQR
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
