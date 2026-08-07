import React, { useState, useMemo } from "react";
import { CTVUser, ReferralLead, Appointment, ServiceItem, ServiceFeedback, PayoutRequest } from "../types";
import { formatCurrencyInput } from "../utils/formatters";
import { AuthUserProfile } from "../lib/supabase";
import { ServiceCatalog } from "./ServiceCatalog";
import { BeforeAfterGallery } from "./BeforeAfterGallery";
import { CRMAppointment } from "./CRMAppointment";
import { PayoutManagementModule } from "./PayoutManagementModule";
import { SystemSettingsModule } from "./SystemSettingsModule";
import { 
  Crown, 
  ShieldCheck, 
  Stethoscope, 
  ChevronRight, 
  ChevronLeft, 
  Tag, 
  Sparkles, 
  Camera, 
  QrCode, 
  Settings, 
  Menu, 
  X, 
  RefreshCw, 
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Award,
  BarChart3,
  CheckCircle2,
  LogOut,
  ArrowLeftRight,
  UserCheck,
  Plus,
  ArrowUpRight,
  PieChart,
  Activity,
  Layers
} from "lucide-react";

interface AdminDashboardProps {
  ctvUser: CTVUser;
  leads: ReferralLead[];
  appointments: Appointment[];
  services?: ServiceItem[];
  feedbacks?: ServiceFeedback[];
  payoutRequests?: PayoutRequest[];
  authUser?: AuthUserProfile;
  onApproveLead: (leadId: string) => void;
  onAddService?: (newService: ServiceItem) => void;
  onUpdateService?: (updatedService: ServiceItem) => void;
  onDeleteService?: (serviceId: string) => void;
  onAddFeedback?: (newFb: ServiceFeedback) => void;
  onUpdateFeedback?: (updatedFb: ServiceFeedback) => void;
  onDeleteFeedback?: (fbId: string) => void;
  onAddAppointment?: (newApt: Appointment) => void;
  onUpdateAppointment?: (updatedApt: Appointment) => void;
  onDeleteAppointment?: (id: string) => void;
  onUpdateStatus?: (id: string, newStatus: Appointment["status"]) => void;
  onUpdatePayoutRequest?: (updatedReq: PayoutRequest) => void;
  onViewBeforeAfter?: (serviceId: string) => void;
  onBookAppointment?: (serviceName: string, notes: string) => void;
  onGenerateServiceLink?: (serviceName: string) => void;
  onRefreshAppointments?: () => void;
  onRoleChange?: (role: any) => void;
  onSignOut?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  ctvUser,
  leads,
  appointments,
  services = [],
  feedbacks = [],
  payoutRequests = [],
  authUser,
  onApproveLead,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddFeedback,
  onUpdateFeedback,
  onDeleteFeedback,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onUpdateStatus,
  onUpdatePayoutRequest,
  onViewBeforeAfter,
  onBookAppointment,
  onGenerateServiceLink,
  onRefreshAppointments,
  onRoleChange,
  onSignOut
}) => {
  const [activeTab, setActiveTab] = useState<"analytics" | "crm" | "payouts" | "services" | "feedbacks" | "settings">("analytics");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // --- ANALYTICS COMPUTATIONS ---
  const pendingPayoutsCount = payoutRequests.filter((p) => p.status === "Chờ duyệt").length;
  const pendingAptsCount = appointments.filter((a) => a.status === "Chờ xác nhận").length;
  const confirmedAptsCount = appointments.filter((a) => a.status === "Đã xác nhận").length;
  const inTreatmentAptsCount = appointments.filter((a) => a.status === "Đang điều trị").length;
  const completedAptsCount = appointments.filter((a) => a.status === "Hoàn thành").length;

  // Calculate estimated total revenue from completed / in-treatment appointments
  const totalRevenue = useMemo(() => {
    return appointments.reduce((acc, apt) => {
      const srvNames = apt.serviceName.split(/\s*\+\s*|\s*,\s*/);
      let aptVal = 0;
      srvNames.forEach((name) => {
        const found = services.find((s) => s.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (found) aptVal += found.price;
        else aptVal += 15000000; // Average fallback per procedure
      });
      return acc + (apt.status === "Hoàn thành" || apt.status === "Đang điều trị" ? aptVal : 0);
    }, 0);
  }, [appointments, services]);

  // Total payout approved
  const totalPayoutApproved = useMemo(() => {
    return payoutRequests
      .filter((p) => p.status === "Đã duyệt")
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payoutRequests]);

  // Top Services analysis
  const topServicesList = useMemo(() => {
    const counts: { [key: string]: number } = {};
    appointments.forEach((apt) => {
      const names = apt.serviceName.split(/\s*\+\s*|\s*,\s*/);
      names.forEach((n) => {
        const trimmed = n.trim();
        if (trimmed) {
          counts[trimmed] = (counts[trimmed] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [appointments]);

  // Top CTV Leaderboard
  const topCtvList = useMemo(() => {
    const ctvMap: { [key: string]: { name: string; code: string; aptCount: number; phone: string } } = {};
    appointments.forEach((apt) => {
      const code = apt.ctvCode || "SAOHAN-CTV";
      if (!ctvMap[code]) {
        ctvMap[code] = {
          name: apt.ctvName || "CTV Giới Thiệu",
          code,
          aptCount: 0,
          phone: apt.ctvPhone || "N/A"
        };
      }
      ctvMap[code].aptCount += 1;
    });

    return Object.values(ctvMap)
      .sort((a, b) => b.aptCount - a.aptCount)
      .slice(0, 5);
  }, [appointments]);

  // Sidebar Menu Config
  const menuItems = [
    {
      id: "analytics",
      title: "1. Tổng Quan & Phân Tích",
      shortTitle: "Dashboard Analytics",
      icon: BarChart3,
      badge: "KPIs",
      badgeColor: "bg-emerald-900/80 text-emerald-300 border border-emerald-700",
      description: "Thống kê doanh thu, phễu chuyển đổi & Top CTV"
    },
    {
      id: "crm",
      title: "2. Quản Lý Lịch Hẹn CRM",
      shortTitle: "Lịch Hẹn CRM",
      icon: Stethoscope,
      badge: appointments.length,
      badgeColor: "bg-blue-900/80 text-blue-200 border border-blue-700",
      description: "Quản lý phác đồ khám & thông tin khách hàng"
    },
    {
      id: "payouts",
      title: "3. Duyệt Hoa Hồng VietQR",
      shortTitle: "Duyệt Hoa Hồng",
      icon: QrCode,
      badge: pendingPayoutsCount > 0 ? `${pendingPayoutsCount} chờ duyệt` : payoutRequests.length,
      badgeColor: pendingPayoutsCount > 0 ? "bg-amber-500 text-[#0B192C] font-black" : "bg-emerald-900/80 text-emerald-300 border border-emerald-700",
      description: "Xử lý rút tiền & quét mã VietQR tự động"
    },
    {
      id: "services",
      title: "4. Bảng Giá & Dịch Vụ",
      shortTitle: "Bảng Giá Dịch Vụ",
      icon: Tag,
      badge: services.length,
      badgeColor: "bg-amber-900/80 text-amber-300 border border-amber-700",
      description: "Quản lý danh mục & chiết khấu dịch vụ"
    },
    {
      id: "feedbacks",
      title: "5. Feedback & Ảnh Lâm Sàng",
      shortTitle: "Feedback Phẫu Thuật",
      icon: Camera,
      badge: feedbacks.length,
      badgeColor: "bg-rose-900/80 text-rose-300 border border-rose-700",
      description: "Thư viện ca phẫu thuật trước & sau"
    },
    {
      id: "settings",
      title: "6. Cài Đặt & Phân Quyền",
      shortTitle: "Cài Đặt Hệ Thống",
      icon: Settings,
      badge: "Hệ thống",
      badgeColor: "bg-purple-900/80 text-purple-300 border border-purple-700",
      description: "Cấu hình Logo, tài khoản Admin & CTV"
    }
  ];

  const currentTabObj = menuItems.find((m) => m.id === activeTab) || menuItems[0];

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col md:flex-row font-sans">
      
      {/* 1. MOBILE HEADER BAR */}
      <div className="md:hidden bg-[#0B192C] text-white p-4 flex items-center justify-between border-b border-blue-900 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-[#0B192C] font-black flex items-center justify-center shadow-xs">
            <Crown className="w-4.5 h-4.5 text-[#0B192C]" />
          </div>
          <div>
            <div className="font-black text-xs uppercase tracking-wider text-amber-400">Korean Star Admin</div>
            <div className="text-[11px] text-slate-300 font-bold truncate max-w-[180px]">{currentTabObj.shortTitle}</div>
          </div>
        </div>

        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 hover:bg-slate-700 transition"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* 2. EXECUTIVE SIDEBAR (DESKTOP STICKY / MOBILE DRAWER) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-50 bg-gradient-to-b from-[#0B192C] via-[#1E3A8A] to-[#0B192C] text-white flex flex-col justify-between transition-all duration-300 ease-in-out border-r border-blue-900/50 shadow-2xl ${
          isSidebarCollapsed ? "md:w-20" : "md:w-72"
        } ${isMobileSidebarOpen ? "w-72 translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* SIDEBAR HEADER */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-blue-900/60">
            <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? "md:justify-center md:w-full" : ""}`}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-300 text-[#0B192C] font-black flex items-center justify-center shadow-md shrink-0">
                <Crown className="w-5 h-5 text-[#0B192C]" />
              </div>
              {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                <div className="truncate">
                  <h1 className="font-black text-sm uppercase tracking-wider text-amber-400 leading-tight">
                    KOREAN STAR
                  </h1>
                  <span className="text-[10px] text-blue-200 font-extrabold uppercase bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800">
                    Executive Portal
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-xl bg-blue-950/80 hover:bg-amber-500 hover:text-[#0B192C] text-blue-200 border border-blue-800 transition shadow-2xs shrink-0"
              title={isSidebarCollapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* ADMIN PROFILE CARD */}
          {(!isSidebarCollapsed || isMobileSidebarOpen) && (
            <div className="p-3 mx-3 my-3 bg-blue-950/60 rounded-2xl border border-blue-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-[#0B192C] font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                {authUser?.fullName ? authUser.fullName.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="truncate min-w-0">
                <div className="font-black text-xs text-white truncate">{authUser?.fullName || ctvUser?.name || "Admin Quản Trị"}</div>
                <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Tổng Giám Đốc / Admin</span>
                </div>
              </div>
            </div>
          )}

          {/* SIDEBAR NAVIGATION MENU */}
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-230px)]">
            {menuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl font-bold text-xs transition-all duration-200 flex items-center justify-between group ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 text-[#0B192C] font-black shadow-lg shadow-amber-500/20 scale-[1.02]"
                      : "text-slate-200 hover:bg-blue-900/50 hover:text-white"
                  } ${isSidebarCollapsed ? "md:justify-center md:px-0" : ""}`}
                  title={item.title}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl transition ${
                        isActive
                          ? "bg-[#0B192C] text-amber-400"
                          : "bg-blue-950/70 text-amber-400 group-hover:bg-blue-900"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                      <span className="truncate text-left">{item.shortTitle}</span>
                    )}
                  </div>

                  {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ml-2 shrink-0 ${
                        isActive ? "bg-[#0B192C] text-amber-400" : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* SIDEBAR FOOTER REALTIME STATUS */}
        {(!isSidebarCollapsed || isMobileSidebarOpen) && (
          <div className="p-3 border-t border-blue-900/60 bg-blue-950/40 m-3 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CSDL Realtime:
              </span>
              <span className="font-mono text-emerald-400 font-black">HOẠT ĐỘNG</span>
            </div>
            {onRefreshAppointments && (
              <button
                onClick={onRefreshAppointments}
                className="w-full bg-blue-900/80 hover:bg-blue-800 text-amber-300 font-extrabold text-[11px] py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 border border-blue-800 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải Lại CSDL</span>
              </button>
            )}
            {onRoleChange && (
              <button
                onClick={() => onRoleChange("ctv")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Chuyển Màn CTV</span>
              </button>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="w-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-extrabold text-[11px] py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 border border-rose-800 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng Xuất</span>
              </button>
            )}
          </div>
        )}
      </aside>

      {/* 3. MAIN EXECUTIVE CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden min-w-0 flex justify-center">
        <div className="w-full max-w-[1600px] mx-auto space-y-6">
        
        {/* EXECUTIVE CONTENT TOP HEADER */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                <Crown className="w-3.5 h-3.5" />
                <span>Executive Dashboard</span>
                <span>/</span>
                <span className="text-slate-900 font-black">{currentTabObj.shortTitle}</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
                {currentTabObj.title}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{currentTabObj.description}</p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
              {onRoleChange && (
                <button
                  onClick={() => onRoleChange("ctv")}
                  className="bg-amber-500 hover:bg-amber-600 text-[#0B192C] font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Chuyển sang giao diện Cộng tác viên"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Chuyển Màn CTV</span>
                </button>
              )}
              {onRefreshAppointments && (
                <button
                  onClick={onRefreshAppointments}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đồng Bộ CSDL</span>
                </button>
              )}
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Đăng xuất tài khoản"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Đăng Xuất</span>
                </button>
              )}
            </div>
          </div>

          {/* TOP METRIC CARDS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">Doanh Thu Phẫu Thuật</span>
                <div className="font-mono font-black text-base sm:text-xl text-emerald-950 mt-0.5">
                  {formatCurrencyInput(totalRevenue)} VNĐ
                </div>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" /> +18.5% so với tháng trước
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold text-blue-800 uppercase block">Tổng Lịch Hẹn CRM</span>
                <div className="font-mono font-black text-base sm:text-xl text-blue-950 mt-0.5">
                  {appointments.length} Lịch
                </div>
                <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-amber-600" /> {pendingAptsCount} Chờ xác nhận
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold text-amber-800 uppercase block">Hoa Hồng Đã Duyệt</span>
                <div className="font-mono font-black text-base sm:text-xl text-amber-950 mt-0.5">
                  {formatCurrencyInput(totalPayoutApproved)} VNĐ
                </div>
                <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 mt-1">
                  <QrCode className="w-3 h-3 text-amber-600" /> {pendingPayoutsCount} Yêu cầu chờ duyệt
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-[#0B192C] flex items-center justify-center font-bold shadow-md shrink-0">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[10px] font-extrabold text-purple-800 uppercase block">Dịch Vụ & Feedback</span>
                <div className="font-mono font-black text-base sm:text-xl text-purple-950 mt-0.5">
                  {services.length} Dịch Vụ
                </div>
                <span className="text-[10px] font-bold text-purple-700 flex items-center gap-1 mt-1">
                  <Camera className="w-3 h-3 text-purple-600" /> {feedbacks.length} Ảnh lâm sàng
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <Tag className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* SUB-MODULE DISPLAY / TAB CONTENT */}
        <div>
          {/* TAB 1: EXECUTIVE ANALYTICS DASHBOARD */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              
              {/* CRM CONVERSION FUNNEL & TOP PERFORMANCE GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. PHỄU CHUYỂN ĐỔI CRM (CONVERSION FUNNEL) */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                        <Activity className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className="font-black text-sm text-slate-900 uppercase">Phễu CRM Lâm Sàng</h3>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Realtime
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Chờ xác nhận */}
                    <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          ⏳ 1. Lịch Hẹn Mới Chờ Duyệt
                        </span>
                        <span className="font-mono font-black text-amber-900">{pendingAptsCount} ca</span>
                      </div>
                      <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((pendingAptsCount / (appointments.length || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Đã xác nhận */}
                    <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                          ✅ 2. Đã Xác Nhận Khám
                        </span>
                        <span className="font-mono font-black text-blue-900">{confirmedAptsCount} ca</span>
                      </div>
                      <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((confirmedAptsCount / (appointments.length || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Đang điều trị */}
                    <div className="bg-cyan-50/80 border border-cyan-200 p-3 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-cyan-900 flex items-center gap-1.5">
                          🏥 3. Đang Phẫu Thuật / Điều Trị
                        </span>
                        <span className="font-mono font-black text-cyan-900">{inTreatmentAptsCount} ca</span>
                      </div>
                      <div className="w-full bg-cyan-200/60 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((inTreatmentAptsCount / (appointments.length || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Hoàn thành */}
                    <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          🎉 4. Đã Hoàn Thành Phẫu Thuật
                        </span>
                        <span className="font-mono font-black text-emerald-900">{completedAptsCount} ca</span>
                      </div>
                      <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((completedAptsCount / (appointments.length || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("crm")}
                    className="w-full bg-blue-900 hover:bg-amber-500 text-white hover:text-[#0B192C] font-black text-xs py-2.5 rounded-2xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Mở Module Quản Lý Lịch Hẹn CRM</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. TOP DỊCH VỤ THẨM MỸ HOT NHẤT */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                      </div>
                      <h3 className="font-black text-sm text-slate-900 uppercase">Dịch Vụ Thẩm Mỹ Hot</h3>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Bảng xếp hạng
                    </span>
                  </div>

                  <div className="space-y-3">
                    {topServicesList.map((srv, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                            idx === 0 ? "bg-amber-500 text-[#0B192C]" : idx === 1 ? "bg-slate-300 text-slate-900" : "bg-slate-200 text-slate-700"
                          }`}>
                            #{idx + 1}
                          </div>
                          <span className="font-extrabold text-xs text-slate-900 truncate">{srv.name}</span>
                        </div>
                        <span className="font-mono font-black text-xs text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                          {srv.count} ca đặt
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveTab("services")}
                    className="w-full bg-slate-100 hover:bg-amber-500 text-slate-900 hover:text-[#0B192C] font-black text-xs py-2.5 rounded-2xl transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
                  >
                    <span>Xem Bảng Giá Niêm Yết</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 3. TOP CỘNG TÁC VIÊN (LEADERBOARD) */}
                <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                        <Award className="w-4 h-4 text-purple-600" />
                      </div>
                      <h3 className="font-black text-sm text-slate-900 uppercase">Top CTV Giới Thiệu</h3>
                    </div>
                    <span className="text-[10px] font-extrabold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Doanh số
                    </span>
                  </div>

                  <div className="space-y-3">
                    {topCtvList.map((ctv, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-[#0B192C] font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {ctv.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="font-extrabold text-xs text-slate-900 truncate">{ctv.name}</div>
                            <div className="font-mono text-[10px] text-blue-700 font-bold">{ctv.code}</div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                          {ctv.aptCount} Lịch hẹn
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveTab("payouts")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-2xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Duyệt Rút Tiền VietQR</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

              {/* CRM APPOINTMENTS FULL PREVIEW TABLE */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-amber-600" />
                    <h2 className="text-base font-black uppercase text-slate-900">Danh Sách Lịch Hẹn CRM Mới Nhất</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab("crm")}
                    className="text-amber-700 hover:text-amber-900 font-black text-xs flex items-center gap-1"
                  >
                    <span>Xem Tất Cả ({appointments.length})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <CRMAppointment
                  appointments={appointments.slice(0, 5)}
                  onAddAppointment={onAddAppointment || (() => {})}
                  onUpdateAppointment={onUpdateAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  onUpdateStatus={onUpdateStatus || (() => {})}
                  ctvUser={ctvUser}
                  authUser={authUser}
                  isAdmin={true}
                  onRefresh={onRefreshAppointments}
                />
              </div>

            </div>
          )}

          {/* TAB 2: CRM APPOINTMENT FULL MODULE */}
          {activeTab === "crm" && (
            <CRMAppointment
              appointments={appointments}
              onAddAppointment={onAddAppointment || ((newApt) => alert(`Đã tạo lịch hẹn: ${newApt.customerName}`))}
              onUpdateAppointment={onUpdateAppointment}
              onDeleteAppointment={onDeleteAppointment}
              onUpdateStatus={onUpdateStatus || ((id, status) => alert(`Đã cập nhật trạng thái: ${status}`))}
              ctvUser={ctvUser}
              authUser={authUser}
              isAdmin={true}
              onRefresh={onRefreshAppointments}
            />
          )}

          {/* TAB 3: DUYỆT RÚT TIỀN VIETQR */}
          {activeTab === "payouts" && (
            <PayoutManagementModule
              payoutRequests={payoutRequests}
              onUpdatePayoutRequest={onUpdatePayoutRequest || (() => {})}
              currentRole="admin"
              currentUserFullName={ctvUser.name || authUser?.fullName || "Admin Quản Trị"}
            />
          )}

          {/* TAB 4: BẢNG GIÁ DỊCH VỤ */}
          {activeTab === "services" && (
            <ServiceCatalog
              services={services}
              isAdmin={true}
              onBookAppointment={(srvName, notes) => {
                if (onBookAppointment) onBookAppointment(srvName, notes || "");
              }}
              onGenerateServiceLink={(srvName) => {
                if (onGenerateServiceLink) onGenerateServiceLink(srvName);
              }}
              onViewBeforeAfter={(serviceId) => {
                if (onViewBeforeAfter) {
                  onViewBeforeAfter(serviceId);
                } else {
                  setActiveTab("feedbacks");
                }
              }}
              onAddService={onAddService}
              onUpdateService={onUpdateService}
              onDeleteService={onDeleteService}
            />
          )}

          {/* TAB 5: FEEDBACK & ẢNH LÂM SÀNG */}
          {activeTab === "feedbacks" && (
            <BeforeAfterGallery
              services={services}
              feedbacks={feedbacks}
              isAdmin={true}
              onBookAppointment={(srvName, notes) => {
                if (onBookAppointment) onBookAppointment(srvName, notes || "");
              }}
              onAddFeedback={onAddFeedback}
              onUpdateFeedback={onUpdateFeedback}
              onDeleteFeedback={onDeleteFeedback}
            />
          )}

          {/* TAB 6: CÀI ĐẶT HỆ THỐNG */}
          {activeTab === "settings" && (
            <SystemSettingsModule
              ctvUser={ctvUser}
              onToast={(msg) => alert(msg)}
            />
          )}
        </div>
      </div>
    </main>
    </div>
  );
};
