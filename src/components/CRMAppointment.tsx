import React, { useState } from "react";
import { Appointment, CTVUser } from "../types";
import { AuthUserProfile } from "../lib/supabase";
import { notifyAppointmentCreated, notifyAppointmentStatusChanged } from "../lib/onesignal";
import { notifyZaloAppointmentCreated, notifyZaloAppointmentStatusChanged } from "../services/zaloService";
import { 
  Calendar, 
  Clock, 
  UserCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  User, 
  Stethoscope,
  X,
  Filter,
  Sparkles,
  ShieldCheck,
  Save,
  Tag,
  Upload,
  Video,
  Image as ImageIcon,
  MessageCircle,
  PhoneCall,
  Globe
} from "lucide-react";

import { formatDateVN } from "../utils/formatters";

interface CRMAppointmentProps {
  appointments: Appointment[];
  onAddAppointment: (newApt: Appointment) => void;
  onUpdateStatus: (id: string, newStatus: Appointment["status"]) => void;
  initialServiceName?: string;
  initialNotes?: string;
  ctvUser?: CTVUser;
  authUser?: AuthUserProfile;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

export const CRMAppointment: React.FC<CRMAppointmentProps> = ({
  appointments,
  onAddAppointment,
  onUpdateStatus,
  initialServiceName,
  initialNotes,
  ctvUser,
  authUser,
  isAdmin,
  onRefresh
}) => {
  const [showModal, setShowModal] = useState(Boolean(initialServiceName));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const currentCtvCode = (ctvUser?.code || authUser?.ctvCode || "").trim().toLowerCase();
  const currentPhone = (authUser?.phone || ctvUser?.phone || "").trim().replace(/\D/g, "");
  const currentUserName = (authUser?.fullName || ctvUser?.name || "").trim().toLowerCase();
  const currentUserId = (authUser?.id || ctvUser?.id || "").trim().toLowerCase();
  const currentUserEmail = (authUser?.email || "").trim().toLowerCase();

  // CTV xem lịch hẹn do chính mình tạo (khớp theo Mã CTV, Tên CTV, SĐT CTV, User ID hoặc lịch chưa gán)
  const personalAppointments = appointments.filter((apt) => {
    const aptCode = (apt.ctvCode || "").trim().toLowerCase();
    const aptName = (apt.ctvName || "").trim().toLowerCase();
    const aptCtvPhone = (apt.ctvPhone || "").trim().replace(/\D/g, "");
    const aptCtvId = ((apt as any).ctvId || (apt as any).userId || "").trim().toLowerCase();

    // Match theo Mã CTV
    const matchesCode = Boolean(currentCtvCode && aptCode && (aptCode === currentCtvCode || aptCode.includes(currentCtvCode) || currentCtvCode.includes(aptCode)));
    
    // Match theo Tên CTV hoặc Email
    const matchesName = Boolean(
      (currentUserName && aptName && (aptName === currentUserName || aptName.includes(currentUserName) || currentUserName.includes(aptName))) ||
      (currentUserEmail && aptName && aptName.includes(currentUserEmail))
    );
    
    // Match theo SĐT CTV
    const matchesPhone = Boolean(currentPhone && aptCtvPhone && (aptCtvPhone === currentPhone || (currentPhone.length >= 9 && aptCtvPhone.endsWith(currentPhone.slice(-9)))));
    
    // Match theo User ID / CTV ID
    const matchesId = Boolean(currentUserId && aptCtvId && aptCtvId === currentUserId);

    // Fallback: nếu lịch mới tạo chưa gắn mã CTV cụ thể hoặc để tên mặc định
    const isGenericApt = !aptCode || aptName === "ctv" || aptName === "cộng tác viên" || aptName === "";

    return matchesCode || matchesName || matchesPhone || matchesId || isGenericApt;
  });

  // Admin & Kế toán có quyền xem toàn bộ Lịch Hẹn hệ thống
  const isUserAdmin = Boolean(
    isAdmin ||
    authUser?.role === "admin" ||
    authUser?.role === "accountant"
  );

  const activeSourceList = isUserAdmin ? appointments : personalAppointments;

  // Booking Form State
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    serviceName: initialServiceName || "Nâng Ngực Nội Soi Ergonomix Nano 6D",
    doctorName: "Bs. CKII Nguyễn Văn Hùng",
    date: new Date().toISOString().split("T")[0],
    time: "09:00 AM",
    notes: initialNotes || "",
    ctvCode: ctvUser?.code || authUser?.ctvCode || "",
    customerMedia: "",
    customerMediaType: "image" as "image" | "video",
    appointmentType: "Lịch tư vấn" as "Lịch tư vấn" | "Lịch tái khám"
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((prev) => ({
        ...prev,
        customerMedia: event.target?.result as string,
        customerMediaType: isVideo ? "video" : "image"
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone) return;

    const assignedCtvCode = form.ctvCode || ctvUser?.code || authUser?.ctvCode || "";

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      serviceName: form.serviceName,
      doctorName: form.doctorName,
      date: formatDateVN(form.date),
      time: form.time,
      status: "Chờ xác nhận",
      appointmentType: form.appointmentType,
      notes: form.notes,
      ctvCode: assignedCtvCode,
      ctvName: authUser?.fullName || ctvUser?.name || authUser?.email || "CTV",
      ctvPhone: authUser?.phone || ctvUser?.phone || "",
      customerMedia: form.customerMedia,
      customerMediaType: form.customerMediaType
    };

    onAddAppointment(newApt);
    notifyAppointmentCreated({
      ...newApt,
      ctvId: authUser?.id || ctvUser?.id || ""
    });

    const userZaloChatId = authUser?.zaloChatId || ctvUser?.zaloChatId;
    notifyZaloAppointmentCreated(newApt, userZaloChatId);

    setShowModal(false);
    // Reset form
    setForm({
      customerName: "",
      customerPhone: "",
      serviceName: "Nâng Ngực Nội Soi Ergonomix Nano 6D",
      doctorName: "Bs. CKII Nguyễn Văn Hùng",
      date: new Date().toISOString().split("T")[0],
      time: "09:00 AM",
      notes: "",
      ctvCode: ctvUser?.code || authUser?.ctvCode || "",
      customerMedia: "",
      customerMediaType: "image",
      appointmentType: "Lịch tư vấn"
    });
    setPatientSearchTerm("");
    setShowPatientDropdown(false);
  };

  const consultationPatients = React.useMemo(() => {
    const map = new Map<string, Appointment>();
    activeSourceList.forEach((apt) => {
      if (apt.appointmentType === "Lịch tư vấn" || !apt.appointmentType) {
        const key = (apt.customerPhone || apt.customerName).trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, apt);
        }
      }
    });
    return Array.from(map.values());
  }, [activeSourceList]);

  const filteredConsultationPatients = consultationPatients.filter((apt) => {
    if (!patientSearchTerm) return true;
    const term = patientSearchTerm.toLowerCase();
    return (
      apt.customerName.toLowerCase().includes(term) ||
      apt.customerPhone.includes(term) ||
      apt.serviceName.toLowerCase().includes(term)
    );
  });

  const filteredAppointments = activeSourceList.filter((apt) => {
    const matchesSearch =
      apt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.customerPhone.includes(searchTerm) ||
      (apt.ctvCode && apt.ctvCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || apt.status === statusFilter;
    const matchesType = typeFilter === "ALL" || (apt.appointmentType || "Lịch tư vấn") === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      
      {/* Module Banner Header - ẩn khi trong Admin Dashboard */}
      {!isUserAdmin && (
        <div className="bg-[#0B192C] text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-[#0B192C] flex items-center justify-center font-bold shadow-md shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black uppercase tracking-wide text-white">Quản Lý Lịch Hẹn & Khám Lâm Sàng</h2>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-400/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                  CRM THÔNG MINH
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">Theo dõi phác đồ khám, gọi điện tư vấn, chat Zalo trực tiếp & xem hình ảnh/video hiện tại của khách hàng</p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] font-black px-4 py-2.5 rounded-2xl transition shadow-lg text-xs flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Đặt Lịch Hẹn Mới
          </button>
        </div>
      )}

      {/* Filter & Search Bar - Light Theme */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-sm">
        
        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-amber-600" /> Bộ Lọc & Tìm Kiếm Lịch Hẹn CRM:
          </span>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold hover:bg-blue-100 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                Làm mới
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] font-black text-[11px] shadow-sm transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo Lịch Hẹn Mới
            </button>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              {filteredAppointments.length} Lịch Hẹn Đặt Khám
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Keyword Search Input Bar */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Tìm theo tên khách hàng, số điện thoại, tên dịch vụ hoặc bác sĩ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs transition placeholder:font-medium placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-700 bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Appointment Type Dropdown Filter */}
          <div className="md:col-span-3 relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">📋 Tất cả loại lịch hẹn</option>
              <option value="Lịch tư vấn">💬 Lịch tư vấn</option>
              <option value="Lịch tái khám">🔄 Lịch tái khám</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3 relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">✨ Tất cả trạng thái</option>
              <option value="Chờ xác nhận">⏳ Chờ xác nhận</option>
              <option value="Đã xác nhận">✅ Đã xác nhận</option>
              <option value="Đang điều trị">🏥 Đang thăm khám</option>
              <option value="Hoàn thành">🎉 Hoàn thành</option>
              <option value="Đã hủy">❌ Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Grid List - Professional Light Theme Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((apt) => {
            const statusConfig = {
              "Đã xác nhận": { bg: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "Đã xác nhận" },
              "Chờ xác nhận": { bg: "bg-amber-100 text-amber-800 border-amber-300", label: "Chờ xác nhận" },
              "Đang điều trị": { bg: "bg-blue-100 text-blue-800 border-blue-300", label: "Đang thăm khám" },
              "Hoàn thành": { bg: "bg-teal-100 text-teal-800 border-teal-300", label: "Hoàn thành" },
              "Đã hủy": { bg: "bg-rose-100 text-rose-800 border-rose-300", label: "Đã hủy" }
            }[apt.status] || { bg: "bg-slate-100 text-slate-700 border-slate-300", label: apt.status };

            // Sanitize phone for Zalo link (e.g. 0903888112)
            const cleanPhone = apt.customerPhone.replace(/\D/g, "");

            return (
              <div
                key={apt.id}
                className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl p-5 text-slate-900 space-y-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Card Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-amber-700 font-black font-mono text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      {apt.id}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${statusConfig.bg}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Customer Info & Direct Contact Actions */}
                  <div className="space-y-2">
                    <h4 className="font-black text-base text-slate-900">{apt.customerName}</h4>
                    
                    {/* Customer Phone + Call & Zalo Action Buttons */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-800 font-mono font-extrabold truncate">
                        <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{apt.customerPhone}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Call Button */}
                        <a
                          href={`tel:${cleanPhone || apt.customerPhone}`}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
                          title="Gọi Điện Trực Tiếp"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Gọi</span>
                        </a>

                        {/* Zalo Button */}
                        <a
                          href={`https://zalo.me/${cleanPhone || apt.customerPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black px-2.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
                          title="Mở Chat Zalo Với Khách Hàng"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Zalo</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Customer Current Photo/Video Media Preview */}
                  {apt.customerMedia && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                        <span className="flex items-center gap-1 text-amber-700">
                          {apt.customerMediaType === "video" ? <Video className="w-3 h-3 text-rose-500" /> : <ImageIcon className="w-3 h-3 text-blue-500" />}
                          Ảnh / Video Hiện Tại Của Khách:
                        </span>
                      </div>
                      
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-900 group">
                        {apt.customerMediaType === "video" || (apt.customerMedia && apt.customerMedia.startsWith("data:video")) ? (
                          <video
                            src={apt.customerMedia}
                            controls
                            className="w-full h-36 object-cover"
                          />
                        ) : (
                          <img
                            src={apt.customerMedia}
                            alt={`Khách hàng ${apt.customerName}`}
                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Service & Doctor Box */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-2 font-medium">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Dịch vụ thẩm mỹ:</span>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="font-black text-slate-900 text-xs leading-snug">{apt.serviceName}</span>
                        {apt.appointmentType && (
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            apt.appointmentType === "Lịch tư vấn"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {apt.appointmentType === "Lịch tư vấn" ? "💬" : "🔄"} {apt.appointmentType}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="text-slate-500 font-bold">Bác sĩ phụ trách:</span>
                      <span className="font-bold text-amber-800 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" /> {apt.doctorName}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold">Thời gian hẹn:</span>
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {formatDateVN(apt.date)} - {apt.time}
                      </span>
                    </div>
                  </div>

                  {/* CTV Contact Box - Contact info & Direct Call/Zalo Buttons for CTV */}
                  {(() => {
                    const ctvPhone = apt.ctvPhone || "";
                    const cleanCtvPhone = ctvPhone.replace(/\D/g, "");
                    const ctvName = apt.ctvName || "Cộng Tác Viên";
                    const ctvCode = apt.ctvCode || "SAOHAN-CTV";

                    return (
                      <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-blue-900 font-extrabold uppercase tracking-wide flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-blue-600" /> CTV Giới Thiệu:
                          </span>
                          <span className="font-mono text-[10px] font-black text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                            {ctvCode}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-blue-100">
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-xs truncate">{ctvName}</div>
                            <div className="text-[11px] text-blue-700 font-mono font-bold flex items-center gap-1">
                              <Phone className="w-3 h-3 text-blue-500 shrink-0" /> {ctvPhone}
                            </div>
                          </div>

                          {/* Direct Contact Actions for CTV */}
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`tel:${cleanCtvPhone}`}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-2 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                              title="Gọi điện trực tiếp cho CTV"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>Gọi CTV</span>
                            </a>

                            <a
                              href={`https://zalo.me/${cleanCtvPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-2 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                              title="Chat Zalo với CTV"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>Zalo CTV</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes */}
                  {apt.notes && (
                    <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl text-[11px] text-slate-700 italic font-medium leading-relaxed">
                      "{apt.notes}"
                    </div>
                  )}
                </div>

                {/* Quick Status Update Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 -mx-5 -mb-5 p-3 rounded-b-3xl">
                  <span className="text-slate-600 font-extrabold text-[11px]">Đổi trạng thái CRM:</span>
                  <select
                    value={apt.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as any;
                      notifyAppointmentStatusChanged(
                        { ...apt, ctvId: authUser?.id || ctvUser?.id },
                        newStatus
                      );
                      const targetChatId = authUser?.zaloChatId || ctvUser?.zaloChatId;
                      notifyZaloAppointmentStatusChanged(apt, newStatus, targetChatId);
                      onUpdateStatus(apt.id, newStatus);
                    }}
                    className="bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-xs font-black text-amber-900 focus:outline-none focus:border-amber-500 shadow-xs cursor-pointer"
                  >
                    <option value="Chờ xác nhận">⏳ Chờ xác nhận</option>
                    <option value="Đã xác nhận">✅ Đã xác nhận</option>
                    <option value="Đang điều trị">🏥 Đang điều trị</option>
                    <option value="Hoàn thành">🎉 Hoàn thành</option>
                    <option value="Đã hủy">❌ Đã hủy</option>
                  </select>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs font-medium space-y-3 shadow-xs">
            <p>Không tìm thấy lịch hẹn khám nào phù hợp với bộ lọc.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-amber-500 text-[#0B192C] px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
            >
              + Đặt Lịch Hẹn Mới
            </button>
          </div>
        )}
      </div>

      {/* BOOKING MODAL - WITH IMAGE/VIDEO UPLOAD & PHONE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" /> Đặt Lịch Hẹn Khám & Tư Vấn Thẩm Mỹ
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs font-medium">
              {/* 1. LOẠI LỊCH HẸN (ĐƯA LÊN TRÊN CÙNG) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Loại Lịch Hẹn (*):</label>
                <div className="flex gap-2">
                  {(["Lịch tư vấn", "Lịch tái khám"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, appointmentType: type });
                        if (type === "Lịch tư vấn") {
                          setPatientSearchTerm("");
                          setShowPatientDropdown(false);
                        }
                      }}
                      className={`flex-1 py-2.5 rounded-xl border-2 font-extrabold text-xs transition ${
                        form.appointmentType === type
                          ? type === "Lịch tư vấn"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md"
                            : "bg-emerald-600 border-emerald-600 text-white shadow-md"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {type === "Lịch tư vấn" ? "💬" : "🔄"} {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* DROPDOWN TÌM KIẾM BỆNH NHÂN TƯ VẤN (KHI CHỌN LỊCH TÁI KHÁM) */}
              {form.appointmentType === "Lịch tái khám" && (
                <div className="bg-emerald-50/90 border border-emerald-200 p-3 rounded-2xl space-y-2 relative">
                  <label className="block text-emerald-900 font-extrabold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>🔍</span> Chọn Bệnh Nhân Đã Đặt Lịch Tư Vấn:
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      {consultationPatients.length} Bệnh nhân tư vấn
                    </span>
                  </label>

                  <div className="relative">
                    <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Gõ tên hoặc SĐT bệnh nhân đã khám..."
                      value={patientSearchTerm}
                      onFocus={() => setShowPatientDropdown(true)}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientDropdown(true);
                      }}
                      className="w-full bg-white border border-emerald-300 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs"
                    />
                    {patientSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setPatientSearchTerm("");
                          setShowPatientDropdown(true);
                        }}
                        className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    )}

                    {showPatientDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-emerald-200 rounded-2xl shadow-2xl z-30 max-h-52 overflow-y-auto p-1.5 space-y-1">
                        {filteredConsultationPatients.length > 0 ? (
                          filteredConsultationPatients.map((patient) => (
                            <div
                              key={patient.id}
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  customerName: patient.customerName,
                                  customerPhone: patient.customerPhone,
                                  serviceName: patient.serviceName || prev.serviceName,
                                  doctorName: patient.doctorName || prev.doctorName,
                                  customerMedia: patient.customerMedia || prev.customerMedia,
                                  customerMediaType: patient.customerMediaType || prev.customerMediaType
                                }));
                                setPatientSearchTerm(`${patient.customerName} - ${patient.customerPhone}`);
                                setShowPatientDropdown(false);
                              }}
                              className="p-2.5 hover:bg-emerald-50 rounded-xl cursor-pointer transition flex items-center justify-between border border-transparent hover:border-emerald-200"
                            >
                              <div>
                                <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>👤 {patient.customerName}</span>
                                  <span className="font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {patient.customerPhone}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                  Dịch vụ đã tư vấn: <span className="font-bold text-slate-700">{patient.serviceName}</span>
                                </div>
                              </div>
                              <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2.5 py-1 rounded-lg shrink-0 shadow-xs">
                                Chọn
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400 font-medium">
                            Không tìm thấy bệnh nhân tư vấn phù hợp
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Họ & Tên Khách Hàng (*):</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Thanh Vân..."
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Số Điện Thoại Khách Hàng (*):</label>
                <input
                  type="text"
                  required
                  placeholder="0912345678"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload Image/Video Current Status */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-800">
                    <Upload className="w-4 h-4 text-amber-600" /> Tải Ảnh Hoặc Video Tình Trạng Hiện Tại Của Khách:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">(Ảnh PNG/JPG hoặc Video MP4)</span>
                </label>

                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-3 text-center space-y-2">
                  {form.customerMedia ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                      {form.customerMediaType === "video" ? (
                        <video src={form.customerMedia} controls className="w-full h-36 object-cover" />
                      ) : (
                        <img src={form.customerMedia} alt="Xem trước" className="w-full h-36 object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, customerMedia: "" }))}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs shadow-md font-bold"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-2 space-y-1">
                      <Upload className="w-6 h-6 text-amber-500" />
                      <span className="text-xs font-bold text-slate-700">Bấm để tải từ máy ảnh hoặc thư viện</span>
                      <span className="text-[10px] text-slate-400">Hỗ trợ định dạng ảnh và video dung lượng cao</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Dịch Vụ Thẩm Mỹ Đăng Ký:</label>
                <input
                  type="text"
                  value={form.serviceName}
                  onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                  className="w-full bg-slate-50 border border-amber-300 rounded-xl p-2.5 text-amber-900 font-extrabold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Chọn Bác Sĩ:</label>
                  <select
                    value={form.doctorName}
                    onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="Bs. CKII Nguyễn Văn Hùng">Bs. CKII Nguyễn Văn Hùng</option>
                    <option value="Bs. CKI Trần Thị Thu">Bs. CKI Trần Thị Thu</option>
                    <option value="Bs. CKI Phạm Đức Anh">Bs. CKI Phạm Đức Anh</option>
                    <option value="Ths. Bs. Trần Mỹ Linh">Ths. Bs. Trần Mỹ Linh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Khung Giờ Hẹn Khám:</label>
                  <select
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Ngày Khám Dự Kiến:</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Ghi Chú Yêu Cầu Từ Khách Hàng:</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Nhập mong muốn của khách (ví dụ: dáng S-Line tự nhiên)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-[#0B192C] font-black rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Xác Nhận Đặt Lịch CRM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
