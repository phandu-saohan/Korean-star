import React, { useState } from "react";
import { 
  X, 
  Headphones, 
  Phone, 
  MessageCircle, 
  Mail, 
  MapPin, 
  HelpCircle, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  Wallet, 
  Calendar,
  Building2,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      question: "Quy trình tính và nhận hoa hồng CTV như thế nào?",
      answer: "Hoa hồng được hệ thống tự động tính dựa trên tỷ lệ cấp bậc của CTV (Bạc 15%, Vàng 18%, Bạch Kim 20%, Kim Cương 25%). Ngay khi khách hàng do bạn giới thiệu hoàn tất dịch vụ hoặc thanh toán hóa đơn, tiền hoa hồng sẽ nạp tức thì vào Ví khả dụng."
    },
    {
      question: "Làm thế nào để rút tiền hoa hồng về ngân hàng cá nhân?",
      answer: "Bạn chỉ cần mở 'Ví & Doanh Số' hoặc bấm nút 'Rút Hoa Hồng', nhập số tiền muốn rút (tối thiểu 100.000 VNĐ) và bấm Xác nhận. Bộ phận Kế toán sẽ duyệt và giải ngân tự động qua VietQR 24/7 trong 1-5 phút."
    },
    {
      question: "Làm sao để đặt lịch dịch vụ thẩm mỹ cho khách hàng referral?",
      answer: "Vào mục 'Đặt Lịch' trên ứng dụng, nhập Tên khách hàng, Số điện thoại và Dịch vụ thẩm mỹ mong muốn. Khách hàng sẽ được lưu trực tiếp vào CRM danh sách của bạn để theo dõi tiến trình."
    },
    {
      question: "Tôi có thể liên hệ bộ phận hỗ trợ khi gặp sự cố ở đâu?",
      answer: "Bạn có thể gọi trực tiếp tới Hotline 1900 8888 hoặc chat qua Zalo CSKH KOREAN STAR (0901 888 999) hoạt động 24/7."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-w-full text-slate-900 shadow-2xl overflow-hidden relative space-y-0 max-h-[92vh] flex flex-col my-auto">
        
        {/* Header Bar */}
        <div className="bg-[#0B192C] text-white p-4 sm:p-5 relative flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-[#0B192C] flex items-center justify-center font-extrabold shadow-md shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-wide text-white flex items-center gap-2">
                TRỢ GIÚP & HỖ TRỢ 24/7
              </h3>
              <p className="text-[11px] text-amber-400 font-bold">KOREAN STAR Customer Care & Guidance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Quick Contact Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Hotline Call */}
            <a
              href="tel:19008888"
              className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-[#0B192C] font-extrabold flex flex-col items-center justify-center text-center gap-1.5 shadow-md hover:brightness-110 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#0B192C] text-amber-400 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black">Hotline 24/7</div>
                <div className="text-[11px] font-mono font-bold">1900 8888</div>
              </div>
            </a>

            {/* Zalo Support */}
            <a
              href="https://zalo.me/0901888999"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-extrabold flex flex-col items-center justify-center text-center gap-1.5 shadow-md hover:brightness-110 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black">Chat Zalo CSKH</div>
                <div className="text-[11px] font-mono font-bold">0901 888 999</div>
              </div>
            </a>
          </div>

          {/* Contact Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-600" /> Trụ Sở Chính & Thông Tin Liên Hệ
            </div>

            <div className="space-y-2 text-slate-700 font-medium pt-1">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Số 88 Phố Huế, Q. Hai Bà Trưng, Hà Nội</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                <span>cskh@koreanstar.vn</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bảo mật hệ thống SSL 256-bit • Hỗ trợ CTV 24/7</span>
              </div>
            </div>
          </div>

          {/* FAQ Accordion Section */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600" /> Câu Hỏi Thường Gặp (FAQ)
            </h4>

            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-white text-xs transition"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    className="w-full p-3.5 text-left font-bold text-slate-900 flex items-center justify-between gap-2 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${activeFaq === index ? "rotate-90 text-amber-600" : ""}`} />
                  </button>

                  {activeFaq === index && (
                    <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-slate-600 font-medium leading-relaxed animate-fadeIn">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#0B192C] hover:bg-[#1E3A8A] text-white font-black rounded-2xl text-xs transition shadow-md cursor-pointer"
          >
            Đóng Cửa Sổ Trợ Giúp
          </button>
        </div>

      </div>
    </div>
  );
};
