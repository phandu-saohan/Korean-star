import React, { useState } from "react";
import { CTVUser, ReferralLead, Appointment, ServiceItem, ServiceFeedback, PayoutRequest } from "../types";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/formatters";
import { ServiceCatalog } from "./ServiceCatalog";
import { BeforeAfterGallery } from "./BeforeAfterGallery";
import { CRMAppointment } from "./CRMAppointment";
import { PayoutManagementModule } from "./PayoutManagementModule";
import { SystemSettingsModule } from "./SystemSettingsModule";
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Wallet, 
  CheckCircle2, 
  Crown, 
  ShieldCheck, 
  Search, 
  Filter,
  Stethoscope,
  ChevronRight,
  UserCheck,
  CalendarCheck,
  Award,
  BarChart3,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Tag,
  Sparkles,
  Upload,
  ChevronLeft,
  Camera,
  QrCode,
  Settings
} from "lucide-react";

interface AdminDashboardProps {
  ctvUser: CTVUser;
  leads: ReferralLead[];
  appointments: Appointment[];
  services?: ServiceItem[];
  feedbacks?: ServiceFeedback[];
  payoutRequests?: PayoutRequest[];
  onApproveLead: (leadId: string) => void;
  onAddService?: (newService: ServiceItem) => void;
  onUpdateService?: (updatedService: ServiceItem) => void;
  onDeleteService?: (serviceId: string) => void;
  onAddFeedback?: (newFb: ServiceFeedback) => void;
  onUpdateFeedback?: (updatedFb: ServiceFeedback) => void;
  onDeleteFeedback?: (fbId: string) => void;
  onAddAppointment?: (newApt: Appointment) => void;
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
  onApproveLead,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddFeedback,
  onUpdateFeedback,
  onDeleteFeedback,
  onAddAppointment,
  onUpdateStatus,
  onUpdatePayoutRequest,
  onViewBeforeAfter,
  onBookAppointment,
  onGenerateServiceLink,
  onRefreshAppointments
}) => {
  const [activeTab, setActiveTab] = useState<"crm" | "services" | "feedbacks" | "payouts" | "settings">("crm");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const totalRevenue = leads.reduce((acc, l) => acc + (l.status === "Đã hoàn thành" ? l.estimatedValue : 0), 0);
  const totalCommission = leads.reduce((acc, l) => acc + (l.status === "Đã hoàn thành" ? l.commission : 0), 0);

  return (
    <div className="space-y-6">
      

      {/* Main Manager Dashboard Controls Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 text-slate-900 space-y-5 shadow-sm">
        
      {/* Navigation Cards Bar - Styled EXACTLY like 'Tính Năng Nổi Bật' */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                TÍNH NĂNG QUẢN LÝ ADMIN
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Truy cập nhanh quản lý lịch hẹn CRM, duyệt hoa hồng VietQR, bảng giá & feedback</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hidden sm:inline-block">
            5 Sub-module Điều Hành
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {[
            {
              id: "crm",
              title: "1. Lịch Hẹn CRM",
              sub: `${appointments.length} Lịch hẹn`,
              icon: Stethoscope,
              color: "from-blue-600 to-cyan-600"
            },
            {
              id: "payouts",
              title: "2. Duyệt Hoa Hồng",
              sub: `${payoutRequests.length} VietQR`,
              icon: QrCode,
              color: "from-emerald-600 to-teal-600"
            },
            {
              id: "services",
              title: "3. Bảng Giá",
              sub: `${services.length} Dịch vụ`,
              icon: Tag,
              color: "from-amber-500 to-orange-600"
            },
            {
              id: "feedbacks",
              title: "4. Feedback",
              sub: `${feedbacks.length} Lâm sàng`,
              icon: Camera,
              color: "from-rose-600 to-amber-600"
            },
            {
              id: "settings",
              title: "5. Cài Đặt",
              sub: "Cấu hình & Quyền",
              icon: Settings,
              color: "from-purple-600 to-indigo-600"
            }
          ].map((mod) => {
            const IconComp = mod.icon;
            const isActive = activeTab === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id as any)}
                className={`p-1.5 sm:p-2.5 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center group focus:outline-none min-w-0 ${
                  isActive
                    ? "bg-amber-500/10 border-amber-400 text-amber-900 ring-2 ring-amber-400/40 scale-[1.03]"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-800 hover:scale-[1.02]"
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shrink-0 shadow-xs mb-1 group-hover:scale-110 transition-transform`}>
                  <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-[10px] sm:text-xs font-extrabold leading-tight w-full truncate ${isActive ? "text-amber-900 font-black" : "text-slate-800"}`}>
                  {mod.title}
                </span>
                <span className="text-[9px] text-slate-500 font-medium truncate w-full mt-0.5">
                  {mod.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

        {/* TAB 1: QUẢN LÝ LỊCH HẸN BÁC SĨ */}
        {activeTab === "crm" && (
          <CRMAppointment
            appointments={appointments}
            onAddAppointment={onAddAppointment || ((newApt) => alert(`Đã tạo lịch hẹn: ${newApt.customerName}`))}
            onUpdateStatus={onUpdateStatus || ((id, status) => alert(`Đã cập nhật trạng thái: ${status}`))}
            ctvUser={ctvUser}
            isAdmin={true}
            onRefresh={onRefreshAppointments}
          />
        )}

        {/* TAB 4: DUYỆT RÚT TIỀN VIETQR (FLOW 5 BƯỚC & AUDIT LOG CHI TIẾT) */}
        {activeTab === "payouts" && (
          <PayoutManagementModule
            payoutRequests={payoutRequests}
            onUpdatePayoutRequest={onUpdatePayoutRequest || (() => {})}
            currentRole="admin"
            currentUserFullName={ctvUser.name || "Nguyễn Thị B"}
          />
        )}

        {/* TAB 3: BẢNG GIÁ DỊCH VỤ — GIỐNG HỆT TRANG BẢNG DỊCH VỤ CỦA CTV + CRUD ADMIN */}
        {activeTab === "services" && (
          <ServiceCatalog
            services={services}
            isAdmin={true}
            onBookAppointment={(srvName, notes) => {
              if (onBookAppointment) {
                onBookAppointment(srvName, notes || "");
              }
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

        {/* TAB 4: FEEDBACK & ẢNH TRƯỚC/SAU LÂM SÀNG (CRUD ADMIN) */}
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

        {/* TAB 7: CÀI ĐẶT HỆ THỐNG, CẤU HÌNH LOGO, TÀI KHOẢN & PHÂN QUYỀN CRUD */}
        {activeTab === "settings" && (
          <SystemSettingsModule
            ctvUser={ctvUser}
            onToast={(msg) => alert(msg)}
          />
        )}

      </div>

    </div>
  );
};
