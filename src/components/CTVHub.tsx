import React, { useState } from "react";
import { formatCurrencyInput, parseCurrencyInput, formatDateTimeVN } from "../utils/formatters";
import { CTVUser, ReferralLead, ServiceItem, ServiceFeedback, Appointment, AppointmentInvoice, PayoutRequest, TeamRevenueTransfer } from "../types";
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
  LayoutGrid,
  Trash2,
  Plus,
  X,
  XCircle,
  AlertCircle
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
  currentRole?: string;
  ctvUser: CTVUser;
  leads: ReferralLead[];
  appointments?: Appointment[];
  invoices?: AppointmentInvoice[];
  payoutRequests?: PayoutRequest[];
  services?: ServiceItem[];
  feedbacks?: ServiceFeedback[];
  onOpenPayoutModal: () => void;
  onSelectTab?: (tabId: string) => void;
  onBookAppointment?: (serviceName: string, notes: string) => void;
  onGenerateServiceLink?: (serviceName: string) => void;
  onViewBeforeAfter?: (serviceId: string) => void;
  onDeleteLead?: (leadId: string) => void;
  onClearAllLeads?: () => void;
  onOpenTeamTransferModal?: () => void;
}

// Lấy danh sách CTV đã đăng ký từ localStorage
function getRegisteredCTVs(leaderCode: string): any[] {
  try {
    const raw = localStorage.getItem("saohan_registered_users");
    if (!raw) return [];
    const all = JSON.parse(raw) as any[];
    return all.filter(
      (u) =>
        u.role === "ctv" &&
        u.teamLeaderId === leaderCode &&
        u.ctvCode !== leaderCode
    );
  } catch {
    return [];
  }
}

// Lấy danh sách yêu cầu chuyển doanh số từ localStorage
function getTransferRequests(leaderCode: string): TeamRevenueTransfer[] {
  try {
    const raw = localStorage.getItem("saohan_team_transfers");
    if (!raw) return [];
    const all = JSON.parse(raw) as TeamRevenueTransfer[];
    return all.filter((t) => t.toLeaderCode === leaderCode);
  } catch {
    return [];
  }
}

function saveTransferRequests(transfers: TeamRevenueTransfer[]) {
  localStorage.setItem("saohan_team_transfers", JSON.stringify(transfers));
}

