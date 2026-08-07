import React, { useState } from "react";
import { CTVUser, ReferralLead, Appointment, ServiceItem, ServiceFeedback, PayoutRequest } from "../types";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/formatters";
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
  Clock
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
  onRefreshAppointments
}) => {
  const [activeTab, setActiveTab] = useState<"crm" | "services" | "feedbacks" | "payouts" | "settings">("crm");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const pendingPayoutsCount = payoutRequests.filter((p) => p.status === "Chờ duyệt").length;
  const pendingAppointmentsCount = appointments.filter((a) => a.status === "Chờ xác nhận").length;

  const menuItems = [
    {
      id: "crm",
      title: "Quản Lý Lịch Hẹn CRM",
      shortTitle: "Lịch Hẹn CRM",
      icon: Stethoscope,
      badge: appointments.length,
      badgeColor: "bg-blue-900/80 text-blue-200 border border-blue-700",
      description: "Quản lý phác đồ khám & thông tin khách hàng"
    },
    {
      id: "payouts",
      title: "Duyệt Hoa Hồng VietQR",
      shortTitle: "Duyệt Hoa Hồng",
      icon: QrCode,
      badge: pendingPayoutsCount > 0 ? `${pendingPayoutsCount} chờ duyệt` : payoutRequests.length,
      badgeColor: pendingPayoutsCount > 0 ? "bg-amber-500 text-[#0B192C] font-black" : "bg-emerald-900/80 text-emerald-300 border border-emerald-700",
      description: "Xử lý rút tiền & quét mã VietQR tự động"
    },
    {
      id: "services",
      title: "Bảng Giá & Dịch Vụ",
      shortTitle: "Bảng Giá Dịch Vụ",
      icon: Tag,
      badge: services.length,
      badgeColor: "bg-amber-900/80 text-amber-300 border border-amber-700",
      description: "Quản lý danh mục & chiết khấu dịch vụ"
    },
    {
      id: "feedbacks",
      title: "Feedback & Ảnh Lâm Sàng",
      shortTitle: "Feedback Ca Phẫu Thuật",
      icon: Camera,
      badge: feedbacks.length,
      badgeColor: "bg-rose-900/80 text-rose-300 border border-rose-700",
      description: "Thư viện ca phẫu thuật trước & sau"
    },
    {
      id: "settings",
      title: "Cài Đặt & Phân Quyền",
      shortTitle: "Cài Đặt Hệ Thống",
      icon: Settings,
      badge: "Hệ thống",
      badgeColor: "bg-purple-900/80 text-purple-300 border border-purple-700",
      description: "Cấu hình Logo, tài khoản Admin & CTV"
    }
  ];

  const currentTabObj = menuItems.find((m) => m.id === activeTab) || menuItems[0];

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col md:flex-row font-sans -m-4 sm:-m-6">
      
      {/* 1. MOBILE HEADER BAR */}
      <div className="md:hidden bg-[#0B192C] text-white p-4 flex items-center justify-between border-b border-blue-900 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-[#0B192C] font-black flex items-center justify-center shadow-xs">
            <Crown className="w-4 h-4 text-[#0B192C]" />
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

      {/* 2. ADMIN SIDEBAR (DESKTOP STICKY / MOBILE DRAWER) */}
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
                    Admin Portal
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
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#0B192C] font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                {authUser?.fullName ? authUser.fullName.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="truncate min-w-0">
                <div className="font-black text-xs text-white truncate">{authUser?.fullName || ctvUser?.name || "Admin Quản Trị"}</div>
                <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Quản Lý Cao Cấp</span>
                </div>
              </div>
            </div>
          )}

          {/* SIDEBAR NAVIGATION MENU */}
          <nav className="p-3 space-y-1.5">
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

        {/* SIDEBAR FOOTER STATS */}
        {(!isSidebarCollapsed || isMobileSidebarOpen) && (
          <div className="p-3 border-t border-blue-900/60 bg-blue-950/40 m-3 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Hệ thống Realtime:
              </span>
              <span className="font-mono text-emerald-400 font-black">HOẠT ĐỘNG</span>
            </div>
            {onRefreshAppointments && (
              <button
                onClick={onRefreshAppointments}
                className="w-full bg-blue-900/80 hover:bg-amber-500 hover:text-[#0B192C] text-amber-300 font-extrabold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1.5 border border-blue-800 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải Lại CSDL Ngay</span>
              </button>
            )}
          </div>
        )}
      </aside>

      {/* 3. MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 overflow-x-hidden min-w-0">
        
        {/* CONTENT TOP BAR: HEADER TITLE & METRIC CARDS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                <Crown className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
                <span>/</span>
                <span className="text-slate-900 font-black">{currentTabObj.shortTitle}</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
                {currentTabObj.title}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{currentTabObj.description}</p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {onRefreshAppointments && (
                <button
                  onClick={onRefreshAppointments}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tải Lại CSDL</span>
                </button>
              )}
            </div>
          </div>

          {/* QUICK METRIC STATS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-800 uppercase block">Tổng Lịch Hẹn</span>
                <span className="font-mono font-black text-lg text-slate-900">{appointments.length}</span>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-[#0B192C] flex items-center justify-center font-bold shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Chờ Xác Nhận</span>
                <span className="font-mono font-black text-lg text-amber-900">{pendingAppointmentsCount}</span>
              </div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Hoa Hồng Chờ Duyệt</span>
                <span className="font-mono font-black text-lg text-emerald-900">{pendingPayoutsCount}</span>
              </div>
            </div>

            <div className="bg-purple-50/80 border border-purple-200 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-800 uppercase block">Dịch Vụ Niêm Yết</span>
                <span className="font-mono font-black text-lg text-purple-900">{services.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SUB-MODULE CONTENT TAB DISPLAY */}
        <div>
          {/* TAB 1: CRM APPOINTMENT MODULE */}
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

          {/* TAB 2: DUYỆT RÚT TIỀN VIETQR */}
          {activeTab === "payouts" && (
            <PayoutManagementModule
              payoutRequests={payoutRequests}
              onUpdatePayoutRequest={onUpdatePayoutRequest || (() => {})}
              currentRole="admin"
              currentUserFullName={ctvUser.name || authUser?.fullName || "Admin Quản Trị"}
            />
          )}

          {/* TAB 3: BẢNG GIÁ DỊCH VỤ */}
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

          {/* TAB 4: FEEDBACK & ẢNH LÂM SÀNG */}
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

          {/* TAB 5: CÀI ĐẶT HỆ THỐNG */}
          {activeTab === "settings" && (
            <SystemSettingsModule
              ctvUser={ctvUser}
              onToast={(msg) => alert(msg)}
            />
          )}
        </div>
      </main>
    </div>
  );
};
