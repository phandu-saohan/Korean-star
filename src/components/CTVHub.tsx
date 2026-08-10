import React, { useState, useEffect } from "react";
import { formatCurrencyInput, parseCurrencyInput, formatDateTimeVN } from "../utils/formatters";
import { CTVUser, ReferralLead, ServiceItem, ServiceFeedback, Appointment, AppointmentInvoice, PayoutRequest, TeamRevenueTransfer } from "../types";
import { fetchUserProfileByCtvCode, updateTeamLeaderInSupabase, fetchMyTransferRequestsFromSupabase, fetchLeaderTransferRequestsFromSupabase, updateTransferStatusInSupabase, addRevenueToLeaderInSupabase, deductRevenueFromCtvInSupabase } from "../lib/supabase";
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
  Calendar,
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
  AlertCircle,
  Pencil
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
  onSubTabChange?: (subTab: string) => void;
}

// Lấy danh sách CTV đã đăng ký từ localStorage với chuẩn hóa Họ tên, SĐT, Avatar
function getRegisteredCTVs(leaderCode: string): any[] {
  try {
    const raw = localStorage.getItem("saohan_registered_users");
    if (!raw) return [];
    const all = JSON.parse(raw) as any[];
    const lCode = (leaderCode || "").trim().toUpperCase();

    return all
      .filter((u) => {
        const uLeader = u.teamLeaderId;
        const uCode = (u.ctvCode || u.code || u.ctv_code || "").trim().toUpperCase();
        return uLeader === leaderCode && uCode !== lCode;
      })
      .map((u) => {
        const ctvCode = u.ctvCode || u.code || u.ctv_code || "CTV-UNKNOWN";
        const fullName = u.fullName || u.name || u.displayName || u.user_metadata?.full_name || `CTV ${ctvCode.replace("SAOHAN-", "")}`;
        const phone = u.phone || u.phoneNumber || u.mobile || "Chưa cập nhật SĐT";
        const avatarUrl = u.avatarUrl || u.avatar || u.photoUrl || u.user_metadata?.avatar_url || "";

        return {
          ...u,
          ctvCode,
          fullName,
          phone,
          avatarUrl
        };
      });
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

function parseTransferDate(dateStr: string): { month: number; year: number } | null {
  if (!dateStr) return null;

  // Handles DD/MM/YYYY or DD/MM/YYYY, HH:mm:ss format
  const dmyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && year > 2000) {
      return { month, year };
    }
  }

  // Handles YYYY-MM-DD format
  const ymdMatch = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    if (month >= 1 && month <= 12 && year > 2000) {
      return { month, year };
    }
  }

  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    return { month: parsedDate.getMonth() + 1, year: parsedDate.getFullYear() };
  }

  return null;
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
  onOpenTeamTransferModal,
  onSubTabChange
}) => {
  const PERFORMANCE_DATA = ctvUser.totalRevenue > 0 || ctvUser.successfulReferrals > 0
    ? [
        { month: "Hiện tại", revenue: ctvUser.totalRevenue, commission: ctvUser.totalCommission, referrals: ctvUser.successfulReferrals }
      ]
    : [];
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "services" | "feedbacks" | "team-members" | "team-transfers" | "ctv-transfers" | "my-customers">("overview");

  useEffect(() => {
    onSubTabChange?.(activeSubTab);
  }, [activeSubTab, onSubTabChange]);
  const [customCode, setCustomCode] = useState(ctvUser.code);
  const [customerDiscount, setCustomerDiscount] = useState("10");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Bộ lọc chuyên dụng cho CRM Module Khách Hàng của CTV
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("ALL");
  const [customerMonthFilter, setCustomerMonthFilter] = useState("ALL");
  const [customerYearFilter, setCustomerYearFilter] = useState("ALL");

  // My CTV Revenue Transfers state & Supabase sync
  const [myTransfers, setMyTransfers] = useState<TeamRevenueTransfer[]>(() => {
    try {
      const raw = localStorage.getItem("saohan_team_transfers");
      if (!raw) return [];
      const all: TeamRevenueTransfer[] = JSON.parse(raw);
      const codeUpper = (ctvUser?.code || "").trim().toUpperCase();
      return all.filter((t) => (t.fromCtvCode || "").trim().toUpperCase() === codeUpper);
    } catch {
      return [];
    }
  });

  // Reactive Team Leader local state for instant UI re-render
  const [myTeamLeaderId, setMyTeamLeaderId] = useState<string>(() => ctvUser.teamLeaderId || "");
  const [myTeamName, setMyTeamName] = useState<string>(() => ctvUser.teamName || "");

  useEffect(() => {
    if (ctvUser?.teamLeaderId) setMyTeamLeaderId(ctvUser.teamLeaderId);
    if (ctvUser?.teamName) setMyTeamName(ctvUser.teamName);
  }, [ctvUser?.teamLeaderId, ctvUser?.teamName]);

  useEffect(() => {
    const codeUpper = (ctvUser?.code || "").trim().toUpperCase();
    if (!codeUpper) return;

    // 1. Kiểm tra saohan_registered_users trong LocalStorage
    try {
      const raw = localStorage.getItem("saohan_registered_users");
      if (raw) {
        const all: any[] = JSON.parse(raw);
        const match = all.find((u) => (u.ctvCode || u.code || "").trim().toUpperCase() === codeUpper);
        if (match && match.teamLeaderId) {
          setMyTeamLeaderId(match.teamLeaderId);
          if (match.teamName) setMyTeamName(match.teamName);
        }
      }
    } catch (e) {}

    // 2. Tra cứu dữ liệu từ Supabase DB user_profiles
    fetchUserProfileByCtvCode(codeUpper).then((sbProfile) => {
      if (sbProfile && sbProfile.teamLeaderId) {
        setMyTeamLeaderId(sbProfile.teamLeaderId);
        if (sbProfile.teamName) setMyTeamName(sbProfile.teamName);

        const savedAuth = localStorage.getItem("saohan_auth_user");
        if (savedAuth) {
          try {
            const authObj = JSON.parse(savedAuth);
            authObj.teamLeaderId = sbProfile.teamLeaderId;
            authObj.teamName = sbProfile.teamName || authObj.teamName;
            localStorage.setItem("saohan_auth_user", JSON.stringify(authObj));
          } catch (e) {}
        }
      }
    });
  }, [ctvUser?.code]);

  const currentLeaderId = ctvUser.teamLeaderId || myTeamLeaderId;
  const currentTeamName = ctvUser.teamName || myTeamName;

  const ctvUserWithTeam: CTVUser = {
    ...ctvUser,
    teamLeaderId: currentLeaderId,
    teamName: currentTeamName
  };

  useEffect(() => {
    if (ctvUser?.code) {
      // Tự động đồng bộ các yêu cầu chuyển doanh số từ Supabase DB
      fetchMyTransferRequestsFromSupabase(ctvUser.code).then((sbTransfers) => {
        if (sbTransfers && sbTransfers.length > 0) {
          setMyTransfers((prev) => {
            const map = new Map<string, TeamRevenueTransfer>();
            prev.forEach((t) => map.set(t.id, t));
            sbTransfers.forEach((t) => map.set(t.id, t));
            return Array.from(map.values());
          });
        }
      });
    }
  }, [ctvUser?.code]);

  // Team Leader state & handlers
  const leaderCode = ctvUser?.code || "";
  const teamMembers = getRegisteredCTVs(leaderCode);
  const [transfers, setTransfers] = useState<TeamRevenueTransfer[]>(() =>
    getTransferRequests(leaderCode)
  );

  useEffect(() => {
    if (leaderCode) {
      fetchLeaderTransferRequestsFromSupabase(leaderCode).then((sbTransfers) => {
        if (sbTransfers && sbTransfers.length > 0) {
          setTransfers((prev) => {
            const map = new Map<string, TeamRevenueTransfer>();
            prev.forEach((t) => map.set(t.id, t));
            sbTransfers.forEach((t) => map.set(t.id, t));
            return Array.from(map.values());
          });
        }
      });
    }
  }, [leaderCode]);

  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [memberCodeInput, setMemberCodeInput] = useState("");
  const [memberNameInput, setMemberNameInput] = useState("");
  const [memberPhoneInput, setMemberPhoneInput] = useState("");
  const [memberAvatarInput, setMemberAvatarInput] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [transferStatusFilter, setTransferStatusFilter] = useState<"ALL" | "pending" | "accepted" | "rejected">("ALL");
  const [transferMonthFilter, setTransferMonthFilter] = useState<string>("ALL");
  const [transferYearFilter, setTransferYearFilter] = useState<string>("ALL");
  const [transferCtvCodeFilter, setTransferCtvCodeFilter] = useState<string>("");

  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const handleMemberCodeChange = async (val: string) => {
    setMemberCodeInput(val);
    setMemberError("");
    const clean = val.trim().toUpperCase();
    if (clean) {
      try {
        const raw = localStorage.getItem("saohan_registered_users");
        const all: any[] = raw ? JSON.parse(raw) : [];
        const match = all.find(
          (u) =>
            (u.ctvCode || u.code || u.ctv_code || "").trim().toUpperCase() === clean
        );
        if (match) {
          if (match.fullName || match.name) setMemberNameInput(match.fullName || match.name);
          if (match.phone || match.phoneNumber) setMemberPhoneInput(match.phone || match.phoneNumber);
          if (match.avatarUrl || match.avatar) setMemberAvatarInput(match.avatarUrl || match.avatar);
          if (match.teamLeaderId && match.teamLeaderId !== leaderCode) {
            setMemberError(`CTV "${clean}" đã thuộc ${match.teamName || "nhóm khác"} rồi! Mỗi CTV chỉ được thuộc 1 nhóm.`);
          }
        }

        // Tự động truy vấn dữ liệu CTV thật trên Supabase (user_profiles)
        const sbProfile = await fetchUserProfileByCtvCode(clean);
        if (sbProfile) {
          if (sbProfile.fullName) setMemberNameInput(sbProfile.fullName);
          if (sbProfile.phone) setMemberPhoneInput(sbProfile.phone);
          if (sbProfile.avatarUrl) setMemberAvatarInput(sbProfile.avatarUrl);
          if (sbProfile.teamLeaderId && sbProfile.teamLeaderId !== leaderCode) {
            setMemberError(`CTV "${clean}" đã thuộc ${sbProfile.teamName || "nhóm khác"} rồi! Mỗi CTV chỉ được thuộc 1 nhóm.`);
          }
        }
      } catch (e) {}
    }
  };

  const handleRemoveMember = async (memberCode: string) => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ CTV "${memberCode}" khỏi nhóm?`)) return;
    try {
      const raw = localStorage.getItem("saohan_registered_users");
      const all: any[] = raw ? JSON.parse(raw) : [];
      const targetCodeUpper = memberCode.trim().toUpperCase();
      const updatedAll = all.map((u) => {
        const uCode = (u.ctvCode || u.code || u.ctv_code || "").trim().toUpperCase();
        if (uCode === targetCodeUpper || u.ctvCode === memberCode) {
          return { ...u, teamLeaderId: null, teamName: null };
        }
        return u;
      });
      localStorage.setItem("saohan_registered_users", JSON.stringify(updatedAll));

      // Đồng bộ việc xóa thành viên khỏi nhóm trên CSDL Supabase
      updateTeamLeaderInSupabase(memberCode, null, null).catch(console.error);

      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async () => {
    setMemberError("");
    const code = memberCodeInput.trim().toUpperCase();
    if (!code) { setMemberError("Vui lòng nhập Mã CTV"); return; }

    try {
      // 1. Lấy thông tin thật của CTV từ Supabase DB
      const sbProfile = await fetchUserProfileByCtvCode(code);

      const raw = localStorage.getItem("saohan_registered_users");
      const all: any[] = raw ? JSON.parse(raw) : [];

      let target = all.find((u) => {
        const uCode = (u.ctvCode || u.code || u.ctv_code || u.referralCode || "").trim().toUpperCase();
        return uCode === code;
      });

      // 2. Kiểm tra quy tắc: Mỗi CTV chỉ được add vào 1 nhóm
      const existingLeader = sbProfile?.teamLeaderId || target?.teamLeaderId;
      const existingTeamName = sbProfile?.teamName || target?.teamName;

      if (existingLeader && existingLeader !== leaderCode) {
        setMemberError(`CTV "${code}" đã thuộc ${existingTeamName || "nhóm khác"} rồi! Mỗi CTV chỉ được gia nhập 1 nhóm.`);
        return;
      }

      if (code === leaderCode.trim().toUpperCase()) {
        setMemberError("Không thể thêm chính mình vào nhóm!");
        return;
      }

      // 3. Ưu tiên thông tin từ Supabase -> Input chỉnh sửa -> Local Storage
      const cleanName = code.startsWith("SAOHAN-") ? code.replace("SAOHAN-", "") : code;
      const finalName = memberNameInput.trim() || sbProfile?.fullName || (target ? (target.fullName || target.name) : `CTV ${cleanName}`);
      const finalPhone = memberPhoneInput.trim() || sbProfile?.phone || (target ? (target.phone || target.phoneNumber) : "09" + Math.floor(10000000 + Math.random() * 90000000));
      const finalAvatar = memberAvatarInput.trim() || sbProfile?.avatarUrl || (target ? (target.avatarUrl || target.avatar) : "");

      const teamName = ctvUser.teamName || `Nhóm ${ctvUser.name}`;

      if (!target) {
        target = {
          id: sbProfile?.id || `ctv-${Date.now()}`,
          ctvCode: code,
          fullName: finalName,
          phone: finalPhone,
          avatarUrl: finalAvatar,
          role: "ctv",
          tier: sbProfile?.tier || "Bạc",
          teamLeaderId: leaderCode,
          teamName: teamName,
          totalRevenue: sbProfile?.totalRevenue || 0,
          totalCommission: sbProfile?.totalCommission || 0,
          createdAt: new Date().toISOString()
        };
        all.push(target);
      } else {
        target.fullName = finalName;
        target.phone = finalPhone;
        if (finalAvatar) target.avatarUrl = finalAvatar;
        target.teamLeaderId = leaderCode;
        target.teamName = teamName;
      }

      localStorage.setItem("saohan_registered_users", JSON.stringify(all));

      // 4. Đồng bộ gán nhóm lên Supabase CSDL table user_profiles (Tự tạo profile nếu chưa có)
      await updateTeamLeaderInSupabase(code, leaderCode, teamName, {
        fullName: finalName,
        phone: finalPhone,
        avatarUrl: finalAvatar
      });

      // Cập nhật auth user nếu khớp
      const savedAuth = localStorage.getItem("saohan_auth_user");
      if (savedAuth) {
        try {
          const authObj = JSON.parse(savedAuth);
          if ((authObj.ctvCode || authObj.code)?.toUpperCase() === code) {
            authObj.fullName = finalName;
            authObj.phone = finalPhone;
            if (finalAvatar) authObj.avatarUrl = finalAvatar;
            authObj.teamLeaderId = leaderCode;
            authObj.teamName = teamName;
            localStorage.setItem("saohan_auth_user", JSON.stringify(authObj));
          }
        } catch (e) {}
      }

      setMemberCodeInput("");
      setMemberNameInput("");
      setMemberPhoneInput("");
      setMemberAvatarInput("");
      setAddMemberModalOpen(false);
      window.location.reload();
    } catch {
      setMemberError("Đã xảy ra lỗi khi thêm thành viên. Vui lòng thử lại.");
    }
  };

  const handleSaveEditMember = () => {
    if (!editingMember) return;
    try {
      const raw = localStorage.getItem("saohan_registered_users");
      const all: any[] = raw ? JSON.parse(raw) : [];
      const targetCode = (editingMember.ctvCode || editingMember.code || "").trim().toUpperCase();
      const updatedAll = all.map((u) => {
        const uCode = (u.ctvCode || u.code || u.ctv_code || "").trim().toUpperCase();
        if (uCode === targetCode) {
          return {
            ...u,
            fullName: editName.trim() || u.fullName || u.name,
            phone: editPhone.trim() || u.phone,
            avatarUrl: editAvatar.trim() || u.avatarUrl || u.avatar
          };
        }
        return u;
      });
      localStorage.setItem("saohan_registered_users", JSON.stringify(updatedAll));

      const savedAuth = localStorage.getItem("saohan_auth_user");
      if (savedAuth) {
        try {
          const authObj = JSON.parse(savedAuth);
          if ((authObj.ctvCode || authObj.code)?.toUpperCase() === targetCode) {
            if (editName.trim()) authObj.fullName = editName.trim();
            if (editPhone.trim()) authObj.phone = editPhone.trim();
            if (editAvatar.trim()) authObj.avatarUrl = editAvatar.trim();
            localStorage.setItem("saohan_auth_user", JSON.stringify(authObj));
          }
        } catch (e) {}
      }

      setEditingMember(null);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptTransfer = async (transfer: TeamRevenueTransfer) => {
    const updated = transfers.map((t) =>
      t.id === transfer.id ? { ...t, status: "accepted" as const } : t
    );
    setTransfers(updated);
    saveTransferRequests(updated);

    // 1. Đồng bộ trạng thái 'accepted' lên Supabase CSDL
    updateTransferStatusInSupabase(transfer.id, "accepted").catch(console.error);

    // 2. Trừ doanh số ở CTV thành viên gửi đi
    if (transfer.fromCtvCode) {
      await deductRevenueFromCtvInSupabase(transfer.fromCtvCode, transfer.amount);
    }

    // 3. Tự động cộng doanh số cho Trưởng nhóm nhận
    const leaderCodeToUpdate = transfer.toLeaderCode || ctvUser.code;
    await addRevenueToLeaderInSupabase(leaderCodeToUpdate, transfer.amount, 0);

    // 4. Cập nhật trực tiếp ctvUser state tại chỗ
    if (ctvUser) {
      const myCodeUpper = (ctvUser.code || "").trim().toUpperCase();
      const fromCodeUpper = (transfer.fromCtvCode || "").trim().toUpperCase();
      const leaderCodeUpper = leaderCodeToUpdate.trim().toUpperCase();

      if (myCodeUpper === fromCodeUpper) {
        ctvUser.totalRevenue = Math.max(0, (ctvUser.totalRevenue || 0) - transfer.amount);
      }
      if (myCodeUpper === leaderCodeUpper) {
        ctvUser.totalRevenue = (ctvUser.totalRevenue || 0) + transfer.amount;
      }
    }
  };

  const handleRejectTransfer = (transfer: TeamRevenueTransfer) => {
    const updated = transfers.map((t) =>
      t.id === transfer.id ? { ...t, status: "rejected" as const } : t
    );
    setTransfers(updated);
    saveTransferRequests(updated);
    updateTransferStatusInSupabase(transfer.id, "rejected").catch(console.error);
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
  const hasTeamLeader = Boolean(ctvUser?.teamLeaderId || myTeamLeaderId);

  const baseModules = [
    { id: "my-customers", title: "Khách Hàng", sub: "Quản lý khách của tôi", icon: UserCheck, color: "from-blue-600 to-indigo-600" },
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
    : [
        { id: "ctv-transfers", title: "Chuyển Doanh Số", sub: "Theo dõi & gửi duyệt", icon: ArrowUpRight, color: "from-amber-500 to-orange-600" }
      ];

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
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden flex items-center justify-center shrink-0 font-black shadow-xs border border-slate-200">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                          ) : (
                            <span className="text-base">{member.fullName?.[0]?.toUpperCase() || "C"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-sm text-slate-900 truncate" title={member.fullName}>{member.fullName}</div>
                          <div className="font-mono text-[11px] text-blue-700 font-bold">{member.ctvCode}</div>
                          <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{member.phone || "Chưa cập nhật SĐT"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingMember(member);
                              setEditName(member.fullName || "");
                              setEditPhone(member.phone || "");
                              setEditAvatar(member.avatarUrl || "");
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Sửa thông tin CTV"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.ctvCode)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Gỡ khỏi nhóm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* SUBTAB: CHUYỂN DOANH SỐ (DẠNG GRID GỌN GÀNG VÀ BỘ LỌC) */}
      {activeSubTab === "team-transfers" && (() => {
        const filteredTransfers = transfers.filter((t) => {
          if (transferStatusFilter !== "ALL" && t.status !== transferStatusFilter) return false;
          if (transferCtvCodeFilter.trim() !== "") {
            const q = transferCtvCodeFilter.trim().toLowerCase();
            const fromCode = (t.fromCtvCode || "").toLowerCase();
            const fromName = (t.fromCtvName || "").toLowerCase();
            const serviceName = (t.serviceName || "").toLowerCase();
            if (!fromCode.includes(q) && !fromName.includes(q) && !serviceName.includes(q)) return false;
          }
          if (transferMonthFilter !== "ALL" || transferYearFilter !== "ALL") {
            const parsed = parseTransferDate(t.transferredAt);
            if (parsed) {
              if (transferMonthFilter !== "ALL" && parsed.month !== parseInt(transferMonthFilter, 10)) return false;
              if (transferYearFilter !== "ALL" && parsed.year !== parseInt(transferYearFilter, 10)) return false;
            }
          }
          return true;
        });

        return (
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
                    Danh Sách Yêu Cầu Chuyển Doanh Số ({filteredTransfers.length}/{transfers.length})
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Xem & xử lý phê duyệt doanh số từ các CTV trong nhóm</p>
                </div>
              </div>
            </div>

            {/* Bộ Lọc Chi Tiết: Mã CTV, Tháng, Năm */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Lọc theo Mã / Tên CTV */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Mã CTV, Tên CTV, Dịch vụ..."
                    value={transferCtvCodeFilter}
                    onChange={(e) => setTransferCtvCodeFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                  {transferCtvCodeFilter && (
                    <button
                      onClick={() => setTransferCtvCodeFilter("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Lọc theo Tháng */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Tháng:</span>
                  <select
                    value={transferMonthFilter}
                    onChange={(e) => setTransferMonthFilter(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m.toString()}>Tháng {m}</option>
                    ))}
                  </select>
                </div>

                {/* Lọc theo Năm */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Năm:</span>
                  <select
                    value={transferYearFilter}
                    onChange={(e) => setTransferYearFilter(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả năm</option>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y.toString()}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hiển thị dòng reset nếu đang lọc */}
              {(transferCtvCodeFilter || transferMonthFilter !== "ALL" || transferYearFilter !== "ALL" || transferStatusFilter !== "ALL") && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="truncate max-w-[80%]">
                    Đang lọc: {[
                      transferCtvCodeFilter ? `Mã/Tên: "${transferCtvCodeFilter}"` : null,
                      transferMonthFilter !== "ALL" ? `Tháng ${transferMonthFilter}` : null,
                      transferYearFilter !== "ALL" ? `Năm ${transferYearFilter}` : null,
                      transferStatusFilter !== "ALL" ? `Trạng thái: ${transferStatusFilter}` : null
                    ].filter(Boolean).join(" • ")}
                  </span>
                  <button
                    onClick={() => {
                      setTransferCtvCodeFilter("");
                      setTransferMonthFilter("ALL");
                      setTransferYearFilter("ALL");
                      setTransferStatusFilter("ALL");
                    }}
                    className="text-amber-700 hover:text-amber-900 font-extrabold flex items-center gap-1 shrink-0 hover:underline cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Xóa lọc
                  </button>
                </div>
              )}
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
            {filteredTransfers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTransfers.map((t) => (
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

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold block truncate">Nội dung</span>
                        <span className="font-black text-slate-900 truncate block text-[11px]">{t.serviceName}</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 min-w-0">
                        <span className="text-[10px] text-emerald-600 font-bold block truncate">Doanh số chuyển</span>
                        <span className="font-mono font-black text-emerald-700 truncate block text-[11px]">{t.amount.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>

                    {t.note && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        Ghi chú: "{t.note}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1">
                      <span>{t.transferredAt}</span>
                    </div>

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
                <p className="font-bold text-slate-600 text-sm">Không tìm thấy yêu cầu chuyển doanh số nào khớp với bộ lọc</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* SUBTAB: LỊCH SỬ CHUYỂN DOANH SỐ CỦA CTV */}
      {activeSubTab === "ctv-transfers" && (() => {
        const filteredMyTransfers = myTransfers.filter((t) => {
          if (transferStatusFilter !== "ALL" && t.status !== transferStatusFilter) return false;
          if (transferCtvCodeFilter.trim() !== "") {
            const q = transferCtvCodeFilter.trim().toLowerCase();
            const leaderCode = (t.toLeaderCode || "").toLowerCase();
            const leaderName = (t.toLeaderName || "").toLowerCase();
            const serviceName = (t.serviceName || "").toLowerCase();
            if (!leaderCode.includes(q) && !leaderName.includes(q) && !serviceName.includes(q)) return false;
          }
          if (transferMonthFilter !== "ALL" || transferYearFilter !== "ALL") {
            const parsed = parseTransferDate(t.transferredAt);
            if (parsed) {
              if (transferMonthFilter !== "ALL" && parsed.month !== parseInt(transferMonthFilter, 10)) return false;
              if (transferYearFilter !== "ALL" && parsed.year !== parseInt(transferYearFilter, 10)) return false;
            }
          }
          return true;
        });

        return (
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
                    <ArrowUpRight className="w-5 h-5 text-amber-600" />
                    Chuyển Doanh Số ({filteredMyTransfers.length}/{myTransfers.length})
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Theo dõi các yêu cầu chuyển doanh số bạn đã gửi tới Trưởng nhóm</p>
                </div>
              </div>

              <button
                onClick={() => { if (onOpenTeamTransferModal) onOpenTeamTransferModal(); }}
                className="bg-[#0B192C] hover:bg-slate-800 text-amber-400 font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition shadow-sm w-full sm:w-auto justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Chuyển doanh số mới
              </button>
            </div>

            {/* Stat Summary Bar */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                <span className="text-[10px] text-amber-700 font-extrabold uppercase block">⏳ Đang chờ duyệt</span>
                <span className="text-base sm:text-lg font-black text-amber-900 font-mono">
                  {myTransfers.filter((t) => t.status === "pending").reduce((s, t) => s + (t.amount || 0), 0).toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                <span className="text-[10px] text-emerald-700 font-extrabold uppercase block">✓ Đã chấp nhận</span>
                <span className="text-base sm:text-lg font-black text-emerald-900 font-mono">
                  {myTransfers.filter((t) => t.status === "accepted").reduce((s, t) => s + (t.amount || 0), 0).toLocaleString("vi-VN")}đ
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl">
                <span className="text-[10px] text-rose-700 font-extrabold uppercase block">✗ Đã từ chối</span>
                <span className="text-base sm:text-lg font-black text-rose-900 font-mono">
                  {myTransfers.filter((t) => t.status === "rejected").reduce((s, t) => s + (t.amount || 0), 0).toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            {/* Bộ Lọc Chi Tiết: Trưởng Nhóm/Mã, Tháng, Năm */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Lọc theo Mã/Tên Trưởng Nhóm hoặc Dịch Vụ */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Mã TN, Tên TN, Dịch vụ..."
                    value={transferCtvCodeFilter}
                    onChange={(e) => setTransferCtvCodeFilter(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                  {transferCtvCodeFilter && (
                    <button
                      onClick={() => setTransferCtvCodeFilter("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Lọc theo Tháng */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Tháng:</span>
                  <select
                    value={transferMonthFilter}
                    onChange={(e) => setTransferMonthFilter(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m.toString()}>Tháng {m}</option>
                    ))}
                  </select>
                </div>

                {/* Lọc theo Năm */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Năm:</span>
                  <select
                    value={transferYearFilter}
                    onChange={(e) => setTransferYearFilter(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả năm</option>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y.toString()}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hiển thị dòng reset nếu đang lọc */}
              {(transferCtvCodeFilter || transferMonthFilter !== "ALL" || transferYearFilter !== "ALL" || transferStatusFilter !== "ALL") && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="truncate max-w-[80%]">
                    Đang lọc: {[
                      transferCtvCodeFilter ? `Tìm kiếm: "${transferCtvCodeFilter}"` : null,
                      transferMonthFilter !== "ALL" ? `Tháng ${transferMonthFilter}` : null,
                      transferYearFilter !== "ALL" ? `Năm ${transferYearFilter}` : null,
                      transferStatusFilter !== "ALL" ? `Trạng thái: ${transferStatusFilter}` : null
                    ].filter(Boolean).join(" • ")}
                  </span>
                  <button
                    onClick={() => {
                      setTransferCtvCodeFilter("");
                      setTransferMonthFilter("ALL");
                      setTransferYearFilter("ALL");
                      setTransferStatusFilter("ALL");
                    }}
                    className="text-amber-700 hover:text-amber-900 font-extrabold flex items-center gap-1 shrink-0 hover:underline cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Xóa lọc
                  </button>
                </div>
              )}
            </div>

            {/* Grid Cards */}
            {filteredMyTransfers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMyTransfers.map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm hover:border-amber-400 transition">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Gửi tới Trưởng nhóm:</span>
                        <span className="font-mono font-black text-xs text-blue-700">{t.toLeaderCode}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        t.status === "pending" ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse" :
                        t.status === "accepted" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                        "bg-rose-100 text-rose-900 border-rose-300"
                      }`}>
                        {t.status === "pending" ? "⏳ Chờ duyệt" : t.status === "accepted" ? "✓ Chấp nhận" : "✗ Từ chối"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold block truncate">Nội dung</span>
                        <span className="font-black text-slate-900 truncate block text-[11px]">{t.serviceName}</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 min-w-0">
                        <span className="text-[10px] text-emerald-600 font-bold block truncate">Doanh số chuyển</span>
                        <span className="font-mono font-black text-emerald-700 truncate block text-[11px]">{t.amount.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>

                    {t.note && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        Ghi chú: "{t.note}"
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 text-right font-medium">
                      {t.transferredAt}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                <ArrowUpRight className="w-12 h-12 mx-auto text-slate-300" />
                <div>
                  <p className="font-bold text-slate-700">Không tìm thấy yêu cầu chuyển doanh số nào khớp với bộ lọc</p>
                  <p className="text-xs text-slate-500 mt-1">Vui lòng thử thay đổi điều kiện lọc (tháng, năm, mã CTV) hoặc gửi yêu cầu chuyển mới.</p>
                </div>
                <button
                  onClick={() => { if (onOpenTeamTransferModal) onOpenTeamTransferModal(); }}
                  className="bg-[#0B192C] text-amber-400 font-black px-5 py-2.5 rounded-2xl text-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  + Gửi yêu cầu chuyển doanh số mới
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* SUBTAB: QUẢN LÝ KHÁCH HÀNG CRM CỦA CỘNG TÁC VIÊN */}
      {activeSubTab === "my-customers" && (() => {
        const ctvLeads = myLeads.filter((lead) => {
          const matchesSearch =
            (lead.customerName || "").toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
            (lead.serviceName || "").toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
            (lead.customerPhone && lead.customerPhone.includes(customerSearchTerm));
          const matchesStatus = customerStatusFilter === "ALL" || lead.status === customerStatusFilter;
          
          let matchesDate = true;
          if (customerMonthFilter !== "ALL" || customerYearFilter !== "ALL") {
            const parsed = parseTransferDate(lead.createdAt);
            if (parsed) {
              if (customerMonthFilter !== "ALL" && parsed.month !== parseInt(customerMonthFilter, 10)) matchesDate = false;
              if (customerYearFilter !== "ALL" && parsed.year !== parseInt(customerYearFilter, 10)) matchesDate = false;
            }
          }

          return matchesSearch && matchesStatus && matchesDate;
        });

        return (
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
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    Quản Lý Khách Hàng CRM ({ctvLeads.length}/{myLeads.length})
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Danh sách các khách hàng do chính bạn đặt lịch & giới thiệu</p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onSelectTab) onSelectTab("crm-appointments");
                }}
                className="bg-[#0B192C] hover:bg-slate-800 text-amber-400 font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition shadow-sm w-full sm:w-auto justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Đặt lịch hẹn mới
              </button>
            </div>

            {/* Thống kê nhanh khách hàng */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl">
                <span className="text-[10px] text-blue-700 font-extrabold uppercase block">Tổng khách hàng</span>
                <span className="text-base sm:text-lg font-black text-blue-900 font-mono">{myLeads.length} người</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                <span className="text-[10px] text-amber-700 font-extrabold uppercase block">⏳ Chờ xử lý / Đặt lịch</span>
                <span className="text-base sm:text-lg font-black text-amber-900 font-mono">
                  {myLeads.filter((l) => l.status === "Chờ xác nhận" || l.status === "Mới" || l.status === "Đã đặt lịch").length} người
                </span>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl">
                <span className="text-[10px] text-indigo-700 font-extrabold uppercase block">🩺 Đã tư vấn / Điều trị</span>
                <span className="text-base sm:text-lg font-black text-indigo-900 font-mono">
                  {myLeads.filter((l) => l.status === "Đã tư vấn" || l.status === "Đang điều trị" || l.status === "Đã xác nhận").length} người
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                <span className="text-[10px] text-emerald-700 font-extrabold uppercase block">✓ Đã hoàn thành</span>
                <span className="text-base sm:text-lg font-black text-emerald-900 font-mono">
                  {myLeads.filter((l) => l.status === "Đã hoàn thành" || l.status === "Hoàn thành").length} người
                </span>
              </div>
            </div>

            {/* Thanh Tìm kiếm & Lọc CRM */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên khách hàng, số điện thoại, dịch vụ..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                  {customerSearchTerm && (
                    <button
                      onClick={() => setCustomerSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Trạng thái:</span>
                  <select
                    value={customerStatusFilter}
                    onChange={(e) => setCustomerStatusFilter(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="Chờ xác nhận">Chờ xác nhận</option>
                    <option value="Đã đặt lịch">Đã đặt lịch</option>
                    <option value="Đã xác nhận">Đã xác nhận</option>
                    <option value="Đã tư vấn">Đã tư vấn</option>
                    <option value="Đang điều trị">Đang điều trị</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                    <option value="Đã hủy">Đã hủy</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600 shrink-0">Tháng:</span>
                  <select
                    value={customerMonthFilter}
                    onChange={(e) => setCustomerMonthFilter(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả tháng</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m.toString()}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dòng hiển thị bộ lọc đang dùng */}
              {(customerSearchTerm || customerStatusFilter !== "ALL" || customerMonthFilter !== "ALL" || customerYearFilter !== "ALL") && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="truncate max-w-[80%]">
                    Đang lọc: {[
                      customerSearchTerm ? `Tìm kiếm: "${customerSearchTerm}"` : null,
                      customerStatusFilter !== "ALL" ? `Trạng thái: ${customerStatusFilter}` : null,
                      customerMonthFilter !== "ALL" ? `Tháng ${customerMonthFilter}` : null,
                      customerYearFilter !== "ALL" ? `Năm ${customerYearFilter}` : null
                    ].filter(Boolean).join(" • ")}
                  </span>
                  <button
                    onClick={() => {
                      setCustomerSearchTerm("");
                      setCustomerStatusFilter("ALL");
                      setCustomerMonthFilter("ALL");
                      setCustomerYearFilter("ALL");
                    }}
                    className="text-amber-700 hover:text-amber-900 font-extrabold flex items-center gap-1 shrink-0 hover:underline cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Xóa lọc
                  </button>
                </div>
              )}
            </div>

            {/* Thẻ danh sách khách hàng CRM */}
            {ctvLeads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ctvLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-white border border-slate-200 hover:border-blue-400 rounded-3xl p-4 space-y-3 shadow-sm transition group"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">{lead.customerName}</h4>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-mono text-xs font-bold text-blue-800 truncate">{lead.customerPhone}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 inline-flex items-center gap-1 border ${
                          lead.status === "Đã hoàn thành" || lead.status === "Hoàn thành"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : lead.status === "Đang điều trị" || lead.status === "Đã tư vấn"
                            ? "bg-indigo-100 text-indigo-900 border-indigo-300"
                            : lead.status === "Đã xác nhận"
                            ? "bg-blue-100 text-blue-900 border-blue-300"
                            : lead.status === "Hủy" || lead.status === "Đã hủy"
                            ? "bg-rose-100 text-rose-900 border-rose-300"
                            : "bg-amber-100 text-amber-900 border-amber-300"
                        }`}
                      >
                        {(lead.status === "Đã hoàn thành" || lead.status === "Hoàn thành") && <CheckCircle2 className="w-3 h-3" />}
                        {lead.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                      <div className="text-slate-900 font-bold truncate">{lead.serviceName}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>BS phụ trách: <strong className="text-slate-700">{lead.doctorAssigned || "BS Saohan"}</strong></span>
                        <span className="font-mono text-[10px]">{formatDateTimeVN(lead.createdAt)}</span>
                      </div>
                    </div>

                    {lead.notes && (
                      <p className="text-[11px] text-slate-600 italic bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                        Ghi chú: "{lead.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                <UserCheck className="w-12 h-12 mx-auto text-slate-300" />
                <div>
                  <p className="font-bold text-slate-700 text-sm">Chưa có khách hàng nào do bạn đặt lịch</p>
                  <p className="text-xs text-slate-500 mt-1">Chỉ những khách hàng do chính bạn tạo lịch hẹn hoặc giới thiệu mới hiển thị tại đây.</p>
                </div>
                <button
                  onClick={() => {
                    if (onSelectTab) onSelectTab("crm-appointments");
                  }}
                  className="bg-[#0B192C] text-amber-400 font-black px-5 py-2.5 rounded-2xl text-xs hover:bg-slate-800 transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Đặt lịch hẹn khách hàng mới
                </button>
              </div>
            )}
          </div>
        );
      })()}

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
                  if (mod.id === "my-customers") {
                    setActiveSubTab("my-customers");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else if (mod.id === "team-members") {
                    setActiveSubTab("team-members");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else if (mod.id === "team-transfers") {
                    setActiveSubTab("team-transfers");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else if (mod.id === "ctv-transfers") {
                    setActiveSubTab("ctv-transfers");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else if (mod.id === "send-team-transfer") {
                    if (onOpenTeamTransferModal) onOpenTeamTransferModal();
                  } else if (mod.id === "service-catalog") {
                    setActiveSubTab("services");
                  } else if (mod.id === "before-after") {
                    setActiveSubTab("feedbacks");
                  } else if (onSelectTab) {
                    onSelectTab(mod.id);
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
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900">
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
                  onChange={(e) => handleMemberCodeChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Họ và Tên CTV:</label>
                <input
                  type="text"
                  placeholder="Tự động đồng bộ nếu đã có tài khoản"
                  value={memberNameInput}
                  onChange={(e) => setMemberNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Số Điện Thoại:</label>
                <input
                  type="text"
                  placeholder="VD: 0912345678"
                  value={memberPhoneInput}
                  onChange={(e) => setMemberPhoneInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Link Ảnh Đại Diện (Avatar URL):</label>
                <input
                  type="text"
                  placeholder="https://... (để trống nếu dùng ảnh tự động)"
                  value={memberAvatarInput}
                  onChange={(e) => setMemberAvatarInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 text-[11px]"
                />
              </div>

              {memberError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{memberError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
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

      {/* Modal Chỉnh Sửa & Đồng Bộ Thông Tin Thành Viên */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" /> Đồng bộ thông tin thành viên ({editingMember.ctvCode})
              </h3>
              <button onClick={() => setEditingMember(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Mã CTV (Bảo lưu):</label>
                <input
                  type="text"
                  disabled
                  value={editingMember.ctvCode}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Họ và Tên CTV:</label>
                <input
                  type="text"
                  placeholder="Nhập Họ và Tên..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Số Điện Thoại:</label>
                <input
                  type="text"
                  placeholder="Nhập Số điện thoại..."
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Link Ảnh Đại Diện (Avatar URL):</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditMember}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition shadow-sm cursor-pointer"
                >
                  Lưu & Đồng bộ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
