import React, { useState, useEffect } from "react";
import { Promotion } from "../types";
import { 
  Zap, 
  Clock, 
  Tag, 
  Copy, 
  Check, 
  Gift, 
  Sparkles, 
  Bell, 
  ArrowRight,
  Flame
} from "lucide-react";

interface PromotionsBannerProps {
  promotions: Promotion[];
  onApplyPromo: (code: string) => void;
  onAddPromo?: (newPromo: Promotion) => void;
  onUpdatePromo?: (updatedPromo: Promotion) => void;
  onDeletePromo?: (promoId: string) => void;
}

export const PromotionsBanner: React.FC<PromotionsBannerProps> = ({ 
  promotions, 
  onApplyPromo,
  onAddPromo,
  onUpdatePromo,
  onDeletePromo 
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Real-time countdown clock (HH : MM : SS)
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    onApplyPromo(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Real-time Flash Sale Countdown Bar */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 rounded-2xl p-5 text-slate-950 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-amber-400 flex items-center justify-center shrink-0 shadow-md">
            <Flame className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#0B192C] text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                FLASH SALE REAL-TIME
              </span>
              <span className="font-bold text-xs">Tháng Vàng KOREAN STAR</span>
            </div>
            <h3 className="text-lg font-black font-serif text-slate-950 tracking-tight">
              Giảm Ngay 20 Triệu & Nhân Đôi Hoa Hồng CTV (+5% Bonus)
            </h3>
          </div>
        </div>

        {/* Real-time Clock */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold uppercase text-slate-900 mr-1">Kết thúc sau:</span>
          <div className="flex items-center gap-1 font-mono font-bold text-sm">
            <div className="bg-[#0B192C] text-amber-400 px-2.5 py-1.5 rounded-lg shadow">
              {String(timeLeft.hours).padStart(2, "0")}h
            </div>
            <span>:</span>
            <div className="bg-[#0B192C] text-amber-400 px-2.5 py-1.5 rounded-lg shadow">
              {String(timeLeft.minutes).padStart(2, "0")}m
            </div>
            <span>:</span>
            <div className="bg-[#0B192C] text-amber-400 px-2.5 py-1.5 rounded-lg shadow">
              {String(timeLeft.seconds).padStart(2, "0")}s
            </div>
          </div>
        </div>
      </div>

      {/* Promotions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="bg-[#0B192C] border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden transition space-y-4 p-5 flex flex-col justify-between group shadow-lg text-white"
          >
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-[#07111F]">
                <img src={promo.bannerImage} alt={promo.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-full shadow">
                  {promo.discount}
                </div>
              </div>

              <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition leading-snug">
                {promo.title}
              </h4>

              <p className="text-slate-300 text-xs leading-relaxed">{promo.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center bg-[#07111F] p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-mono text-[11px]">{promo.code}</span>
                <button
                  onClick={() => copyCode(promo.id, promo.code)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 text-[11px]"
                >
                  {copiedId === promo.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Lấy Mã
                </button>
              </div>

              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> Hạn đến: {promo.validUntil}
                </span>
                <span className="text-emerald-400 font-bold">
                  Bonus CTV +{promo.ctvBonusCommission}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
