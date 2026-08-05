import React, { useState } from "react";
import { formatCurrencyInput, parseCurrencyInput, formatDateTimeVN } from "../utils/formatters";
import { CTVUser, ReferralLead, ServiceItem, ServiceFeedback } from "../types";
import { 
  Wallet, 
  Crown, 
  TrendingUp, 
  Users, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter, 
  Percent,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Phone,
  UserCheck,
  Stethoscope,
  Camera,
  GraduationCap,
  Eye,
  Layers,
  CalendarHeart,
  HeartPulse,
  Flame,
  LayoutGrid
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

import { ServiceCatalog } from "./ServiceCatalog";
import { BeforeAfterGallery } from "./BeforeAfterGallery";

interface CTVHubProps {
  ctvUser: CTVUser;
  leads: ReferralLead[];
  services?: ServiceItem[];
  feedbacks?: ServiceFeedback[];
  onOpenPayoutModal: () => void;
  onSelectTab?: (tabId: string) => void;
  onBookAppointment?: (serviceName: string, notes: string) => void;
  onGenerateServiceLink?: (serviceName: string) => void;
  onViewBeforeAfter?: (serviceId: string) => void;
}

export const CTVHub: React.FC<CTVHubProps> = ({
  ctvUser,
  leads,
  services = [],
  feedbacks = [],
  onOpenPayoutModal,
  onSelectTab,
  onBookAppointment,
  onGenerateServiceLink,
  onViewBeforeAfter
}) => {
  const PERFORMANCE_DATA = ctvUser.totalRevenue > 0 || ctvUser.successfulReferrals > 0
    ? [
        { month: "Hiện tại", revenue: ctvUser.totalRevenue, commission: ctvUser.totalCommission, referrals: ctvUser.successfulReferrals }
      ]
    : [];
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "services" | "feedbacks">("overview");
  const [customCode, setCustomCode] = useState(ctvUser.code);
  const [customerDiscount, setCustomerDiscount] = useState("10");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const referralUrl = `${window.location.origin}?ref=${customCode}&discount=${customerDiscount}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCodeOnly = () => {
    navigator.clipboard.writeText(customCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const ctvModules = [
    { id: "service-catalog", title: "Bảng Dịch Vụ", sub: "Giá & % Hoa Hồng", icon: Stethoscope, color: "from-emerald-500 to-teal-600" },
    { id: "before-after", title: "Ảnh Trước Sau", sub: "Thư viện 3D lâm sàng", icon: Camera, color: "from-purple-500 to-indigo-600" },
    { id: "medical-knowledge", title: "Kiến Thức Y Khoa", sub: "Video & Bài viết sale", icon: GraduationCap, color: "from-blue-500 to-cyan-600" },
    { id: "implant-3d", title: "Mô Phỏng 3D", sub: "Size túi xoay 360°", icon: Eye, color: "from-indigo-500 to-blue-700" },
    { id: "skin-ai", title: "Soi Da AI", sub: "Phác đồ Gemini", icon: Sparkles, color: "from-pink-500 to-rose-600" },
    { id: "combo-builder", title: "Phối Combo", sub: "Gói liệu trình hot", icon: Layers, color: "from-amber-500 to-orange-600" },
    { id: "crm-appointments", title: "Lịch Hẹn CRM", sub: "Tư vấn & Đặt khám", icon: CalendarHeart, color: "from-rose-500 to-red-600" },
    { id: "post-op", title: "Hậu Phẫu 24/7", sub: "Nhắc nhở hồi phục", icon: HeartPulse, color: "from-cyan-500 to-blue-600" },
    { id: "promotions", title: "Mã Ưu Đãi", sub: "Voucher Flash Sale", icon: Flame, color: "from-orange-500 to-amber-500" },
  ];

  const filteredLeads = leads.filter((lead) => {
    const isMyLead = !lead.ctvCode || lead.ctvCode === ctvUser.code;
    const matchesSearch =
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.customerPhone && lead.customerPhone.includes(searchTerm));
    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
    return isMyLead && matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const paginatedLeads = filteredLeads.slice(
    (validPage - 1) * itemsPerPage,
    validPage * itemsPerPage
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      

      {activeSubTab === "services" && (
        <ServiceCatalog
          services={services}
          isAdmin={false}
          onBookAppointment={onBookAppointment || (() => {})}
          onGenerateServiceLink={onGenerateServiceLink || (() => {})}
          onViewBeforeAfter={(serviceId) => {
            if (onViewBeforeAfter) onViewBeforeAfter(serviceId);
            else setActiveSubTab("feedbacks");
          }}
        />
      )}

      {activeSubTab === "feedbacks" && (
        <BeforeAfterGallery
          services={services}
          feedbacks={feedbacks}
          isAdmin={false}
          onBookAppointment={onBookAppointment || (() => {})}
        />
      )}

      {activeSubTab === "overview" && (
        <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        
        {/* Metric 1: Available Balance */}
        <div className="bg-white border border-emerald-300/80 rounded-2xl p-3 sm:p-4 text-slate-900 space-y-1 relative overflow-hidden shadow-2xs min-w-0">
          <div className="flex justify-between items-center gap-1 min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-extrabold truncate">Hoa Hồng Thực Nhận</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300/60 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-emerald-700 truncate tracking-tight">
            {ctvUser.availableBalance.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1 font-medium truncate">
            <span className="text-emerald-600 font-bold shrink-0">Rút 24/7</span>
            <span className="truncate">qua VietQR</span>
          </div>
        </div>

        {/* Metric 2: Pending Balance */}
        <div className="bg-white border border-amber-300/80 rounded-2xl p-3 sm:p-4 text-slate-900 space-y-1 relative overflow-hidden shadow-2xs min-w-0">
          <div className="flex justify-between items-center gap-1 min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-extrabold truncate">Chờ Duyệt</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-100 text-amber-800 border border-amber-300/60 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-amber-700 truncate tracking-tight">
            {ctvUser.pendingBalance.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
            Đã chốt lịch hẹn
          </div>
        </div>

        {/* Metric 3: Total Revenue Referred */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-slate-900 space-y-1 relative overflow-hidden shadow-2xs min-w-0">
          <div className="flex justify-between items-center gap-1 min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-extrabold truncate">Doanh Số Tích Lũy</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 text-amber-600 border border-slate-200 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-slate-900 truncate tracking-tight">
            {ctvUser.totalRevenue.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
            Hạng Kim Cương
          </div>
        </div>

        {/* Metric 4: Conversion Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-slate-900 space-y-1 relative overflow-hidden shadow-2xs min-w-0">
          <div className="flex justify-between items-center gap-1 min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-extrabold truncate">Chuyển Đổi</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-emerald-700 truncate tracking-tight">
            {ctvUser.conversionRate}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
            {ctvUser.successfulReferrals}/{ctvUser.totalReferrals} ca chốt
          </div>
        </div>

      </div>

      {/* TÍNH NĂNG NỔI BẬT */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                TÍNH NĂNG NỔI BẬT
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Truy cập nhanh bảng giá, ảnh lâm sàng, cẩm nang y khoa & công cụ tư vấn</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hidden sm:inline-block">
            {ctvModules.length} Tiện Ích Thẩm Mỹ
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {ctvModules.map((mod) => {
            const IconComp = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => {
                  if (onSelectTab) {
                    onSelectTab(mod.id);
                  } else if (mod.id === "service-catalog") {
                    setActiveSubTab("services");
                  } else if (mod.id === "before-after") {
                    setActiveSubTab("feedbacks");
                  }
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 p-1.5 sm:p-2.5 rounded-2xl transition-all duration-200 hover:scale-[1.03] flex flex-col items-center justify-center text-center group focus:outline-none min-w-0"
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shrink-0 shadow-xs mb-1 group-hover:scale-110 transition-transform`}>
                  <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-extrabold text-slate-800 leading-tight w-full truncate">
                  {mod.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Referred Customers Grid + Pagination */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-slate-900 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" /> Danh Sách Khách Hàng Giới Thiệu
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Theo dõi chi tiết các lượt đăng ký, tư vấn và hoàn thành phẫu thuật</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm khách hoặc dịch vụ..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Đã đặt lịch">Đã đặt lịch</option>
              <option value="Đã tư vấn">Đã tư vấn</option>
            </select>
          </div>
        </div>

        {/* Customer Cards List (Single Column) */}
        {paginatedLeads.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {paginatedLeads.map((lead) => (
              <div 
                key={lead.id} 
                className="bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-4 transition shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-900 truncate">{lead.customerName}</h4>
                    <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{lead.customerPhone}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1 ${
                      lead.status === "Đã hoàn thành"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : lead.status === "Đã đặt lịch"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {lead.status === "Đã hoàn thành" && <CheckCircle2 className="w-3 h-3" />}
                    {lead.status}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <div className="text-slate-800 font-bold truncate">{lead.serviceName}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">BS: <strong className="text-slate-700 font-medium">{lead.doctorAssigned || "BS Saohan"}</strong></span>
                    <span className="font-mono text-[10px] shrink-0">{formatDateTimeVN(lead.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hoa Hồng Dự Kiến:</span>
                  <span className="font-mono font-extrabold text-amber-700 text-sm">
                    +{lead.commission.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">
            Không tìm thấy khách hàng phù hợp với điều kiện tìm kiếm.
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="text-slate-500 font-medium">
            Hiển thị <span className="font-bold text-slate-800">{paginatedLeads.length}</span> / <span className="font-bold text-slate-800">{filteredLeads.length}</span> khách hàng
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold transition flex items-center gap-1 shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" /> Trang trước
            </button>

            <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-xl font-bold font-mono text-xs">
              {validPage} / {totalPages}
            </span>

            <button
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold transition flex items-center gap-1 shadow-2xs"
            >
              Trang sau <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Analytics Graph: Recharts Revenue & Commissions (At the very bottom) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-slate-900 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" /> Báo Cáo Thống Kê Chi Tiết Doanh Số CTV
            </h3>
            <p className="text-xs text-slate-500 font-medium">Theo dõi sự tăng trưởng doanh số và hoa hồng nhận được qua các tháng</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PERFORMANCE_DATA}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v / 1000000}M`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "12px", color: "#0f172a", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                formatter={(value: any) => [`${Number(value).toLocaleString("vi-VN")} VNĐ`]}
              />
              <Area type="monotone" dataKey="revenue" name="Doanh Số Referral" stroke="#d97706" fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="commission" name="Hoa Hồng Thực Nhận" stroke="#059669" fillOpacity={1} fill="url(#colorComm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

        </>
      )}

    </div>
  );
};
