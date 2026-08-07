import React, { useState } from "react";
import { Appointment, CTVUser, ServiceItem } from "../types";
import { AuthUserProfile } from "../lib/supabase";
import { SERVICES_DATA } from "../data/aestheticData";
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
  Pencil,
  Trash2,
  Check,
  DollarSign,
  AlertTriangle,
  ShoppingBag
} from "lucide-react";

import { formatDateVN, formatCurrencyInput } from "../utils/formatters";

interface CRMAppointmentProps {
  appointments: Appointment[];
  services?: ServiceItem[];
  onAddAppointment: (newApt: Appointment) => void;
  onUpdateAppointment?: (updatedApt: Appointment) => void;
  onDeleteAppointment?: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: Appointment["status"]) => void;
  initialServiceName?: string;
  initialNotes?: string;
  ctvUser?: CTVUser;
  authUser?: AuthUserProfile;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

const convertVNToIsoDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return dateStr.split(" ")[0];
};

const isValidMediaUrl = (url?: string): boolean => {
  if (!url) return false;
  if (url.endsWith("...")) return false; // Loại bỏ các chuỗi media bị cắt dở
  return true;
};

const compressImageDataUrl = (dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
};

export const CRMAppointment: React.FC<CRMAppointmentProps> = ({
  appointments,
  services,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onUpdateStatus,
  initialServiceName,
  initialNotes,
  ctvUser,
  authUser,
  isAdmin,
  onRefresh
}) => {
  const catalogServices = services && services.length > 0 ? services : SERVICES_DATA;

  const [showModal, setShowModal] = useState(Boolean(initialServiceName));
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Smart Search & Multi-Service selection state
  const [selectedServiceItems, setSelectedServiceItems] = useState<ServiceItem[]>([]);
  const [serviceSearchInput, setServiceSearchInput] = useState("");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("ALL");
  const [showServicePicker, setShowServicePicker] = useState(false);

  const currentCtvCode = (ctvUser?.code || authUser?.ctvCode || "").trim().toLowerCase();
  const currentPhone = (authUser?.phone || ctvUser?.phone || "").trim().replace(/\D/g, "");
  const currentUserName = (authUser?.fullName || ctvUser?.name || "").trim().toLowerCase();
  const currentUserId = (authUser?.id || ctvUser?.id || "").trim().toLowerCase();
  const currentUserEmail = (authUser?.email || "").trim().toLowerCase();

  // CTV CHỈ xem lịch hẹn do chính mình tạo
  const personalAppointments = appointments.filter((apt) => {
    const aptCode = (apt.ctvCode || "").trim().toLowerCase();
    const aptName = (apt.ctvName || "").trim().toLowerCase();
    const aptCtvPhone = (apt.ctvPhone || "").trim().replace(/\D/g, "");
    const aptCtvId = ((apt as any).ctvId || (apt as any).userId || "").trim().toLowerCase();

    const matchesCode = Boolean(currentCtvCode && aptCode && (aptCode === currentCtvCode || aptCode.includes(currentCtvCode) || currentCtvCode.includes(aptCode)));
    const matchesName = Boolean(
      (currentUserName && aptName && (aptName === currentUserName || aptName.includes(currentUserName) || currentUserName.includes(aptName))) ||
      (currentUserEmail && aptName && aptName.includes(currentUserEmail))
    );
    const matchesPhone = Boolean(currentPhone && aptCtvPhone && (aptCtvPhone === currentPhone || (currentPhone.length >= 9 && aptCtvPhone.endsWith(currentPhone.slice(-9)))));
    const matchesId = Boolean(currentUserId && aptCtvId && aptCtvId === currentUserId);

    return matchesCode || matchesName || matchesPhone || matchesId;
  });

  // Admin & Kế toán xem toàn bộ; CTV chỉ xem lịch hẹn chính mình
  const isUserAdmin = Boolean(
    isAdmin ||
    authUser?.role === "admin" ||
    authUser?.role === "accountant" ||
    ctvUser?.role === "admin" ||
    ctvUser?.role === "accountant" ||
    ctvUser?.code?.toLowerCase().includes("admin") ||
    authUser?.ctvCode?.toLowerCase().includes("admin")
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
    appointmentType: "Lịch tư vấn" as "Lịch tư vấn" | "Lịch tái khám",
    status: "Chờ xác nhận" as Appointment["status"]
  });

  // Open modal for NEW appointment
  const handleOpenCreateModal = () => {
    setEditingAppointment(null);
    setSelectedServiceItems([]);
    setServiceSearchInput("");
    setServiceCategoryFilter("ALL");
    setForm({
      customerName: "",
      customerPhone: "",
      serviceName: initialServiceName || "Nâng Ngực Nội Soi Ergonomix Nano 6D",
      doctorName: "Bs. CKII Nguyễn Văn Hùng",
      date: new Date().toISOString().split("T")[0],
      time: "09:00 AM",
      notes: initialNotes || "",
      ctvCode: ctvUser?.code || authUser?.ctvCode || "",
      customerMedia: "",
      customerMediaType: "image",
      appointmentType: "Lịch tư vấn",
      status: "Chờ xác nhận"
    });
    setShowModal(true);
  };

  // Open modal for EDITING existing appointment
  const handleOpenEditModal = (apt: Appointment) => {
    setEditingAppointment(apt);
    setServiceSearchInput("");
    setServiceCategoryFilter("ALL");

    // Match existing service names with catalog items
    const rawServices = (apt.serviceName || "").split(/\s*\+\s*|\s*,\s*/);
    const matched = catalogServices.filter((srv) =>
      rawServices.some((rs) => rs.toLowerCase().trim() === srv.name.toLowerCase().trim() || srv.name.toLowerCase().includes(rs.toLowerCase().trim()))
    );
    setSelectedServiceItems(matched);

    setForm({
      customerName: apt.customerName || "",
      customerPhone: apt.customerPhone || "",
      serviceName: apt.serviceName || "",
      doctorName: apt.doctorName || "Bs. CKII Nguyễn Văn Hùng",
      date: convertVNToIsoDate(apt.date),
      time: apt.time || "09:00 AM",
      notes: apt.notes || "",
      ctvCode: apt.ctvCode || ctvUser?.code || authUser?.ctvCode || "",
      customerMedia: apt.customerMedia || "",
      customerMediaType: apt.customerMediaType || "image",
      appointmentType: apt.appointmentType || "Lịch tư vấn",
      status: apt.status || "Chờ xác nhận"
    });
    setShowModal(true);
  };

  // Toggle multi-service selection from smart search
  const toggleSelectService = (service: ServiceItem) => {
    let updated: ServiceItem[];
    const isAlreadySelected = selectedServiceItems.some((s) => s.id === service.id);
    if (isAlreadySelected) {
      updated = selectedServiceItems.filter((s) => s.id !== service.id);
    } else {
      updated = [...selectedServiceItems, service];
    }
    setSelectedServiceItems(updated);

    const combinedNames = updated.map((s) => s.name).join(" + ");
    setForm((prev) => ({
      ...prev,
      serviceName: combinedNames || prev.serviceName
    }));
  };

  const removeSelectedService = (serviceId: string) => {
    const updated = selectedServiceItems.filter((s) => s.id !== serviceId);
    setSelectedServiceItems(updated);
    const combinedNames = updated.map((s) => s.name).join(" + ");
    setForm((prev) => ({
      ...prev,
      serviceName: combinedNames
    }));
  };

  // Filter catalog services in smart search
  const filteredSmartServices = catalogServices.filter((srv) => {
    const matchesCategory = serviceCategoryFilter === "ALL" || srv.category === serviceCategoryFilter;
    const term = serviceSearchInput.toLowerCase().trim();
    const matchesSearch = !term ||
      srv.name.toLowerCase().includes(term) ||
      (srv.categoryName && srv.categoryName.toLowerCase().includes(term)) ||
      (srv.description && srv.description.toLowerCase().includes(term)) ||
      String(srv.price).includes(term);
    return matchesCategory && matchesSearch;
  });

  const totalEstimatedCost = selectedServiceItems.reduce((acc, curr) => acc + curr.price, 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawData = (event.target?.result as string) || "";
      if (!isVideo && rawData.startsWith("data:image")) {
        const compressed = await compressImageDataUrl(rawData);
        setForm((prev) => ({
          ...prev,
          customerMedia: compressed,
          customerMediaType: "image"
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          customerMedia: rawData,
          customerMediaType: isVideo ? "video" : "image"
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone) return;

    const assignedCtvCode = form.ctvCode || ctvUser?.code || authUser?.ctvCode || "";
    const ctvUserId = authUser?.id || ctvUser?.id || "";

    const finalServiceName = form.serviceName || (selectedServiceItems.length > 0 ? selectedServiceItems.map(s => s.name).join(" + ") : "Dịch Vụ Thẩm Mỹ");

    if (editingAppointment) {
      // EDIT MODE
      const updatedApt: Appointment = {
        ...editingAppointment,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        serviceName: finalServiceName,
        doctorName: form.doctorName,
        date: formatDateVN(form.date),
        time: form.time,
        status: form.status,
        appointmentType: form.appointmentType,
        notes: form.notes,
        ctvCode: assignedCtvCode || editingAppointment.ctvCode,
        customerMedia: form.customerMedia,
        customerMediaType: form.customerMediaType
      };

      (updatedApt as any).ctvId = ctvUserId;
      (updatedApt as any).userId = ctvUserId;

      if (onUpdateAppointment) {
        onUpdateAppointment(updatedApt);
      } else {
        onAddAppointment(updatedApt);
      }

      if (editingAppointment.status !== form.status) {
        onUpdateStatus(editingAppointment.id, form.status);
        notifyAppointmentStatusChanged({ ...updatedApt, ctvId: ctvUserId }, form.status);
        notifyZaloAppointmentStatusChanged(updatedApt, form.status, authUser?.zaloChatId || ctvUser?.zaloChatId);
      }
    } else {
      // CREATE MODE
      const newApt: Appointment = {
        id: `apt-${Date.now()}`,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        serviceName: finalServiceName,
        doctorName: form.doctorName,
        date: formatDateVN(form.date),
        time: form.time,
        status: form.status,
        appointmentType: form.appointmentType,
        notes: form.notes,
        ctvCode: assignedCtvCode,
        ctvName: authUser?.fullName || ctvUser?.name || authUser?.email || "CTV",
        ctvPhone: authUser?.phone || ctvUser?.phone || "",
        customerMedia: form.customerMedia,
        customerMediaType: form.customerMediaType
      };

      (newApt as any).ctvId = ctvUserId;
      (newApt as any).userId = ctvUserId;

      onAddAppointment(newApt);
      notifyAppointmentCreated({ ...newApt, ctvId: ctvUserId });
      notifyZaloAppointmentCreated(newApt, authUser?.zaloChatId || ctvUser?.zaloChatId);
    }

    setShowModal(false);
    setEditingAppointment(null);
    setSelectedServiceItems([]);
    setPatientSearchTerm("");
    setShowPatientDropdown(false);
  };

  // Confirm and delete appointment
  const handleConfirmDelete = () => {
    if (!deletingAppointmentId) return;
    if (onDeleteAppointment) {
      onDeleteAppointment(deletingAppointmentId);
    }
    setDeletingAppointmentId(null);
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
      
      {/* Module Banner Header - Nền gradient giống Header */}
      {!isUserAdmin && (
        <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-blue-900/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-[#0B192C] flex items-center justify-center font-bold shadow-md shrink-0">
              <Stethoscope className="w-6 h-6 text-[#0B192C]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black uppercase tracking-wide text-white">Quản Lý Lịch Hẹn</h2>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                  CRM THÔNG MINH
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">Theo dõi phác đồ khám, chọn nhiều dịch vụ trong bảng giá, chỉnh sửa lịch hẹn & quản lý CRM</p>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="w-full md:w-auto bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] font-black px-5 py-3 rounded-2xl transition shadow-lg text-xs flex items-center justify-center gap-2 shrink-0 self-center"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Đặt Lịch Hẹn Mới
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
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
              onClick={handleOpenCreateModal}
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

      {/* Appointments Grid List */}
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
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${statusConfig.bg}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info & Direct Contact Actions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-black text-base text-slate-900">{apt.customerName}</h4>
                      
                      {/* Action Buttons: Edit (CTV & Admin) & Delete (Admin Only) */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Edit Button for BOTH CTV and Admin */}
                        <button
                          onClick={() => handleOpenEditModal(apt)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-xs"
                          title="Chỉnh sửa lịch hẹn"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-600" />
                          <span>Sửa</span>
                        </button>

                        {/* Delete Button for ADMIN ONLY */}
                        {isUserAdmin && (
                          <button
                            onClick={() => setDeletingAppointmentId(apt.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-xs"
                            title="Xóa lịch hẹn vĩnh viễn (Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Customer Phone + Call & Zalo Action Buttons */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-800 font-mono font-extrabold truncate">
                        <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{apt.customerPhone}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${cleanPhone || apt.customerPhone}`}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
                          title="Gọi Điện Trực Tiếp"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Gọi</span>
                        </a>

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
                  {apt.customerMedia && isValidMediaUrl(apt.customerMedia) && (
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
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Dịch vụ thẩm mỹ đã chọn:</span>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {apt.serviceName.split(/\s*\+\s*|\s*,\s*/).map((srvName, idx) => (
                          <span key={idx} className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black px-2.5 py-1 rounded-lg">
                            ✨ {srvName.trim()}
                          </span>
                        ))}
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

                  {/* CTV Contact Box */}
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
                      const aptWithCtvInfo = {
                        ...apt,
                        ctvId: (apt as any).ctvId || (apt as any).userId || "",
                      };
                      const targetChatId = authUser?.zaloChatId || ctvUser?.zaloChatId;
                      notifyZaloAppointmentStatusChanged(aptWithCtvInfo, newStatus, targetChatId);
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
              onClick={handleOpenCreateModal}
              className="bg-amber-500 text-[#0B192C] px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
            >
              + Đặt Lịch Hẹn Mới
            </button>
          </div>
        )}
      </div>

      {/* BOOKING / EDIT MODAL - WITH SMART MULTI-SERVICE SELECTION */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                {editingAppointment ? "Chỉnh Sửa Lịch Hẹn CRM" : "Đặt Lịch Hẹn Khám & Tư Vấn Thẩm Mỹ"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingAppointment(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs font-medium">
              {/* 1. LOẠI LỊCH HẸN */}
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

              {/* 2. HỌ TÊN & SỐ ĐIỆN THOẠI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </div>

              {/* 3. SMART MULTI-SERVICE SELECTION INPUT (BẢNG GIÁ DỊCH VỤ) */}
              <div className="bg-amber-50/80 border border-amber-200/90 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-amber-900 font-extrabold text-xs flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <span>Chọn Nhiều Dịch Vụ Từ Bảng Giá Niêm Yết:</span>
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    Đã chọn {selectedServiceItems.length} dịch vụ
                  </span>
                </div>

                {/* Smart Service Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh dịch vụ trong bảng giá (tên, danh mục, giá tiền)..."
                    value={serviceSearchInput}
                    onFocus={() => setShowServicePicker(true)}
                    onChange={(e) => {
                      setServiceSearchInput(e.target.value);
                      setShowServicePicker(true);
                    }}
                    className="w-full bg-white border border-amber-300 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                  {serviceSearchInput && (
                    <button
                      type="button"
                      onClick={() => setServiceSearchInput("")}
                      className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filter Chips for Smart Search */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: "ALL", label: "Tất cả" },
                    { id: "phau-thuat", label: "Phẫu Thuật" },
                    { id: "da-lieu", label: "Da Liễu" },
                    { id: "tre-hoa", label: "Trẻ Hóa" },
                    { id: "voc-dang", label: "Vóc Dáng" }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setServiceCategoryFilter(cat.id);
                        setShowServicePicker(true);
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                        serviceCategoryFilter === cat.id
                          ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                          : "bg-white border-amber-200 text-slate-700 hover:bg-amber-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Dropdown list of catalog services for multi-selection */}
                {showServicePicker && (
                  <div className="bg-white border border-amber-200 rounded-2xl shadow-xl p-2 max-h-56 overflow-y-auto space-y-1 z-20">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-[10px] font-extrabold text-slate-500 uppercase">
                      <span>Tích chọn dịch vụ mong muốn:</span>
                      <button
                        type="button"
                        onClick={() => setShowServicePicker(false)}
                        className="text-amber-700 hover:underline"
                      >
                        Đóng danh sách
                      </button>
                    </div>

                    {filteredSmartServices.length > 0 ? (
                      filteredSmartServices.map((srv) => {
                        const isSelected = selectedServiceItems.some((s) => s.id === srv.id);
                        return (
                          <div
                            key={srv.id}
                            onClick={() => toggleSelectService(srv)}
                            className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between border ${
                              isSelected
                                ? "bg-amber-50 border-amber-400 shadow-xs"
                                : "bg-white border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected ? "bg-amber-500 border-amber-600 text-[#0B192C]" : "border-slate-300 bg-white"
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 text-xs truncate">{srv.name}</div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {srv.categoryName || srv.category} • <span className="font-mono text-emerald-700 font-bold">{formatCurrencyInput(srv.price)} VNĐ</span>
                                </div>
                              </div>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isSelected ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600"
                            }`}>
                              {isSelected ? "Đã chọn" : "+ Thêm"}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 font-medium">
                        Không tìm thấy dịch vụ phù hợp từ khóa
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Service Badges */}
                {selectedServiceItems.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-600 font-extrabold block">Các dịch vụ đã chọn:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedServiceItems.map((srv) => (
                        <span
                          key={srv.id}
                          className="bg-white border border-amber-400 text-amber-900 text-[11px] font-extrabold px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1.5"
                        >
                          <span>{srv.name}</span>
                          <span className="font-mono text-[10px] text-emerald-700">({formatCurrencyInput(srv.price)}đ)</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedService(srv.id)}
                            className="hover:bg-rose-100 hover:text-rose-700 rounded-full p-0.5 text-slate-400 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {totalEstimatedCost > 0 && (
                      <div className="flex items-center justify-between text-xs font-black text-amber-900 bg-white p-2 rounded-xl border border-amber-300 mt-2">
                        <span>Tổng chi phí dự kiến ({selectedServiceItems.length} dịch vụ):</span>
                        <span className="font-mono text-emerald-700 text-sm">
                          {formatCurrencyInput(totalEstimatedCost)} VNĐ
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Combined Custom Service Text Input */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Tên Dịch Vụ Niêm Yết Tổng Hợp (Tự động cập nhật hoặc chỉnh sửa thủ công):
                  </label>
                  <input
                    type="text"
                    value={form.serviceName}
                    onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                    className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-amber-900 font-extrabold focus:outline-none focus:border-amber-500 text-xs shadow-xs"
                  />
                </div>
              </div>

              {/* 4. CHỌN BÁC SĨ & KHUNG GIỜ & NGÀY KHÁM */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Chọn Bác Sĩ:</label>
                  <select
                    value={form.doctorName}
                    onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500 text-xs"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ngày Khám Dự Kiến:</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Trạng Thái CRM (*):</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-amber-300 rounded-xl p-2.5 text-amber-900 font-extrabold focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="Chờ xác nhận">⏳ Chờ xác nhận</option>
                    <option value="Đã xác nhận">✅ Đã xác nhận</option>
                    <option value="Đang điều trị">🏥 Đang điều trị</option>
                    <option value="Hoàn thành">🎉 Hoàn thành</option>
                    <option value="Đã hủy">❌ Đã hủy</option>
                  </select>
                </div>
              </div>

              {/* 5. TẢI media VỀ TÌNH TRẠNG */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-800">
                    <Upload className="w-4 h-4 text-amber-600" /> Tải Ảnh Hoặc Video Tình Trạng Hiện Tại Của Khách:
                  </span>
                </label>

                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-3 text-center space-y-2">
                  {form.customerMedia && isValidMediaUrl(form.customerMedia) ? (
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

              {/* GHI CHÚ */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Ghi Chú Yêu Cầu Từ Khách Hàng:</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Nhập mong muốn của khách (ví dụ: dáng S-Line tự nhiên)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* FOOTER ACTION BUTTONS */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAppointment(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-[#0B192C] font-black rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingAppointment ? "Lưu Cập Nhật Lịch Hẹn" : "Xác Nhận Đặt Lịch CRM"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL (ADMIN ONLY) */}
      {deletingAppointmentId && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Xác Nhận Xóa Lịch Hẹn</h3>
                <p className="text-xs text-slate-500 font-medium">Hành động này không thể hoàn tác trên hệ thống</p>
              </div>
            </div>

            {(() => {
              const target = appointments.find((a) => a.id === deletingAppointmentId);
              if (!target) return null;
              return (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-1.5 text-xs text-slate-800">
                  <div className="font-black text-slate-900 text-sm">👤 {target.customerName}</div>
                  <div className="font-mono font-bold text-slate-600">📞 SĐT: {target.customerPhone}</div>
                  <div className="font-medium text-slate-700">✨ Dịch vụ: <span className="font-bold text-amber-900">{target.serviceName}</span></div>
                  <div className="font-medium text-slate-600">🏥 Bác sĩ: {target.doctorName} ({formatDateVN(target.date)})</div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAppointmentId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác Nhận Xóa Vĩnh Viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
