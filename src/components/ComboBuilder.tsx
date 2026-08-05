import React, { useState } from "react";
import { ServiceItem } from "../types";
import { 
  Plus, 
  Trash2, 
  Percent, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert
} from "lucide-react";

interface ComboBuilderProps {
  services: ServiceItem[];
  onBookCombo: (comboTitle: string, totalCost: number, notes: string) => void;
}

export const ComboBuilder: React.FC<ComboBuilderProps> = ({ services, onBookCombo }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(["srv-nang-mui-nanoform", "srv-cat-mi-deep-layer"]);

  const toggleService = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedServices = services.filter((s) => selectedIds.includes(s.id));

  // Pricing math
  const originalTotalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

  // Discount rule: 2 items -> 15% combo discount, 3+ items -> 22% combo discount
  const discountRate = selectedServices.length >= 3 ? 0.22 : selectedServices.length === 2 ? 0.15 : 0;
  const discountAmount = Math.round(originalTotalPrice * discountRate);
  const finalComboPrice = originalTotalPrice - discountAmount;

  // CTV Combo Commission bonus
  const baseCommission = selectedServices.reduce((acc, s) => acc + s.commissionAmount, 0);
  const bonusCommission = Math.round(baseCommission * (discountRate > 0 ? 0.15 : 0)); // Extra 15% commission boost on combos
  const totalCTVCommission = baseCommission + bonusCommission;

  return (
    <div className="space-y-6">
      <div className="bg-[#0B192C] border border-amber-500/30 rounded-2xl p-6 text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
              <Sparkles className="w-4 h-4" /> KẾT HỢP LIỆU TRÌNH THEO NHU CẦU CÁ NHÂN HÓA
            </div>
            <h2 className="text-xl font-bold font-serif text-white">
              Công Cụ Tự Phối Combo Dịch Vụ & Tối Ưu Chi Phí
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Khách hàng tiết kiệm tới 22% tổng chi phí • CTV nhận thêm +15% thưởng hoa hồng combo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Selectable Services */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
            <span>Chọn các dịch vụ kết hợp vào Combo:</span>
            <span className="text-xs text-amber-700 font-bold">Đã chọn: {selectedIds.length} dịch vụ</span>
          </h3>

          <div className="space-y-3">
            {services.map((srv) => {
              const isSelected = selectedIds.includes(srv.id);
              return (
                <div
                  key={srv.id}
                  onClick={() => toggleService(srv.id)}
                  className={`p-3.5 sm:p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 sm:gap-4 ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500 text-slate-900"
                      : "bg-[#0B192C] border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 ${
                        isSelected
                          ? "bg-amber-500 border-amber-400 text-slate-950"
                          : "border-slate-700 bg-[#13253E]"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    <img src={srv.image} alt={srv.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />

                    <div>
                      <h4 className={`font-bold text-xs ${isSelected ? "text-slate-900" : "text-white"}`}>{srv.name}</h4>
                      <p className={`text-[11px] ${isSelected ? "text-slate-600" : "text-slate-400"}`}>{srv.categoryName} • {srv.duration}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`font-bold text-xs font-mono block ${isSelected ? "text-amber-800" : "text-amber-400"}`}>
                      {srv.price.toLocaleString("vi-VN")} VNĐ
                    </span>
                    <span className={`text-[10px] ${isSelected ? "text-emerald-700 font-bold" : "text-emerald-400"}`}>
                      +Hoa hồng {srv.commissionAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Combo Bill Summary & CTV Earnings */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#0B192C] border border-amber-500/30 rounded-2xl p-5 text-white space-y-4 sticky top-24 shadow-2xl">
            <h3 className="font-bold text-sm text-amber-400 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Bảng Tính Chi Phí Combo Sau Chiết Khấu
            </h3>

            {/* List selected */}
            <div className="space-y-2 text-xs">
              {selectedServices.map((s) => (
                <div key={s.id} className="flex justify-between items-center text-slate-300">
                  <span className="truncate pr-2">• {s.name}</span>
                  <span className="font-mono">{s.price.toLocaleString("vi-VN")}đ</span>
                </div>
              ))}
            </div>

            {/* Calculation details */}
            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tổng giá niêm yết:</span>
                <span className="line-through font-mono">{originalTotalPrice.toLocaleString("vi-VN")} VNĐ</span>
              </div>

              {discountRate > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Ưu đãi Combo (Giảm {(discountRate * 100).toFixed(0)}%):</span>
                  <span className="font-mono">-{discountAmount.toLocaleString("vi-VN")} VNĐ</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-white font-bold text-sm">Tổng Chi Phí Combo:</span>
                <span className="text-amber-400 font-extrabold text-lg font-mono">
                  {finalComboPrice.toLocaleString("vi-VN")} VNĐ
                </span>
              </div>
            </div>

            {/* CTV Commission Bonus Box */}
            <div className="bg-[#07111F] border border-emerald-500/30 p-4 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-emerald-400 font-bold">
                <span>Hoa Hồng CTV Nhận Được:</span>
                <span className="text-sm font-mono">+{totalCTVCommission.toLocaleString("vi-VN")} VNĐ</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Bao gồm hoa hồng gốc + Thưởng nóng {bonusCommission.toLocaleString("vi-VN")}đ cho đơn Combo từ 2 dịch vụ trở lên.
              </p>
            </div>

            <button
              onClick={() =>
                onBookCombo(
                  `Combo Liệu Trình Custom (${selectedServices.length} Dịch Vụ)`,
                  finalComboPrice,
                  `Bao gồm: ${selectedServices.map((s) => s.name).join(", ")}`
                )
              }
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg text-xs flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" /> Xác Nhận Đặt Lịch Combo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