export const CTVHub: React.FC<CTVHubProps> = ({
  currentRole,
  ctvUser,
  leads,
  appointments = [],
  invoices = [],
  payoutRequests = [],
  services = [],
  feedbacks = [],
  onOpenPayoutModal,
  onSelectTab,
  onBookAppointment,
  onGenerateServiceLink,
  onViewBeforeAfter,
  onDeleteLead,
  onClearAllLeads,
  onOpenTeamTransferModal
}) => {
  const PERFORMANCE_DATA = ctvUser.totalRevenue > 0 || ctvUser.successfulReferrals > 0
    ? [
        { month: "Hiện tại", revenue: ctvUser.totalRevenue, commission: ctvUser.totalCommission, referrals: ctvUser.successfulReferrals }
      ]
    : [];
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "services" | "feedbacks" | "team-members" | "team-transfers">("overview");
  const [customCode, setCustomCode] = useState(ctvUser.code);
  const [customerDiscount, setCustomerDiscount] = useState("10");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Team Leader state & handlers
  const leaderCode = ctvUser?.code || "";
  const teamMembers = getRegisteredCTVs(leaderCode);
  const [transfers, setTransfers] = useState<TeamRevenueTransfer[]>(() =>
    getTransferRequests(leaderCode)
  );

  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [memberCodeInput, setMemberCodeInput] = useState("");
  const [memberError, setMemberError] = useState("");

  const handleAddMember = () => {
    setMemberError("");
    const code = memberCodeInput.trim().toUpperCase();
    if (!code) { setMemberError("Vui lòng nhập Mã CTV"); return; }

    try {
      const raw = localStorage.getItem("saohan_registered_users");
      const all: any[] = raw ? JSON.parse(raw) : [];
      const target = all.find((u) => u.ctvCode === code || u.ctvCode?.toUpperCase() === code);
      if (!target) { setMemberError(`Không tìm thấy CTV có mã "${code}"`); return; }
      if (target.teamLeaderId && target.teamLeaderId !== leaderCode) {
        setMemberError(`CTV "${code}" đã thuộc nhóm khác rồi`); return;
      }
      if (target.ctvCode === leaderCode) { setMemberError("Không thể thêm chính mình vào nhóm"); return; }

      target.teamLeaderId = leaderCode;
      target.teamName = ctvUser.teamName || `Nhóm ${ctvUser.name}`;
      const updatedAll = all.map((u) => (u.ctvCode === target.ctvCode ? target : u));
      localStorage.setItem("saohan_registered_users", JSON.stringify(updatedAll));

      setMemberCodeInput("");
      setAddMemberModalOpen(false);
      window.location.reload();
    } catch {
      setMemberError("Đã xảy ra lỗi. Vui lòng thử lại.");
    }
  };

  const handleAcceptTransfer = (transfer: TeamRevenueTransfer) => {
    const updated = transfers.map((t) =>
      t.id === transfer.id ? { ...t, status: "accepted" as const } : t
    );
    setTransfers(updated);
    saveTransferRequests(updated);
  };

  const handleRejectTransfer = (transfer: TeamRevenueTransfer) => {
    const updated = transfers.map((t) =>
      t.id === transfer.id ? { ...t, status: "rejected" as const } : t
    );
    setTransfers(updated);
    saveTransferRequests(updated);
  };

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

  const isTeamLeader = Boolean(
    currentRole === "team_leader" ||
    ctvUser?.role === "team_leader" ||
    (ctvUser as any)?.role === "team_leader" ||
    ctvUser?.name?.toLowerCase().includes("trưởng nhóm") ||
    ctvUser?.name?.toLowerCase().includes("truong nhom") ||
    ctvUser?.code?.toLowerCase().includes("truongnhom") ||
    ctvUser?.code?.toLowerCase().includes("tl-")
  );
  const hasTeamLeader = Boolean(ctvUser?.teamLeaderId);

  const baseModules = [
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

  const teamLeaderModules = isTeamLeader
    ? [
        { id: "team-members", title: "Thành Viên Nhóm", sub: "Quản lý nhóm CTV", icon: Users, color: "from-blue-600 to-indigo-700" },
        { id: "team-transfers", title: "Chuyển Doanh Số", sub: "Duyệt doanh số nhóm", icon: ArrowUpRight, color: "from-amber-500 to-amber-600" }
      ]
    : hasTeamLeader
    ? [
        { id: "send-team-transfer", title: "Chuyển Doanh Số", sub: "Gửi lên Trưởng nhóm", icon: ArrowUpRight, color: "from-blue-600 to-indigo-600" }
      ]
    : [];

  const ctvModules = [...baseModules, ...teamLeaderModules];

  const ctvCodeLower = (ctvUser?.code || "").trim().toLowerCase();
  const ctvNameLower = (ctvUser?.name || "").trim().toLowerCase();

  const isUserAdmin = Boolean(
    ctvUser?.role === "admin" ||
    ctvUser?.role === "accountant" ||
    ctvUser?.code?.toLowerCase().includes("admin")
  );

  const myLeads = leads.filter((lead) => {
    const leadCode = (lead.ctvCode || "").trim().toLowerCase();
    const leadName = (lead.ctvName || "").trim().toLowerCase();

    const matchesCode = Boolean(ctvCodeLower && leadCode && (leadCode === ctvCodeLower || ctvCodeLower.includes(leadCode) || leadCode.includes(ctvCodeLower)));
    const matchesName = Boolean(ctvNameLower && leadName && (leadName === ctvNameLower || ctvNameLower.includes(leadName) || leadName.includes(ctvNameLower)));
    return matchesCode || matchesName;
  });

  const activeLeadsSource = isUserAdmin ? leads : myLeads;

  const filteredLeads = activeLeadsSource.filter((lead) => {
    const matchesSearch =
      lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.customerPhone && lead.customerPhone.includes(searchTerm));
    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
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

      {/* SUBTAB: THÀNH VIÊN NHÓM */}
      {activeSubTab === "team-members" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSubTab("overview")}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Quay lại Dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Quản Lý Thành Viên Nhóm ({teamMembers.length})
                </h2>
                <p className="text-xs text-slate-500 font-medium">Danh sách các cộng tác viên thuộc đội nhóm của bạn</p>
              </div>
            </div>

            <button
              onClick={() => setAddMemberModalOpen(true)}
              className="bg-[#0B192C] hover:bg-slate-800 text-amber-400 font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition shadow-sm w-full sm:w-auto justify-center cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm thành viên nhóm
            </button>
          </div>

          {/* Quick Stats Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl">
              <span className="text-[10px] text-blue-700 font-extrabold uppercase block">Thành viên</span>
              <span className="text-lg font-black text-blue-900 font-mono">{teamMembers.length} người</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
              <span className="text-[10px] text-emerald-700 font-extrabold uppercase block">Tổng doanh số nhóm</span>
              <span className="text-lg font-black text-emerald-900 font-mono">
                {teamMembers.reduce((s, m) => s + (m.totalRevenue || 0), 0).toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
              <span className="text-[10px] text-amber-700 font-extrabold uppercase block">Hoa hồng nhóm</span>
              <span className="text-lg font-black text-amber-900 font-mono">
                {teamMembers.reduce((s, m) => s + (m.totalCommission || 0), 0).toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl">
              <span className="text-[10px] text-purple-700 font-extrabold uppercase block">Tổng khách giới thiệu</span>
              <span className="text-lg font-black text-purple-900 font-mono">
                {leads.filter((l) => teamMembers.some((m) => m.ctvCode === l.ctvCode)).length} ca
              </span>
            </div>
          </div>

          {/* Search bar for Team Members */}
          {teamMembers.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm thành viên theo Tên, SĐT hoặc Mã CTV..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
              />
            </div>
          )}

          {/* Grid Thành viên nhóm */}
          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {teamMembers
                .filter(
                  (m) =>
                    !memberSearch ||
                    m.fullName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    m.ctvCode?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    m.phone?.includes(memberSearch)
                )
                .map((member) => {
                  const memberLeads = leads.filter((l) => l.ctvCode === member.ctvCode);
                  return (
                    <div key={member.ctvCode} className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm hover:border-blue-300 transition relative group">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0 font-black text-slate-600">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
                          ) : (
                            member.fullName?.[0] || "C"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-sm text-slate-900 truncate">{member.fullName}</div>
                          <div className="font-mono text-[11px] text-blue-700 font-bold">{member.ctvCode}</div>
                          <div className="text-[10px] text-slate-500">{member.phone || "Chưa cập nhật SĐT"}</div>
                        </div>

                        <button
                          onClick={() => handleRemoveMember(member.ctvCode)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-60 hover:opacity-100 cursor-pointer"
                          title="Gỡ khỏi nhóm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                          <div className="font-black text-emerald-700 text-[11px] font-mono">
                            {(member.totalRevenue || 0).toLocaleString("vi-VN")}đ
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">Doanh số</div>
                        </div>
                        <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                          <div className="font-black text-amber-700 text-[11px] font-mono">
                            {(member.totalCommission || 0).toLocaleString("vi-VN")}đ
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">Hoa hồng</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
                          <div className="font-black text-blue-700 text-[11px]">
                            {memberLeads.length}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">Khách GT</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-sm">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <p className="font-bold text-slate-700">Nhóm của bạn chưa có thành viên nào</p>
                <p className="text-xs text-slate-500 mt-1">Nhập Mã CTV để thêm cộng tác viên vào đội nhóm của bạn.</p>
              </div>
              <button
                onClick={() => setAddMemberModalOpen(true)}
                className="bg-[#0B192C] text-amber-400 font-black px-5 py-2.5 rounded-2xl text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                + Thêm thành viên đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: CHUYỂN DOANH SỐ (DẠNG GRID GỌN GÀNG) */}
      {activeSubTab === "team-transfers" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSubTab("overview")}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Quay lại Dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-amber-600" />
                  Danh Sách Yêu Cầu Chuyển Doanh Số ({transfers.length})
                </h2>
                <p className="text-xs text-slate-500 font-medium">Xem & xử lý phê duyệt doanh số từ các CTV trong nhóm</p>
              </div>
            </div>
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setTransferStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer shrink-0 ${
                transferStatusFilter === "ALL" ? "bg-[#0B192C] text-amber-400 shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tất cả ({transfers.length})
            </button>
            <button
              onClick={() => setTransferStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer shrink-0 ${
                transferStatusFilter === "pending" ? "bg-amber-500 text-slate-900 shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              ⏳ Chờ duyệt ({transfers.filter((t) => t.status === "pending").length})
            </button>
            <button
              onClick={() => setTransferStatusFilter("accepted")}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer shrink-0 ${
                transferStatusFilter === "accepted" ? "bg-emerald-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              ✓ Đã chấp nhận ({transfers.filter((t) => t.status === "accepted").length})
            </button>
            <button
              onClick={() => setTransferStatusFilter("rejected")}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition cursor-pointer shrink-0 ${
                transferStatusFilter === "rejected" ? "bg-rose-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              ✗ Đã từ chối ({transfers.filter((t) => t.status === "rejected").length})
            </button>
          </div>

          {/* GRID GỌN GÀNG THU GỌN */}
          {transfers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {transfers
                .filter((t) => transferStatusFilter === "ALL" || t.status === transferStatusFilter)
                .map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm hover:border-amber-400 transition">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">CTV gửi:</span>
                        <span className="font-black text-xs text-slate-900">{t.fromCtvName}</span>
                        <span className="font-mono text-[10px] text-blue-700 font-bold ml-1">({t.fromCtvCode})</span>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        t.status === "pending" ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse" :
                        t.status === "accepted" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                        "bg-rose-100 text-rose-900 border-rose-300"
                      }`}>
                        {t.status === "pending" ? "⏳ Chờ duyệt" : t.status === "accepted" ? "✓ Chấp nhận" : "✗ Từ chối"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold block truncate">Dịch vụ</span>
                        <span className="font-black text-slate-900 truncate block text-[11px]">{t.serviceName}</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 min-w-0">
                        <span className="text-[10px] text-emerald-600 font-bold block truncate">Doanh số</span>
                        <span className="font-mono font-black text-emerald-700 truncate block text-[11px]">{t.amount.toLocaleString("vi-VN")}đ</span>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 min-w-0">
                        <span className="text-[10px] text-amber-600 font-bold block truncate">Hoa hồng</span>
                        <span className="font-mono font-black text-amber-700 truncate block text-[11px]">{t.commission.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>

                    {t.note && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        Ghi chú: "{t.note}"
                      </p>
                    )}

                    {t.status === "pending" && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAcceptTransfer(t)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 rounded-xl text-xs transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Chấp nhận
                        </button>
                        <button
                          onClick={() => handleRejectTransfer(t)}
                          className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-sm">
              <ArrowUpRight className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">Chưa có yêu cầu chuyển doanh số nào</p>
              <p className="text-xs text-slate-500">Các yêu cầu chuyển doanh số từ CTV thành viên sẽ xuất hiện tại đây dưới dạng Grid gọn gàng.</p>
            </div>
          )}
        </div>
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
            Hạng {ctvUser.tier || "Kim Cương"}
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
                  if (mod.id === "send-team-transfer") {
                    if (onOpenTeamTransferModal) onOpenTeamTransferModal();
                  } else if (mod.id === "team-members" || mod.id === "team-transfers") {
                    if (onSelectTab) onSelectTab("team-leader");
                  } else if (onSelectTab) {
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
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Chờ xác nhận">Chờ xác nhận</option>
              <option value="Đã xác nhận">Đã xác nhận</option>
              <option value="Đang điều trị">Đang điều trị</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Customer Cards List (Single Column) */}
        {paginatedLeads.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {paginatedLeads.map((lead) => (
              <div 
                key={lead.id} 
                className="bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-4 transition shadow-xs flex flex-col justify-between space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">{lead.customerName}</h4>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{lead.customerPhone}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1 ${
                      lead.status === "Đã hoàn thành" || lead.status === "Hoàn thành"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : lead.status === "Đang điều trị" || lead.status === "Đã tư vấn"
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                        : lead.status === "Đã xác nhận"
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : lead.status === "Hủy" || lead.status === "Đã hủy"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {(lead.status === "Đã hoàn thành" || lead.status === "Hoàn thành") && <CheckCircle2 className="w-3 h-3" />}
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

      {/* Modal Thêm thành viên nhóm */}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" /> Thêm thành viên vào nhóm
              </h3>
              <button onClick={() => { setAddMemberModalOpen(false); setMemberError(""); }} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Mã CTV cần thêm vào nhóm (*):</label>
                <input
                  type="text"
                  placeholder="VD: SAOHAN-NGUYENVANA0912"
                  value={memberCodeInput}
                  onChange={(e) => { setMemberCodeInput(e.target.value); setMemberError(""); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  CTV phải đã đăng ký tài khoản trên hệ thống và chưa thuộc nhóm nào.
                </p>
              </div>

              {memberError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{memberError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setAddMemberModalOpen(false); setMemberError(""); }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="flex-1 py-2.5 bg-[#0B192C] text-amber-400 font-black rounded-xl hover:bg-slate-800 transition shadow-sm cursor-pointer"
                >
                  Xác nhận thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
