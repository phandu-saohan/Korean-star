import React, { useState, useEffect, useMemo } from "react";
import { UserRole, CTVUser, ReferralLead, Appointment, RealtimeNotification, ServiceItem, Promotion, VideoGuide, PayoutRequest, ServiceFeedback, AppointmentInvoice } from "./types";
import { 
  INITIAL_CTV, 
  SERVICES_DATA, 
  INITIAL_LEADS, 
  INITIAL_APPOINTMENTS, 
  PROMOTIONS, 
  VIDEO_GUIDES, 
  REALTIME_NOTIFICATIONS_SEED,
  INITIAL_PAYOUT_REQUESTS,
  INITIAL_FEEDBACKS
} from "./data/aestheticData";
import { formatDateTimeVN } from "./utils/formatters";

import { Header } from "./components/Header";
import { CTVHub } from "./components/CTVHub";
import { Implant3DViewer } from "./components/Implant3DViewer";
import { SkinAnalysisModal } from "./components/SkinAnalysisModal";
import { ServiceCatalog } from "./components/ServiceCatalog";
import { BeforeAfterGallery } from "./components/BeforeAfterGallery";
import { MedicalKnowledge } from "./components/MedicalKnowledge";
import { ComboBuilder } from "./components/ComboBuilder";
import { CRMAppointment } from "./components/CRMAppointment";
import { PostOpCare } from "./components/PostOpCare";
import { PromotionsBanner } from "./components/PromotionsBanner";
import { AdminDashboard } from "./components/AdminDashboard";
import { EditorDashboard } from "./components/EditorDashboard";
import { AccountantDashboard } from "./components/AccountantDashboard";
import { PayoutModal } from "./components/PayoutModal";
import { AuthModal } from "./components/AuthModal";
import { AuthPage } from "./components/AuthPage";
import { ProfileEditModal } from "./components/ProfileEditModal";
import { HelpSupportModal } from "./components/HelpSupportModal";
import { PullToRefresh } from "./components/PullToRefresh";
import { updateAppBadgeFromUnread, clearBadge } from "./lib/badge";
import {
  updateUserProfile,
  fetchServicesFromSupabase,
  saveServiceToSupabase,
  deleteServiceFromSupabase,
  fetchFeedbacksFromSupabase,
  saveFeedbackToSupabase,
  deleteFeedbackFromSupabase,
  fetchAppointmentsFromSupabase,
  saveAppointmentToSupabase,
  updateAppointmentStatusInSupabase,
  deleteAppointmentFromSupabase,
  fetchPayoutRequestsFromSupabase,
  savePayoutRequestToSupabase,
  signOutUser,
  realtimeSupabase
} from "./lib/supabase";

import {
  initOneSignal,
  setOneSignalUser,
  notifyPayoutCompleted
} from "./lib/onesignal";

import { notifyZaloPayoutCompleted } from "./services/zaloService";

import { 
  Home,
  Users, 
  Box, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Calendar, 
  HeartPulse, 
  Flame, 
  Building2,
  Bell,
  Menu,
  X,
  ChevronRight,
  Wallet,
  Copy,
  Check,
  Plus,
  Zap,
  ShieldCheck,
  RefreshCw,
  Wrench,
  User,
  UserCog,
  Headphones,
  LogOut,
  Shield,
  Coins,
  FileText,
  Eye,
  Stethoscope,
  CalendarHeart,
  Camera,
  GraduationCap
} from "lucide-react";

export default function App() {
  // Auth Modal, Profile Modal & Supabase User State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(() => {
    const saved = localStorage.getItem("saohan_auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation & Role State (Persisted across F5 refresh)
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const savedAuth = localStorage.getItem("saohan_auth_user");
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.role) return parsed.role as UserRole;
      } catch (e) {}
    }
    const savedRole = localStorage.getItem("saohan_current_role");
    return (savedRole as UserRole) || "ctv";
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedAuth = localStorage.getItem("saohan_auth_user");
    let userRole = "ctv";
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.role) userRole = parsed.role;
      } catch (e) {}
    }

    const savedTab = localStorage.getItem("saohan_active_tab");
    if (savedTab) {
      if (savedTab === "admin" && userRole !== "admin") {
        return userRole === "editor" ? "editor" : userRole === "accountant" ? "accountant" : "ctv-dashboard";
      }
      if (savedTab === "editor" && userRole !== "editor" && userRole !== "admin") return "ctv-dashboard";
      if (savedTab === "accountant" && userRole !== "accountant" && userRole !== "admin") return "ctv-dashboard";
      return savedTab;
    }

    if (userRole === "admin") return "admin";
    if (userRole === "editor") return "editor";
    if (userRole === "accountant") return "accountant";
    return "ctv-dashboard";
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [beforeAfterServiceFilter, setBeforeAfterServiceFilter] = useState<string>("ALL");

  // Application Data State with LocalStorage Persistence for Real WebApp Experience
  const [ctvUser, setCtvUser] = useState<CTVUser>(() => {
    const saved = localStorage.getItem("saohan_ctv_user");
    return saved ? JSON.parse(saved) : INITIAL_CTV;
  });

  // Services: Load từ localStorage -> nếu chưa có thì dùng SERVICES_DATA fallback
  // Khi Supabase có dữ liệu, bootstrap effect sẽ tự động cập nhật từ Supabase
  const [services, setServices] = useState<ServiceItem[]>(() => {
    const saved = localStorage.getItem("saohan_services");
    return saved ? JSON.parse(saved) : SERVICES_DATA;
  });

  const [leads, setLeads] = useState<ReferralLead[]>(() => {
    const saved = localStorage.getItem("saohan_leads");
    if (!saved) return [];
    try {
      const parsed: ReferralLead[] = JSON.parse(saved);
      const clean = parsed.filter((l) => l && l.id && !l.id.includes("1785") && !l.id.startsWith("lead-0") && !l.id.startsWith("lead-apt-0"));
      return clean;
    } catch {
      return [];
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem("saohan_appointments");
    if (!saved) return INITIAL_APPOINTMENTS;
    try {
      const parsed: Appointment[] = JSON.parse(saved);
      // Tự động làm sạch các lịch hẹn mẫu thử nghiệm trước đó trong trình duyệt
      const clean = parsed.filter(a => a && a.id && !a.id.startsWith("apt-1785") && !a.id.startsWith("apt-0"));
      if (clean.length !== parsed.length) {
        localStorage.setItem("saohan_appointments", JSON.stringify(clean));
      }
      return clean;
    } catch (e) {
      return INITIAL_APPOINTMENTS;
    }
  });

  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    const saved = localStorage.getItem("saohan_promotions");
    return saved ? JSON.parse(saved) : PROMOTIONS;
  });

  const [videoGuides, setVideoGuides] = useState<VideoGuide[]>(() => {
    const saved = localStorage.getItem("saohan_video_guides");
    return saved ? JSON.parse(saved) : VIDEO_GUIDES;
  });

  const [notifications, setNotifications] = useState<RealtimeNotification[]>(() => {
    const saved = localStorage.getItem("saohan_notifications");
    return saved ? JSON.parse(saved) : REALTIME_NOTIFICATIONS_SEED;
  });

  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>(() => {
    const saved = localStorage.getItem("saohan_payout_requests");
    return saved ? JSON.parse(saved) : INITIAL_PAYOUT_REQUESTS;
  });

  // Feedbacks: Load từ localStorage -> nếu chưa có thì dùng INITIAL_FEEDBACKS fallback
  const [feedbacks, setFeedbacks] = useState<ServiceFeedback[]>(() => {
    const saved = localStorage.getItem("saohan_feedbacks");
    return saved ? JSON.parse(saved) : INITIAL_FEEDBACKS;
  });

  const [invoices, setInvoices] = useState<AppointmentInvoice[]>(() => {
    const saved = localStorage.getItem("saohan_invoices");
    return saved ? JSON.parse(saved) : [];
  });

  const handleUpdateInvoice = (updatedInvoice: AppointmentInvoice) => {
    setInvoices((prev) => {
      const idx = prev.findIndex((i) => i.id === updatedInvoice.id);
      let updated: AppointmentInvoice[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = updatedInvoice;
      } else {
        updated = [updatedInvoice, ...prev];
      }
      safeSetLocalStorage("saohan_invoices", JSON.stringify(updated));
      return updated;
    });
    showToast(`Đã cập nhật hóa đơn ${updatedInvoice.id} (${updatedInvoice.paymentStatus})!`);
  };

  const handleCreditCTVCommission = (ctvCode: string, amount: number, serviceName: string) => {
    setCtvUser((prev) => {
      const updated = {
        ...prev,
        totalRevenue: prev.totalRevenue + Math.round(amount / 0.15),
        totalCommission: prev.totalCommission + amount,
        availableBalance: prev.availableBalance + amount
      };
      safeSetLocalStorage("saohan_ctv_user", JSON.stringify(updated));
      return updated;
    });

    addSystemNotification({
      title: "Cộng Tiền Hoa Hồng Vào Ví",
      text: `🎉 Bạn vừa nhận +${amount.toLocaleString("vi-VN")} VNĐ hoa hồng từ ca dịch vụ "${serviceName}"!`,
      type: "commission"
    });
    showToast(`🎉 Đã cộng +${amount.toLocaleString("vi-VN")} VNĐ hoa hồng vào ví CTV ${ctvCode}!`);
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads((prev) => {
      const updated = prev.filter((l) => l.id !== leadId);
      safeSetLocalStorage("saohan_leads", JSON.stringify(updated));
      return updated;
    });
    showToast("Đã xóa khách hàng khỏi danh sách!");
  };

  const handleClearAllLeads = () => {
    setLeads([]);
    safeSetLocalStorage("saohan_leads", JSON.stringify([]));
    showToast("Đã xóa toàn bộ danh sách khách hàng mẫu trên Dashboard CTV!");
  };

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSaveProfile = async (updates: any) => {
    const updatedAuthUser = {
      ...authUser,
      ...updates
    };
    setAuthUser(updatedAuthUser);
    localStorage.setItem("saohan_auth_user", JSON.stringify(updatedAuthUser));

    setCtvUser((prev) => ({
      ...prev,
      name: updates.fullName || prev.name,
      phone: updates.phone || prev.phone,
      avatar: updates.avatarUrl || prev.avatar,
      bankName: updates.bankName || prev.bankName,
      accountNumber: updates.accountNumber || prev.accountNumber,
      zaloChatId: updates.zaloChatId !== undefined ? updates.zaloChatId : prev.zaloChatId
    }));

    if (authUser?.id) {
      await updateUserProfile(authUser.id, updates);
    }

    showToast("Cập nhật thông tin cá nhân & Zalo Chat ID thành công trên Supabase!");
  };

  const handleAuthSuccess = (userProfile: any) => {
    setAuthUser(userProfile);
    localStorage.setItem("saohan_auth_user", JSON.stringify(userProfile));

    const role = userProfile.role || "ctv";
    setCurrentRole(role as UserRole);
    localStorage.setItem("saohan_current_role", role);

    if (role === "admin") {
      setActiveTab("admin");
      localStorage.setItem("saohan_active_tab", "admin");
    } else if (role === "editor") {
      setActiveTab("editor");
      localStorage.setItem("saohan_active_tab", "editor");
    } else if (role === "accountant") {
      setActiveTab("accountant");
      localStorage.setItem("saohan_active_tab", "accountant");
    } else {
      setActiveTab("ctv-dashboard");
      localStorage.setItem("saohan_active_tab", "ctv-dashboard");
    }

    if (userProfile && userProfile.fullName) {
      setCtvUser((prev) => ({
        ...prev,
        id: userProfile.id || prev.id,
        name: userProfile.fullName,
        code: userProfile.ctvCode || prev.code,
        phone: userProfile.phone || prev.phone,
        email: userProfile.email || (prev as any).email,
        tier: userProfile.tier || prev.tier,
        avatar: userProfile.avatarUrl || userProfile.avatar || prev.avatar,
        availableBalance: userProfile.availableBalance ?? prev.availableBalance,
        pendingBalance: userProfile.pendingBalance ?? prev.pendingBalance,
        totalRevenue: userProfile.totalRevenue ?? prev.totalRevenue,
        totalCommission: userProfile.totalCommission ?? prev.totalCommission,
        idCardNumber: userProfile.idCardNumber || (prev as any).idCardNumber,
        facilityName: userProfile.facilityName || (prev as any).facilityName,
        bankAccount: {
          bankName: userProfile.bankName || prev.bankAccount?.bankName || "MB Bank",
          accountNumber: userProfile.accountNumber || prev.bankAccount?.accountNumber || "",
          accountHolder: userProfile.accountHolder || userProfile.fullName?.toUpperCase() || prev.bankAccount?.accountHolder || ""
        }
      }));
    }

    showToast(`Đăng nhập thành công! Chào mừng CTV ${userProfile.fullName}`);
  };

  // Sync authUser to ctvUser state & role/tab persistence (Lưu đầy đủ 8 trường đăng ký cá nhân)
  useEffect(() => {
    if (authUser) {
      if (authUser.role && authUser.role !== currentRole) {
        setCurrentRole(authUser.role as UserRole);
        localStorage.setItem("saohan_current_role", authUser.role);
      }

      setCtvUser((prev) => ({
        ...prev,
        id: authUser.id || prev.id,
        name: authUser.fullName || prev.name,
        code: authUser.ctvCode || prev.code,
        phone: authUser.phone || prev.phone,
        email: authUser.email || (prev as any).email,
        tier: authUser.tier || prev.tier,
        avatar: authUser.avatarUrl || authUser.avatar || prev.avatar,
        availableBalance: authUser.availableBalance ?? prev.availableBalance,
        pendingBalance: authUser.pendingBalance ?? prev.pendingBalance,
        totalRevenue: authUser.totalRevenue ?? prev.totalRevenue,
        totalCommission: authUser.totalCommission ?? prev.totalCommission,
        idCardNumber: authUser.idCardNumber || (prev as any).idCardNumber,
        facilityName: authUser.facilityName || (prev as any).facilityName,
        bankAccount: {
          bankName: authUser.bankName || prev.bankAccount?.bankName || "MB Bank",
          accountNumber: authUser.accountNumber || prev.bankAccount?.accountNumber || "",
          accountHolder: authUser.accountHolder || (authUser.fullName ? authUser.fullName.toUpperCase() : prev.bankAccount?.accountHolder || "")
        }
      }));
    }
  }, [authUser]);

  useEffect(() => {
    localStorage.setItem("saohan_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("saohan_current_role", currentRole);
  }, [currentRole]);

  // Role Access Guard Effect
  useEffect(() => {
    if (!authUser) return;
    const role = authUser.role || "ctv";

    if (activeTab === "admin" && role !== "admin") {
      showToast(`Tài khoản vai trò '${role.toUpperCase()}' không có quyền truy cập Bảng Admin.`);
      const fallbackTab = role === "editor" ? "editor" : role === "accountant" ? "accountant" : "ctv-dashboard";
      setActiveTab(fallbackTab);
    } else if (activeTab === "editor" && role !== "editor" && role !== "admin") {
      showToast(`Tài khoản vai trò '${role.toUpperCase()}' không có quyền truy cập Bảng Biên Tập Viên.`);
      setActiveTab("ctv-dashboard");
    } else if (activeTab === "accountant" && role !== "accountant" && role !== "admin") {
      showToast(`Tài khoản vai trò '${role.toUpperCase()}' không có quyền truy cập Bảng Kế Toán.`);
      setActiveTab("ctv-dashboard");
    }
  }, [activeTab, authUser]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.warn("[SignOut Notice]:", e);
    }
    setAuthUser(null);
    localStorage.removeItem("saohan_auth_user");
    localStorage.removeItem("saohan_active_tab");
    localStorage.removeItem("saohan_current_role");
    setCurrentRole("ctv");
    setActiveTab("ctv-dashboard");
    showToast("Đã đăng xuất tài khoản an toàn.");
  };

  // Helper safely setting LocalStorage without throwing QuotaExceededError
  const safeSetLocalStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      // Quiet warning when browser localStorage is full
    }
  };

  // ============================================================
  // BOOTSTRAP: Sync dữ liệu từ Supabase khi mount (nếu CSDL đã tạo)
  // Nếu Supabase trả về dữ liệu -> ưu tiên hiển thị dữ liệu từ Supabase
  // Nếu Supabase chưa tạo bảng (400 Bad Request) -> giữ fallback local
  // ============================================================
  useEffect(() => {
    const bootstrapFromSupabase = async () => {
      // Fetch Services từ Supabase
      try {
        const remoteServices = await fetchServicesFromSupabase();
        if (remoteServices && remoteServices.length > 0) {
          setServices(remoteServices);
          safeSetLocalStorage("saohan_services", JSON.stringify(remoteServices));
        }
      } catch (err) {
        console.warn("[Supabase] Không fetch được services, sử dụng bộ lưu trữ local.", err);
      }

      // Fetch Feedbacks từ Supabase
      try {
        const remoteFeedbacks = await fetchFeedbacksFromSupabase();
        if (remoteFeedbacks && remoteFeedbacks.length > 0) {
          setFeedbacks(remoteFeedbacks);
          safeSetLocalStorage("saohan_feedbacks", JSON.stringify(remoteFeedbacks));
        }
      } catch (err) {
        console.warn("[Supabase] Không fetch được feedbacks, sử dụng bộ lưu trữ local.", err);
      }

      // Fetch & Sync Appointments từ Supabase (đồng bộ giữa CTV và Admin)
      try {
        const remoteAppointments = await fetchAppointmentsFromSupabase();
        if (remoteAppointments !== null) {
          setAppointments(remoteAppointments);
          safeSetLocalStorage("saohan_appointments", JSON.stringify(remoteAppointments));
        }
      } catch (err) {
        console.warn("[Supabase] Không đồng bộ được appointments:", err);
      }
    };

    bootstrapFromSupabase();
  }, []);

  // Khởi tạo OneSignal Web Push SDK
  useEffect(() => {
    initOneSignal();
  }, []);

  // Cập nhật User Profile & Dynamic Role Tags cho OneSignal Realtime
  useEffect(() => {
    if (authUser) {
      setOneSignalUser(authUser);
    }
  }, [authUser]);

  // Helper: Thêm thông báo mới vào biểu tượng Chuông Header & lưu localStorage
  const addSystemNotification = (notif: {
    title?: string;
    text: string;
    type?: "commission" | "lead" | "system" | "promo" | "postop";
  }) => {
    const newNotif: RealtimeNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: notif.title || (notif.type === "commission" ? "Hoa Hồng & Ví" : notif.type === "lead" ? "Lịch Hẹn & Khách Hàng" : "Thông Báo Hệ Thống"),
      text: notif.text,
      time: "Vừa xong",
      type: notif.type || "system",
      isRead: false
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      safeSetLocalStorage("saohan_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  // Đăng ký nhận Event thông báo Realtime OneSignal để bật Toast & lưu vào biểu tượng Chuông trên Header
  useEffect(() => {
    const handleOsToast = (e: any) => {
      const detail = e.detail || {};
      const title = detail.title || detail.heading || "Thông Báo KOREAN STAR";
      const text = detail.message || detail.body || detail.text || "";

      if (title || text) {
        showToast(`${title}: ${text}`);

        const notifType = detail.data?.type === "COMMISSION"
          ? "commission"
          : detail.data?.type === "PAYOUT"
          ? "system"
          : "lead";

        addSystemNotification({
          title,
          text,
          type: notifType
        });
      }
    };

    window.addEventListener("onesignal-notification-toast", handleOsToast);
    return () => window.removeEventListener("onesignal-notification-toast", handleOsToast);
  }, []);

  // Đồng bộ số đếm Badge trên Icon ứng dụng PWA (Android Chrome & iOS 16.4+ Add-to-Home-Screen)
  useEffect(() => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    updateAppBadgeFromUnread(unreadCount);
  }, [notifications]);

  // Refs theo dõi trạng thái dữ liệu Supabase để bắn thông báo Chuông Realtime khi có biến động
  const knownAptMapRef = useRef<Map<string, string>>(new Map());
  const knownPayoutMapRef = useRef<Map<string, string>>(new Map());

  // Đồng bộ Lịch Hẹn CRM từ Supabase DB & Bắn thông báo Chuông khi có Lịch mới / Trạng thái đổi
  const syncAppointmentsWithNotification = useCallback(async () => {
    try {
      const remote = await fetchAppointmentsFromSupabase();
      if (remote !== null) {
        if (knownAptMapRef.current.size > 0) {
          remote.forEach((apt) => {
            const prevStatus = knownAptMapRef.current.get(apt.id);
            if (!prevStatus) {
              addSystemNotification({
                title: "⚡ Supabase Realtime: Lịch Hẹn Mới",
                text: `🔥 Khách hàng ${apt.customerName} vừa đặt dịch vụ "${apt.serviceName}"!`,
                type: "lead"
              });
            } else if (prevStatus !== apt.status) {
              addSystemNotification({
                title: "⚡ Supabase Realtime: Trạng Thái Lịch Hẹn",
                text: `📅 Lịch hẹn của ${apt.customerName} đã chuyển trạng thái sang "${apt.status}".`,
                type: apt.status === "Hoàn thành" ? "commission" : "lead"
              });
            }
          });
        }

        const newMap = new Map<string, string>();
        remote.forEach((a) => newMap.set(a.id, a.status));
        knownAptMapRef.current = newMap;

        setAppointments(remote);
        safeSetLocalStorage("saohan_appointments", JSON.stringify(remote));
      }
    } catch (_) {}
  }, []);

  // Đồng bộ Yêu Cầu Rút Tiền từ Supabase DB & Bắn thông báo Chuông khi có Lệnh mới / Duyệt giải ngân
  const syncPayoutsWithNotification = useCallback(async () => {
    try {
      const remotePayouts = await fetchPayoutRequestsFromSupabase();
      if (remotePayouts !== null) {
        if (knownPayoutMapRef.current.size > 0) {
          remotePayouts.forEach((payout) => {
            const prevStatus = knownPayoutMapRef.current.get(payout.id);
            if (!prevStatus) {
              addSystemNotification({
                title: "⚡ Supabase Realtime: Yêu Cầu Rút Tiền",
                text: `💸 Yêu cầu rút ${payout.amount.toLocaleString("vi-VN")}đ của CTV ${payout.ctvName} đã ghi nhận trên hệ thống.`,
                type: "system"
              });
            } else if (prevStatus !== payout.status) {
              const text = payout.status === "Đã duyệt"
                ? `🎉 Yêu cầu rút ${payout.amount.toLocaleString("vi-VN")}đ của CTV ${payout.ctvName} ĐÃ ĐƯỢC DUYỆT GIẢI NGÂN!`
                : payout.status === "Từ chối"
                ? `⚠️ Yêu cầu rút ${payout.amount.toLocaleString("vi-VN")}đ của CTV ${payout.ctvName} đã BỊ TỪ CHỐI.`
                : `🔄 Yêu cầu rút ${payout.amount.toLocaleString("vi-VN")}đ chuyển trạng thái sang "${payout.status}".`;

              addSystemNotification({
                title: "⚡ Supabase Realtime: Giải Ngân Rút Tiền",
                text,
                type: payout.status === "Đã duyệt" ? "commission" : "system"
              });
            }
          });
        }

        const newMap = new Map<string, string>();
        remotePayouts.forEach((p) => newMap.set(p.id, p.status));
        knownPayoutMapRef.current = newMap;

        setPayoutRequests(remotePayouts);
        safeSetLocalStorage("saohan_payout_requests", JSON.stringify(remotePayouts));
      }
    } catch (_) {}
  }, []);

  // Supabase Realtime WebSocket Listener cho Lịch Hẹn & Giải Ngân
  useEffect(() => {
    let activeChannel: any = null;
    try {
      activeChannel = realtimeSupabase
        .channel("realtime-db-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointment_bookings" },
          () => syncAppointmentsWithNotification()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payout_requests" },
          () => syncPayoutsWithNotification()
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            try {
              if (activeChannel) realtimeSupabase.removeChannel(activeChannel);
            } catch (e) {}
          }
        });
    } catch (e) {}

    return () => {
      if (activeChannel) {
        try {
          realtimeSupabase.removeChannel(activeChannel);
        } catch (e) {}
      }
    };
  }, [syncAppointmentsWithNotification, syncPayoutsWithNotification]);

  // Auto-polling: Đồng bộ liên tục Lịch Hẹn & Giải Ngân từ Supabase mỗi 10 giây
  useEffect(() => {
    syncAppointmentsWithNotification();
    syncPayoutsWithNotification();

    const interval = setInterval(() => {
      syncAppointmentsWithNotification();
      syncPayoutsWithNotification();
    }, 10000); // 10 giây đồng bộ Realtime

    return () => clearInterval(interval);
  }, [syncAppointmentsWithNotification, syncPayoutsWithNotification]);

  // Tự động chuyển đổi appointments thành leads để hiển thị đầy đủ trên Dashboard CTVHub
  useEffect(() => {
    if (!appointments || appointments.length === 0) return;

    setLeads((prevLeads) => {
      const existingLeadIds = new Set(prevLeads.map((l) => l.id));
      const newLeadsFromApts: ReferralLead[] = [];

      appointments.forEach((apt) => {
        const leadId = apt.id.startsWith("lead-") ? apt.id : `lead-${apt.id}`;
        if (!existingLeadIds.has(leadId) && !existingLeadIds.has(apt.id)) {
          newLeadsFromApts.push({
            id: leadId,
            customerName: apt.customerName,
            customerPhone: apt.customerPhone,
            serviceId: "srv-custom",
            serviceName: apt.serviceName,
            ctvCode: apt.ctvCode || ctvUser.code,
            ctvName: apt.ctvName || ctvUser.name,
            createdAt: apt.date || new Date().toISOString().slice(0, 10),
            status: apt.status === "Hoàn thành" ? "Đã hoàn thành" : apt.status === "Đang điều trị" ? "Đã tư vấn" : "Đã đặt lịch",
            estimatedValue: 35000000,
            commission: 5250000,
            doctorAssigned: apt.doctorName,
            appointmentDate: apt.date
          });
        }
      });

      if (newLeadsFromApts.length === 0) return prevLeads;

      const mergedLeads = [...newLeadsFromApts, ...prevLeads];
      safeSetLocalStorage("saohan_leads", JSON.stringify(mergedLeads));
      return mergedLeads;
    });
  }, [appointments, ctvUser]);

  // Fetch ngay khi Admin hoặc CTV mở tab CRM / Lịch Hẹn (không cần đợi 30s)
  useEffect(() => {
    if (activeTab === "admin" || activeTab === "crm-appointments") {
      fetchAppointmentsFromSupabase().then((remote) => {
        if (remote && remote.length > 0) {
          setAppointments((prev) => {
            const remoteIds = new Set(remote.map((a: any) => a.id));
            const localOnly = prev.filter((a) => !remoteIds.has(a.id));
            const merged = [...remote, ...localOnly];
            safeSetLocalStorage("saohan_appointments", JSON.stringify(merged));
            return merged;
          });
        }
      }).catch(() => {});
    }
  }, [activeTab]);

  // Tính toán thời gian thực các chỉ số CTV (Hoa hồng thực nhận, Chờ duyệt, Doanh số tích lũy, Hạng cấp bậc, Tỷ lệ chuyển đổi)
  const effectiveCtvUser = useMemo(() => {
    const ctvCode = (ctvUser.code || "").toLowerCase().trim();
    const ctvName = (ctvUser.name || "").toLowerCase().trim();

    // 1. Danh sách Hóa đơn thuộc CTV
    const ctvInvoices = invoices.filter(inv => 
      (inv.ctvCode && inv.ctvCode.toLowerCase().trim() === ctvCode) ||
      (ctvName && inv.ctvName?.toLowerCase().trim() === ctvName)
    );

    // 2. Danh sách Lịch hẹn thuộc CTV
    const ctvAppointments = appointments.filter(apt => 
      (apt.ctvCode && apt.ctvCode.toLowerCase().trim() === ctvCode) ||
      (ctvName && apt.ctvName?.toLowerCase().trim() === ctvName)
    );

    // 3. Danh sách Lead thuộc CTV
    const ctvLeads = leads.filter(lead => 
      (lead.ctvCode && lead.ctvCode.toLowerCase().trim() === ctvCode) ||
      (ctvName && lead.ctvName?.toLowerCase().trim() === ctvName)
    );

    // 4. Lệnh rút tiền đã giải ngân hoặc đang chờ kiểm tra
    const ctvPayouts = payoutRequests.filter(p => 
      ((p.ctvCode && p.ctvCode.toLowerCase().trim() === ctvCode) || (ctvName && p.ctvName?.toLowerCase().trim() === ctvName)) &&
      (p.status === "Giải ngân thành công" || p.status === "Đã chuyển tiền" || p.status === "Đã duyệt" || p.status === "Chờ kế toán kiểm tra")
    );

    const totalPaidOut = ctvPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Metric 1: HOA HỒNG THỰC NHẬN (Ví khả dụng)
    const completedComm = ctvInvoices
      .filter(i => i.paymentStatus === "Đã thu đủ (Hoàn thành)")
      .reduce((sum, i) => sum + (i.commissionAmount || 0), 0);

    const invoiceAptIds = new Set(ctvInvoices.map(i => i.appointmentId).filter(Boolean));

    const completedAptComm = ctvAppointments
      .filter(a => a.status === "Hoàn thành" && !invoiceAptIds.has(a.id))
      .reduce((sum, a) => sum + Math.round(35000000 * 0.15), 0);

    const totalEarnedComm = completedComm + completedAptComm;
    const computedAvailable = Math.max(0, totalEarnedComm - totalPaidOut);

    const baseBalance = ctvUser.availableBalance || 0;
    const availableBalance = baseBalance > totalEarnedComm ? Math.max(0, baseBalance - totalPaidOut) : computedAvailable;
    const totalCommission = Math.max(ctvUser.totalCommission || 0, totalEarnedComm);

    // Metric 2: CHỜ DUYỆT (Hoa hồng đã đặt cọc + hoa hồng từ các lịch hẹn đã xác nhận chưa xuất hóa đơn)
    const depositedComm = ctvInvoices
      .filter(i => i.paymentStatus === "Đã cọc")
      .reduce((sum, i) => sum + (i.commissionAmount || 0), 0);

    const pendingAptComm = ctvAppointments
      .filter(a => !invoiceAptIds.has(a.id) && (a.status === "Chờ xác nhận" || a.status === "Đã xác nhận" || a.status === "Đang điều trị"))
      .reduce((sum, a) => sum + Math.round(35000000 * 0.15), 0);

    const computedPending = depositedComm + pendingAptComm;
    const pendingBalance = computedPending > 0 ? computedPending : ctvUser.pendingBalance;

    // Metric 3: DOANH SỐ TÍCH LŨY
    const invoiceRevenue = ctvInvoices
      .filter(i => i.paymentStatus === "Đã cọc" || i.paymentStatus === "Đã thu đủ (Hoàn thành)")
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const aptRevenue = ctvAppointments
      .filter(a => !invoiceAptIds.has(a.id) && (a.status === "Hoàn thành" || a.status === "Đã xác nhận"))
      .reduce((sum, a) => sum + 35000000, 0);

    const computedRevenue = invoiceRevenue + aptRevenue;
    const totalRevenue = computedRevenue > 0 ? computedRevenue : ctvUser.totalRevenue;

    // Tính Cấp Bạc / Vàng / Bạch Kim / Kim Cương động theo doanh số tích lũy
    let tier = "Bạc";
    if (totalRevenue >= 500000000) {
      tier = "Kim Cương";
    } else if (totalRevenue >= 200000000) {
      tier = "Bạch Kim";
    } else if (totalRevenue >= 50000000) {
      tier = "Vàng";
    } else {
      tier = ctvUser.tier || "Kim Cương";
    }

    // Metric 4: TỶ LỆ CHUYỂN ĐỔI (Số ca chốt thành công / Tổng số ca giới thiệu)
    const uniqueReferralIds = new Set([
      ...ctvAppointments.map(a => a.id),
      ...ctvLeads.map(l => l.id),
      ...ctvInvoices.map(i => i.appointmentId || i.id)
    ]);
    const totalReferrals = Math.max(uniqueReferralIds.size, ctvUser.totalReferrals || 0);

    const successfulIds = new Set([
      ...ctvInvoices.map(i => i.appointmentId || i.id),
      ...ctvAppointments.filter(a => a.status === "Đã xác nhận" || a.status === "Đang điều trị" || a.status === "Hoàn thành").map(a => a.id),
      ...ctvLeads.filter(l => l.status === "Đã đặt lịch" || l.status === "Đã hoàn thành" || l.status === "Đã tư vấn").map(l => l.id)
    ]);
    const successfulReferrals = Math.max(successfulIds.size, ctvUser.successfulReferrals || 0);

    const conversionRate = totalReferrals > 0
      ? Math.round((successfulReferrals / totalReferrals) * 100)
      : (ctvUser.conversionRate || 0);

    return {
      ...ctvUser,
      availableBalance,
      pendingBalance,
      totalRevenue,
      totalCommission,
      tier,
      totalReferrals,
      successfulReferrals,
      conversionRate
    };
  }, [ctvUser, invoices, appointments, leads, payoutRequests]);

  // Sync state changes to LocalStorage
  useEffect(() => {
    safeSetLocalStorage("saohan_ctv_user", JSON.stringify(ctvUser));
  }, [ctvUser]);

  useEffect(() => {
    safeSetLocalStorage("saohan_services", JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    safeSetLocalStorage("saohan_leads", JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    safeSetLocalStorage("saohan_appointments", JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    safeSetLocalStorage("saohan_promotions", JSON.stringify(promotions));
  }, [promotions]);

  useEffect(() => {
    safeSetLocalStorage("saohan_video_guides", JSON.stringify(videoGuides));
  }, [videoGuides]);

  useEffect(() => {
    safeSetLocalStorage("saohan_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeSetLocalStorage("saohan_payout_requests", JSON.stringify(payoutRequests));
  }, [payoutRequests]);

  useEffect(() => {
    safeSetLocalStorage("saohan_feedbacks", JSON.stringify(feedbacks));
  }, [feedbacks]);

  // Feedback CRUD Handlers — localStorage + Supabase
  const handleAddFeedback = (newFb: ServiceFeedback) => {
    setFeedbacks((prev) => {
      const updated = [newFb, ...prev];
      safeSetLocalStorage("saohan_feedbacks", JSON.stringify(updated));
      return updated;
    });
    saveFeedbackToSupabase(newFb).catch((err) =>
      console.error("[Supabase] Lỗi thêm feedback:", err)
    );
  };

  const handleUpdateFeedback = (updatedFb: ServiceFeedback) => {
    setFeedbacks((prev) => {
      const updated = prev.map((f) => (f.id === updatedFb.id ? updatedFb : f));
      safeSetLocalStorage("saohan_feedbacks", JSON.stringify(updated));
      return updated;
    });
    saveFeedbackToSupabase(updatedFb).catch((err) =>
      console.error("[Supabase] Lỗi cập nhật feedback:", err)
    );
  };

  const handleDeleteFeedback = (fbId: string) => {
    setFeedbacks((prev) => {
      const updated = prev.filter((f) => f.id !== fbId);
      safeSetLocalStorage("saohan_feedbacks", JSON.stringify(updated));
      return updated;
    });
    deleteFeedbackFromSupabase(fbId).catch((err) =>
      console.error("[Supabase] Lỗi xóa feedback:", err)
    );
  };

  // Accountant payout handlers
  const handleApprovePayoutRequest = (requestId: string) => {
    const target = payoutRequests.find((r) => r.id === requestId);
    if (target) {
      notifyPayoutCompleted({
        ctvUserId: target.ctvCode,
        ctvName: target.ctvName,
        amount: target.amount,
        status: "Đã duyệt chi tiền VietQR"
      });
      notifyZaloPayoutCompleted({
        ctvCode: target.ctvCode,
        ctvName: target.ctvName,
        amount: target.amount,
        status: "Đã duyệt chi tiền VietQR"
      });
    }
    setPayoutRequests(
      payoutRequests.map((r) => (r.id === requestId ? { ...r, status: "Hoàn thành - Đã chi tiền VietQR" as const } : r))
    );
    showToast("Kế toán đã duyệt giải ngân tự động qua VietQR thành công!");
  };

  const handleUpdatePayoutRequest = (updatedReq: PayoutRequest) => {
    setPayoutRequests((prev) => prev.map((r) => (r.id === updatedReq.id ? updatedReq : r)));
    savePayoutRequestToSupabase(updatedReq);
    showToast(`Đã cập nhật trạng thái lệnh ${updatedReq.id}: ${updatedReq.status}`);
  };

  const handleRejectPayoutRequest = (requestId: string) => {
    setPayoutRequests(
      payoutRequests.map((r) => (r.id === requestId ? { ...r, status: "Từ chối" as const } : r))
    );
    showToast("Đã từ chối yêu cầu rút tiền.");
  };

  // Pre-filled state for CRM booking from other tabs
  const [prefilledService, setPrefilledService] = useState<string | undefined>(undefined);
  const [prefilledNotes, setPrefilledNotes] = useState<string | undefined>(undefined);

  // Toast alert state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(ctvUser.code);
    setCopiedCode(true);
    showToast(`Đã sao chép mã giới thiệu: ${ctvUser.code}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Clean System Live Data helper
  const handleResetData = () => {
    localStorage.clear();
    setCtvUser({
      ...INITIAL_CTV,
      totalRevenue: 0,
      totalCommission: 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalReferrals: 0,
      successfulReferrals: 0,
      conversionRate: 0
    });
    setServices(SERVICES_DATA);
    setLeads([]);
    setAppointments([]);
    setPayoutRequests([]);
    setPromotions(PROMOTIONS);
    setVideoGuides(VIDEO_GUIDES);
    setNotifications([
      {
        id: "notif-live-1",
        time: "Vừa xong",
        text: "🚀 Hệ thống KOREAN STAR vận hành chính thức - Kết nối Supabase Realtime Cloud 24/7!",
        type: "commission"
      }
    ]);
    showToast("Đã khởi tạo hệ thống dữ liệu sạch sẵn sàng chạy thực tế trên Supabase!");
  };

  // CRUD Handlers for Services — localStorage + Supabase
  const handleAddService = (newSrv: ServiceItem) => {
    setServices((prev) => {
      const updated = [newSrv, ...prev];
      localStorage.setItem("saohan_services", JSON.stringify(updated));
      return updated;
    });
    // Push lên Supabase bất đồng bộ
    saveServiceToSupabase(newSrv).catch((err) =>
      console.error("[Supabase] Lỗi thêm dịch vụ:", err)
    );
    showToast(`Đã thêm dịch vụ mới: "${newSrv.name}"!`);
  };

  const handleUpdateService = (updatedSrv: ServiceItem) => {
    setServices((prev) => {
      const updated = prev.map((s) => (s.id === updatedSrv.id ? updatedSrv : s));
      localStorage.setItem("saohan_services", JSON.stringify(updated));
      return updated;
    });
    // Upsert lên Supabase bất đồng bộ
    saveServiceToSupabase(updatedSrv).catch((err) =>
      console.error("[Supabase] Lỗi cập nhật dịch vụ:", err)
    );
    showToast(`Đã cập nhật dịch vụ: "${updatedSrv.name}"!`);
  };

  const handleDeleteService = (srvId: string) => {
    setServices((prev) => {
      const srvName = prev.find((s) => s.id === srvId)?.name || srvId;
      const updated = prev.filter((s) => s.id !== srvId);
      localStorage.setItem("saohan_services", JSON.stringify(updated));
      showToast(`Đã xóa dịch vụ "${srvName}"!`);
      return updated;
    });
    // Xóa trên Supabase bất đồng bộ
    deleteServiceFromSupabase(srvId).catch((err) =>
      console.error("[Supabase] Lỗi xóa dịch vụ:", err)
    );
  };

  // CRUD Handlers for Promotions
  const handleAddPromo = (newPromo: Promotion) => {
    setPromotions([newPromo, ...promotions]);
    showToast(`Đã thêm mã ưu đãi mới: "${newPromo.code}"!`);
  };

  const handleUpdatePromo = (updatedPromo: Promotion) => {
    setPromotions(promotions.map((p) => (p.id === updatedPromo.id ? updatedPromo : p)));
    showToast(`Đã cập nhật mã ưu đãi: "${updatedPromo.code}"!`);
  };

  const handleDeletePromo = (promoId: string) => {
    setPromotions(promotions.filter((p) => p.id !== promoId));
    showToast("Đã xóa mã ưu đãi thành công!");
  };

  // CRUD Handlers for Medical Videos
  const handleAddVideo = (newVid: VideoGuide) => {
    setVideoGuides([newVid, ...videoGuides]);
    showToast(`Đã thêm bài viết/video mới: "${newVid.title}"!`);
  };

  const handleUpdateVideo = (updatedVid: VideoGuide) => {
    setVideoGuides(videoGuides.map((v) => (v.id === updatedVid.id ? updatedVid : v)));
    showToast(`Đã cập nhật bài viết/video: "${updatedVid.title}"!`);
  };

  const handleDeleteVideo = (vidId: string) => {
    setVideoGuides(videoGuides.filter((v) => v.id !== vidId));
    showToast("Đã xóa bài viết/video thành công!");
  };

  // Helper: Book Appointment from any component
  const handleBookFromComponent = (serviceName: string, notes: string) => {
    setPrefilledService(serviceName);
    setPrefilledNotes(notes);
    setActiveTab("crm-appointments");
    showToast(`Đã chọn dịch vụ "${serviceName}". Hãy điền thông tin để hoàn tất lịch hẹn!`);
  };

  // Helper: Generate link for specific service
  const handleGenerateServiceLink = (serviceName: string) => {
    setActiveTab("ctv-dashboard");
    showToast(`Đã chuyển tới bộ tạo link CTV cho dịch vụ "${serviceName}".`);
  };

  // Helper: Add Appointment
  const handleAddAppointment = async (newApt: Appointment) => {
    const updatedAppointments = [newApt, ...appointments];
    setAppointments(updatedAppointments);
    safeSetLocalStorage("saohan_appointments", JSON.stringify(updatedAppointments));

    // Lưu lên Supabase NGAY LẬP TỨC để đồng bộ giữa CTV và Admin
    try {
      await saveAppointmentToSupabase(newApt);
    } catch (err) {
      console.error("[Supabase] Lỗi lưu appointment:", err);
    }

    // Create a new referral lead automatically
    const newLead: ReferralLead = {
      id: `lead-${Date.now()}`,
      customerName: newApt.customerName,
      customerPhone: newApt.customerPhone,
      serviceId: "srv-custom",
      serviceName: newApt.serviceName,
      ctvCode: ctvUser.code,
      ctvName: ctvUser.name,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: "Đã đặt lịch",
      estimatedValue: 35000000,
      commission: 5250000,
      doctorAssigned: newApt.doctorName,
      appointmentDate: newApt.date
    };
    setLeads([newLead, ...leads]);

    addSystemNotification({
      title: "Lịch Hẹn Mới Khách Hàng",
      text: `🔥 Khách hàng ${newApt.customerName} vừa đặt lịch "${newApt.serviceName}" qua mã ${ctvUser.code}!`,
      type: "lead"
    });

    showToast(`Tạo lịch hẹn thành công cho khách hàng ${newApt.customerName}!`);
  };

  // Helper: Update Appointment (Admin & CTV)
  const handleUpdateAppointment = async (updatedApt: Appointment) => {
    const updatedAppointments = appointments.map((apt) =>
      apt.id === updatedApt.id ? updatedApt : apt
    );
    setAppointments(updatedAppointments);
    safeSetLocalStorage("saohan_appointments", JSON.stringify(updatedAppointments));

    try {
      await saveAppointmentToSupabase(updatedApt);
    } catch (err) {
      console.error("[Supabase] Lỗi cập nhật appointment:", err);
    }

    showToast(`Đã cập nhật lịch hẹn cho khách hàng ${updatedApt.customerName}!`);
  };

  // Helper: Delete Appointment (Admin Only)
  const handleDeleteAppointment = async (id: string) => {
    const targetApt = appointments.find((a) => a.id === id);
    const updatedAppointments = appointments.filter((apt) => apt.id !== id);
    setAppointments(updatedAppointments);
    safeSetLocalStorage("saohan_appointments", JSON.stringify(updatedAppointments));

    try {
      await deleteAppointmentFromSupabase(id);
    } catch (err) {
      console.error("[Supabase] Lỗi xóa appointment:", err);
    }

    showToast(`Đã xóa vĩnh viễn lịch hẹn ${targetApt ? `của ${targetApt.customerName}` : id}!`);
  };

  // Helper: Update Appointment status in CRM
  const handleUpdateStatus = (id: string, newStatus: Appointment["status"]) => {
    const updatedAppointments = appointments.map((apt) =>
      apt.id === id ? { ...apt, status: newStatus } : apt
    );
    setAppointments(updatedAppointments);
    safeSetLocalStorage("saohan_appointments", JSON.stringify(updatedAppointments));

    // Async sync to Supabase DB
    updateAppointmentStatusInSupabase(id, newStatus);
    const targetApt = updatedAppointments.find((a) => a.id === id);
    if (targetApt) {
      saveAppointmentToSupabase(targetApt);

      // Tự động cộng hoa hồng & số dư khả dụng cho CTV khi lịch hẹn hoàn thành
      if (newStatus === "Hoàn thành") {
        const matchingInv = invoices.find(i => i.appointmentId === targetApt.id || i.customerPhone === targetApt.customerPhone);
        const commAmount = matchingInv ? matchingInv.commissionAmount : Math.round(35000000 * 0.15);
        const targetCtvCode = targetApt.ctvCode || matchingInv?.ctvCode || ctvUser.code;
        if (targetCtvCode) {
          handleCreditCTVCommission(targetCtvCode, commAmount, targetApt.serviceName);
        }
      }
    }

    showToast(`Đã cập nhật trạng thái lịch hẹn sang: "${newStatus}"`);
  };

  // Helper: Refresh appointments from Supabase (for Admin to sync across sessions)
  const handleRefreshAppointments = async () => {
    try {
      const remoteAppointments = await fetchAppointmentsFromSupabase();
      if (remoteAppointments && remoteAppointments.length > 0) {
        setAppointments(remoteAppointments);
        localStorage.setItem("saohan_appointments", JSON.stringify(remoteAppointments));
        showToast(`Đã đồng bộ ${remoteAppointments.length} lịch hẹn từ hệ thống!`);
      } else {
        showToast("Không có lịch hẹn mới từ hệ thống.");
      }
    } catch (err) {
      showToast("Không thể đồng bộ lịch hẹn. Vui lòng thử lại.");
    }
  };

  // Helper: Approve Lead in Admin view -> releases commission
  const handleApproveLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setLeads(
      leads.map((l) => (l.id === leadId ? { ...l, status: "Đã hoàn thành" } : l))
    );

    // Update CTV balance
    setCtvUser((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance + lead.commission,
      totalCommission: prev.totalCommission + lead.commission,
      successfulReferrals: prev.successfulReferrals + 1
    }));

    addSystemNotification({
      title: "Admin Duyệt Đơn Hoa Hồng",
      text: `🎉 Admin vừa duyệt đơn ${lead.customerName}! Hoa hồng +${lead.commission.toLocaleString("vi-VN")}đ đã cộng vào ví.`,
      type: "commission"
    });

    showToast(`Đã duyệt đơn và cộng ${lead.commission.toLocaleString("vi-VN")}đ hoa hồng vào tài khoản CTV!`);
  };
  // Helper: Execute payout
  const handleConfirmPayout = (amount: number, bankDetails?: { bankName: string; accountNumber: string; accountHolder: string }) => {
    const nowStr = formatDateTimeVN(new Date().toISOString().replace("T", " ").slice(0, 16));
    const reqId = `req-[#PAY-${Math.floor(100 + Math.random() * 900)}]`;
    const finalBankName = bankDetails?.bankName || ctvUser.bankAccount?.bankName || (ctvUser as any).bankName || "MBBank (Ngân Hàng Quân Đội)";
    const finalAccNo = bankDetails?.accountNumber || ctvUser.bankAccount?.accountNumber || (ctvUser as any).accountNumber || "";
    const finalAccHolder = bankDetails?.accountHolder || ctvUser.bankAccount?.accountHolder || (ctvUser as any).accountHolder || ctvUser.name;

    const newReq: PayoutRequest = {
      id: reqId,
      ctvCode: ctvUser.code,
      ctvName: ctvUser.name,
      amount,
      bankName: finalBankName,
      accountNumber: finalAccNo,
      accountHolder: finalAccHolder,
      requestedAt: nowStr,
      status: "Chờ kế toán kiểm tra",
      logs: [
        {
          id: `log-${Date.now()}`,
          payoutId: reqId,
          timestamp: nowStr,
          actorRole: "ctv",
          actorName: ctvUser.name,
          action: "Khởi tạo yêu cầu rút ví hoa hồng",
          newStatus: "Chờ kế toán kiểm tra",
          notes: `CTV tạo lệnh rút ${amount.toLocaleString("vi-VN")}đ về ${finalBankName} (${finalAccNo} - ${finalAccHolder})`
        }
      ]
    };

    setPayoutRequests((prev) => [newReq, ...prev]);
    savePayoutRequestToSupabase(newReq);
    setCtvUser((prev) => ({
      ...prev,
      availableBalance: Math.max(0, prev.availableBalance - amount),
      pendingBalance: prev.pendingBalance + amount
    }));
    showToast(`Đã gửi lệnh rút tiền ${reqId} về ${finalBankName} (${finalAccNo}) thành công!`);
  };

  // Navigate to Before-After gallery filtered by service
  const handleViewBeforeAfter = (serviceId: string) => {
    setBeforeAfterServiceFilter(serviceId);
    setActiveTab("before-after");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Quick Navigation items dynamically tailored & ordered by active user role
  const userRoleKey = authUser?.role || currentRole || "ctv";

  const allQuickNavItems = [
    { id: "admin", title: "Bảng Admin", sub: "Quản trị & Phân quyền Supabase", icon: ShieldCheck, color: "from-[#0B192C] to-red-950", roles: ["admin"] },
    { id: "editor", title: "Biên Tập Viên", sub: "Cập nhật bài viết & ảnh 3D", icon: FileText, color: "from-purple-600 to-indigo-700", roles: ["admin", "editor"] },
    { id: "accountant", title: "Kế Toán Quỹ", sub: "Duyệt giải ngân VietQR", icon: Wallet, color: "from-emerald-600 to-teal-700", roles: ["admin", "accountant"] },
    { id: "ctv-dashboard", title: "Hoa Hồng CTV", sub: "Ví & Doanh số", icon: Coins, color: "from-amber-500 to-amber-600", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "service-catalog", title: "Bảng Dịch Vụ", sub: "Giá niêm yết", icon: Stethoscope, color: "from-emerald-600 to-teal-600", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "before-after", title: "Ảnh Trước Sau", sub: "Feedback thực tế", icon: Camera, color: "from-purple-600 to-indigo-600", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "medical-knowledge", title: "Kiến Thức Y Khoa", sub: "Video & Bài viết", icon: GraduationCap, color: "from-blue-600 to-cyan-600", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "implant-3d", title: "Mô Phỏng 3D", sub: "Size túi 360°", icon: Eye, color: "from-indigo-600 to-blue-700", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "skin-ai", title: "Soi Da AI", sub: "Phác đồ Gemini", icon: Sparkles, color: "from-pink-600 to-rose-600", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "combo-builder", title: "Phối Combo", sub: "Gói liệu trình", icon: Layers, color: "from-amber-600 to-orange-600", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "crm-appointments", title: "Lịch Hẹn CRM", sub: "Tư vấn & Khám", icon: CalendarHeart, color: "from-rose-600 to-red-600", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "post-op", title: "Hậu Phẫu 24/7", sub: "Chăm sóc & Nhắc", icon: HeartPulse, color: "from-cyan-600 to-blue-600", roles: ["admin", "editor", "accountant", "ctv"] },
    { id: "promotions", title: "Ưu Đãi Hot", sub: "Flash Sale Realtime", icon: Flame, color: "from-orange-500 to-amber-500", roles: ["admin", "editor", "accountant", "ctv"] }
  ];

  const quickNavItems = allQuickNavItems.filter((item) => item.roles.includes(userRoleKey));

  // Hàm làm mới toàn bộ dữ liệu Supabase khi người dùng kéo vuốt từ trên xuống trên thiết bị di động / PWA
  const handleGlobalDataRefresh = async () => {
    try {
      // 1. Đồng bộ danh sách dịch vụ
      const remoteServices = await fetchServicesFromSupabase();
      if (remoteServices && remoteServices.length > 0) {
        setServices(remoteServices);
        safeSetLocalStorage("saohan_services", JSON.stringify(remoteServices));
      }

      // 2. Đồng bộ phản hồi khách hàng
      const remoteFeedbacks = await fetchFeedbacksFromSupabase();
      if (remoteFeedbacks && remoteFeedbacks.length > 0) {
        setFeedbacks(remoteFeedbacks);
        safeSetLocalStorage("saohan_feedbacks", JSON.stringify(remoteFeedbacks));
      }

      // 3. Đồng bộ lịch hẹn CRM
      const remoteAppointments = await fetchAppointmentsFromSupabase();
      if (remoteAppointments !== null) {
        setAppointments(remoteAppointments);
        safeSetLocalStorage("saohan_appointments", JSON.stringify(remoteAppointments));
      }

      // 4. Đồng bộ yêu cầu rút tiền
      const remotePayouts = await fetchPayoutRequestsFromSupabase();
      if (remotePayouts !== null) {
        setPayoutRequests(remotePayouts);
        safeSetLocalStorage("saohan_payout_requests", JSON.stringify(remotePayouts));
      }

      // 5. Đồng bộ hóa đơn doanh thu
      const remoteInvoices = await fetchInvoicesFromSupabase();
      if (remoteInvoices !== null) {
        setInvoices(remoteInvoices);
        safeSetLocalStorage("saohan_invoices", JSON.stringify(remoteInvoices));
      }

      showToast("✨ Đã cập nhật xong dữ liệu mới nhất từ Supabase!");
    } catch (err) {
      showToast("Đã làm mới dữ liệu hệ thống!");
    }
  };

  // Mandatory Login Gate: Render AuthPage if user is not logged in
  if (!authUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <PullToRefresh onRefresh={handleGlobalDataRefresh}>
      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased selection:bg-amber-500 selection:text-white flex flex-col">
      
      {/* Toast Notification Alert */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 bg-[#0B192C] border border-blue-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideUp text-xs backdrop-blur-md max-w-sm">
          <Bell className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Real WebApp Top Header Navigation (Ẩn khi ở Admin Dashboard để Admin Full Screen) */}
      {activeTab !== "admin" && (
        <Header
          currentRole={currentRole}
          onRoleChange={(role) => {
            setCurrentRole(role);
            if (role === "admin") setActiveTab("admin");
            else if (role === "editor") setActiveTab("editor");
            else if (role === "accountant") setActiveTab("accountant");
            else if (role === "customer") setActiveTab("service-catalog");
            else setActiveTab("ctv-dashboard");
          }}
          onSignOut={handleSignOut}
          ctvUser={ctvUser}
          notifications={notifications}
          onOpenPayout={() => setPayoutModalOpen(true)}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onOpenAuthModal={() => setAuthModalOpen(true)}
          onOpenProfileModal={() => setProfileModalOpen(true)}
          authUser={authUser}
          onClearNotifications={() => setNotifications([])}
          onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))}
          onNotificationClick={(notif) =>
            setNotifications((prev) =>
              prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
            )
          }
        />
      )}

      {/* Main WebApp Envelope Container (Full Screen riêng cho Admin Dashboard) */}
      {activeTab === "admin" ? (
        <div className="w-full min-h-screen flex-1 flex flex-col bg-slate-100/80">
          <AdminDashboard
            ctvUser={ctvUser}
            leads={leads}
            appointments={appointments}
            services={services}
            feedbacks={feedbacks}
            payoutRequests={payoutRequests}
            authUser={authUser}
            onApproveLead={handleApproveLead}
            onAddService={handleAddService}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
            onAddFeedback={handleAddFeedback}
            onUpdateFeedback={handleUpdateFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointment={handleUpdateAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onUpdateStatus={handleUpdateStatus}
            onUpdatePayoutRequest={handleUpdatePayoutRequest}
            onViewBeforeAfter={(serviceId) => handleViewBeforeAfter(serviceId)}
            onBookAppointment={(serviceName, notes) => handleBookFromComponent(serviceName, notes)}
            onGenerateServiceLink={(serviceName) => handleGenerateServiceLink(serviceName)}
            onRefreshAppointments={handleRefreshAppointments}
            invoices={invoices}
            onUpdateInvoice={handleUpdateInvoice}
            onCreditCTVCommission={handleCreditCTVCommission}
            onRoleChange={(role) => {
              setCurrentRole(role);
              if (role === "ctv") setActiveTab("ctv-dashboard");
              else if (role === "customer") setActiveTab("service-catalog");
              else setActiveTab("admin");
            }}
            onSignOut={handleSignOut}
          />
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col space-y-5">
        
        {/* User Status Summary Banner - Tailored per role */}
        {activeTab === "ctv-dashboard" && (
          <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-blue-900/40 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              {/* User Avatar & Info */}
              <div className="flex items-center gap-4">
                <img
                  src={authUser?.avatarUrl || authUser?.avatar || ctvUser.avatar}
                  alt={ctvUser.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-amber-400 shadow-md shrink-0 bg-slate-800"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-black text-base sm:text-xl text-white">{effectiveCtvUser.name}</h2>
                    <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-[#0B192C] font-extrabold text-xs px-2.5 py-0.5 rounded-full font-mono shadow-xs">
                      Cấp {effectiveCtvUser.tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-mono mt-1">
                    <span>Mã Giới Thiệu:</span>
                    <strong className="text-amber-400 font-extrabold text-sm">{effectiveCtvUser.code}</strong>
                    <button
                      onClick={copyCode}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"
                      title="Sao chép mã CTV"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Financial Highlights & Quick Actions */}
              <div className="flex items-center gap-3 sm:gap-6 flex-wrap w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-blue-900/60 pt-3 md:pt-0">
                <div>
                  <span className="text-[10px] sm:text-xs text-slate-300 uppercase block font-semibold">Ví khả dụng:</span>
                  <span className="text-lg sm:text-2xl font-black font-mono text-amber-400">
                    {effectiveCtvUser.availableBalance.toLocaleString("vi-VN")} <span className="text-xs">VNĐ</span>
                  </span>
                </div>

                <div>
                  <span className="text-[10px] sm:text-xs text-slate-300 uppercase block font-semibold">Tổng hoa hồng:</span>
                  <span className="text-base sm:text-xl font-bold font-mono text-emerald-400">
                    {effectiveCtvUser.totalCommission.toLocaleString("vi-VN")} <span className="text-xs">VNĐ</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPayoutModalOpen(true)}
                    className="bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] text-xs font-black px-4 py-2.5 rounded-2xl transition shadow-lg flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Rút Hoa Hồng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Personalized Editor Banner */}
        {activeTab === "editor" && (
          <div className="bg-gradient-to-r from-[#0B192C] via-purple-950 to-[#0B192C] text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-purple-900/50 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <img
                  src={authUser?.avatarUrl || authUser?.avatar || ctvUser.avatar}
                  alt={authUser?.fullName || "Editor"}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-purple-400 shadow-md shrink-0 bg-slate-800"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-black text-base sm:text-xl text-white">{authUser?.fullName || "Biên Tập Viên Y Khoa"}</h2>
                    <span className="bg-purple-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full font-mono shadow-xs uppercase">
                      📝 BIÊN TẬP VIÊN CONTENT
                    </span>
                  </div>
                  <p className="text-xs text-purple-200 font-medium mt-1">
                    Quản lý bài viết y khoa, thư viện ảnh Trước/Sau 3D, danh mục dịch vụ & chương trình ưu đãi
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personalized Accountant Banner */}
        {activeTab === "accountant" && (
          <div className="bg-gradient-to-r from-[#0B192C] via-emerald-950 to-[#0B192C] text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-emerald-900/50 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <img
                  src={authUser?.avatarUrl || authUser?.avatar || ctvUser.avatar}
                  alt={authUser?.fullName || "Accountant"}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-4 border-emerald-400 shadow-md shrink-0 bg-slate-800"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-black text-base sm:text-xl text-white">{authUser?.fullName || "Bộ Phận Kế Toán"}</h2>
                    <span className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full font-mono shadow-xs uppercase">
                      💰 KẾ TOÁN GIẢI NGÂN VIETQR
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200 font-medium mt-1">
                    Duyệt giải ngân hoa hồng tự động qua VietQR 24/7, theo dõi biến động quỹ & báo cáo doanh thu
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Navigation Cards Bar - Hidden on Dashboard, CRM & Before-After pages per user directive */}
        {activeTab !== "ctv-dashboard" && activeTab !== "admin" && activeTab !== "editor" && activeTab !== "accountant" && activeTab !== "crm-appointments" && activeTab !== "before-after" && activeTab !== "service-catalog" && (
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Tính Năng Nổi Bật
              </span>
              <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {quickNavItems.length} Tiện ích thẩm mỹ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-2 sm:gap-2.5">
              {quickNavItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-200 flex items-center gap-2.5 group focus:outline-none ${
                      isActive
                        ? "bg-amber-500 text-[#0B192C] border-amber-500 shadow-md ring-2 ring-amber-400/40 scale-[1.02]"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-800 hover:scale-[1.01]"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                        isActive
                          ? "bg-[#0B192C] text-amber-400 shadow-sm"
                          : `bg-gradient-to-br ${item.color} text-white shadow-xs`
                      }`}
                    >
                      <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-extrabold leading-tight truncate ${isActive ? "text-[#0B192C]" : "text-slate-900"}`}>
                        {item.title}
                      </div>
                      <div className={`text-[10px] mt-0.5 truncate font-medium ${isActive ? "text-[#0B192C]/80" : "text-slate-500"}`}>
                        {item.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Active Tab Component Area */}
        <main className="flex-1 space-y-6 pb-20">
          
          {activeTab === "ctv-dashboard" && (
            <CTVHub
              ctvUser={effectiveCtvUser}
              leads={leads}
              appointments={appointments}
              invoices={invoices}
              payoutRequests={payoutRequests}
              services={services}
              feedbacks={feedbacks}
              onOpenPayoutModal={() => setPayoutModalOpen(true)}
              onSelectTab={(tabId) => setActiveTab(tabId)}
              onBookAppointment={(serviceName, notes) => handleBookFromComponent(serviceName, notes)}
              onGenerateServiceLink={(serviceName) => handleGenerateServiceLink(serviceName)}
              onViewBeforeAfter={(serviceId) => handleViewBeforeAfter(serviceId)}
              onDeleteLead={handleDeleteLead}
              onClearAllLeads={handleClearAllLeads}
            />
          )}

          {activeTab === "service-catalog" && (() => {
            const userRole = authUser?.role || currentRole;
            const canManageServices = userRole === "admin" || userRole === "editor";
            return (
              <ServiceCatalog
                services={services}
                onBookAppointment={(serviceName, notes) => handleBookFromComponent(serviceName, notes)}
                onGenerateServiceLink={(serviceName) => handleGenerateServiceLink(serviceName)}
                onViewBeforeAfter={(serviceId) => handleViewBeforeAfter(serviceId)}
                onAddService={canManageServices ? handleAddService : undefined}
                onUpdateService={canManageServices ? handleUpdateService : undefined}
                onDeleteService={canManageServices ? handleDeleteService : undefined}
                isAdmin={canManageServices}
              />
            );
          })()}

          {activeTab === "before-after" && (() => {
            const userRole = authUser?.role || currentRole;
            const canManageBeforeAfter = userRole === "admin" || userRole === "editor";
            return (
              <BeforeAfterGallery
                services={services}
                feedbacks={feedbacks}
                onBookAppointment={(serviceName, notes) => handleBookFromComponent(serviceName, notes)}
                onAddFeedback={canManageBeforeAfter ? handleAddFeedback : undefined}
                onUpdateFeedback={canManageBeforeAfter ? handleUpdateFeedback : undefined}
                onDeleteFeedback={canManageBeforeAfter ? handleDeleteFeedback : undefined}
                isAdmin={canManageBeforeAfter}
                initialServiceId={beforeAfterServiceFilter}
                onClearServiceFilter={() => setBeforeAfterServiceFilter("ALL")}
              />
            );
          })()}

          {activeTab === "medical-knowledge" && (
            <MedicalKnowledge
              videoGuides={videoGuides}
              onBookAppointment={(serviceName, notes) => handleBookFromComponent(serviceName, notes)}
              onAddVideo={handleAddVideo}
              onUpdateVideo={handleUpdateVideo}
              onDeleteVideo={handleDeleteVideo}
            />
          )}

          {activeTab === "implant-3d" && (
            <Implant3DViewer
              onBookAppointment={(serviceName, notes) => handleBookFromComponent(serviceName, notes)}
            />
          )}

          {activeTab === "skin-ai" && (
            <SkinAnalysisModal
              onBookAppointment={(serviceName, notes) => handleBookFromComponent(serviceName, notes)}
            />
          )}

          {activeTab === "combo-builder" && (
            <ComboBuilder
              services={services}
              onBookCombo={(comboTitle, totalCost, notes) => handleBookFromComponent(comboTitle, notes)}
            />
          )}

          {activeTab === "crm-appointments" && (
            <CRMAppointment
              appointments={appointments}
              services={services}
              onAddAppointment={handleAddAppointment}
              onUpdateAppointment={handleUpdateAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              onUpdateStatus={handleUpdateStatus}
              initialServiceName={prefilledService}
              initialNotes={prefilledNotes}
              ctvUser={ctvUser}
              authUser={authUser}
              isAdmin={currentRole === "admin" || authUser?.role === "admin" || authUser?.role === "accountant" || ctvUser?.role === "admin" || ctvUser?.role === "accountant"}
              onRefresh={async () => {
                try {
                  const remote = await fetchAppointmentsFromSupabase();
                  if (remote && remote.length > 0) {
                    setAppointments((prev) => {
                      const remoteIds = new Set(remote.map((a: any) => a.id));
                      const localOnly = prev.filter((a) => !remoteIds.has(a.id));
                      const merged = [...remote, ...localOnly];
                      safeSetLocalStorage("saohan_appointments", JSON.stringify(merged));
                      return merged;
                    });
                    showToast(`Đã đồng bộ ${remote.length} lịch hẹn từ Supabase thành công!`);
                  } else {
                    showToast("Đã làm mới. Giữ nguyên danh sách lịch hẹn hiện tại.");
                  }
                } catch (err) {
                  showToast("Không thể làm mới dữ liệu từ Supabase.");
                }
              }}
            />
          )}

          {activeTab === "post-op" && <PostOpCare />}

          {activeTab === "promotions" && (
            <PromotionsBanner
              promotions={promotions}
              onApplyPromo={(code) => {
                showToast(`Đã áp dụng mã ưu đãi: ${code}`);
                setActiveTab("service-catalog");
              }}
              onAddPromo={handleAddPromo}
              onUpdatePromo={handleUpdatePromo}
              onDeletePromo={handleDeletePromo}
            />
          )}

          {activeTab === "editor" && (
            <EditorDashboard
              services={services}
              videoGuides={videoGuides}
              promotions={promotions}
              feedbacks={feedbacks}
              onAddService={handleAddService}
              onUpdateService={handleUpdateService}
              onDeleteService={handleDeleteService}
              onAddVideo={handleAddVideo}
              onUpdateVideo={handleUpdateVideo}
              onDeleteVideo={handleDeleteVideo}
              onAddPromo={handleAddPromo}
              onUpdatePromo={handleUpdatePromo}
              onDeletePromo={handleDeletePromo}
              onAddFeedback={handleAddFeedback}
              onUpdateFeedback={handleUpdateFeedback}
              onDeleteFeedback={handleDeleteFeedback}
            />
          )}

          {activeTab === "accountant" && (
            <AccountantDashboard
              ctvUser={ctvUser}
              leads={leads}
              appointments={appointments}
              invoices={invoices}
              payoutRequests={payoutRequests}
              onApprovePayoutRequest={handleApprovePayoutRequest}
              onRejectPayoutRequest={handleRejectPayoutRequest}
              onUpdatePayoutRequest={handleUpdatePayoutRequest}
              onUpdateInvoice={handleUpdateInvoice}
              onUpdateAppointmentStatus={handleUpdateStatus}
              onCreditCTVCommission={handleCreditCTVCommission}
            />
          )}

        </main>
      </div>
    )}

      {/* Mobile Navigation Bottom Dock (Ẩn khi ở Admin Dashboard để Admin Full Screen) */}
      {activeTab !== "admin" && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200/90 z-40 backdrop-blur-xl px-1 py-1 shadow-2xl flex items-center justify-around text-[10px] text-[#0B192C] w-full max-w-full overflow-visible pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]">
          
          {/* 1. Trang Chủ */}
          <button
            onClick={() => { setActiveTab("ctv-dashboard"); setMobileMenuOpen(false); setAccountDrawerOpen(false); }}
            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition ${
              activeTab === "ctv-dashboard" ? "text-[#0B192C] font-black scale-105" : "text-[#0B192C]/80 hover:text-[#0B192C] font-bold"
            }`}
          >
            <Home className="w-5 h-5 shrink-0 text-[#0B192C]" />
            <span className="text-[9px] font-extrabold truncate w-full text-center text-[#0B192C]">Trang Chủ</span>
          </button>

          {/* 2. Dịch Vụ */}
          <button
            onClick={() => { setActiveTab("service-catalog"); setMobileMenuOpen(false); setAccountDrawerOpen(false); }}
            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition ${
              activeTab === "service-catalog" ? "text-[#0B192C] font-black scale-105" : "text-[#0B192C]/80 hover:text-[#0B192C] font-bold"
            }`}
          >
            <BookOpen className="w-5 h-5 shrink-0 text-[#0B192C]" />
            <span className="text-[9px] font-extrabold truncate w-full text-center text-[#0B192C]">Dịch Vụ</span>
          </button>

          {/* 3. Đặt Lịch (Nổi Tròn Ở Giữa - Nền Xanh Header Chữ Vàng Gold) */}
          <button
            onClick={() => { setActiveTab("crm-appointments"); setMobileMenuOpen(false); setAccountDrawerOpen(false); }}
            className="flex-1 min-w-0 flex flex-col items-center gap-0.5 relative -top-3 focus:outline-none group"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90 ring-4 ring-white bg-[#0B192C] text-amber-400 border border-amber-400/40 ${
              activeTab === "crm-appointments"
                ? "scale-110 shadow-[#0B192C]/50 ring-amber-400/60"
                : "hover:bg-[#1E3A8A]"
            }`}>
              <Calendar className="w-6 h-6 stroke-[2.5] text-amber-400" />
            </div>
            <span className="text-[9px] font-black text-amber-600 tracking-wide truncate w-full text-center">Đặt Lịch</span>
          </button>

          {/* 4. Thay Đổi Tài Khoản */}
          <button
            onClick={() => { setAccountDrawerOpen(!accountDrawerOpen); setMobileMenuOpen(false); }}
            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition ${
              accountDrawerOpen ? "text-[#0B192C] font-black scale-105" : "text-[#0B192C]/80 hover:text-[#0B192C] font-bold"
            }`}
          >
            <UserCog className="w-5 h-5 shrink-0 text-[#0B192C]" />
            <span className="text-[9px] font-extrabold truncate w-full text-center text-[#0B192C]">Đổi Tai Khoản</span>
          </button>

          {/* 5. Trợ Giúp 24/7 */}
          <button
            onClick={() => { setHelpModalOpen(true); setMobileMenuOpen(false); setAccountDrawerOpen(false); }}
            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition ${
              helpModalOpen ? "text-[#0B192C] font-black scale-105" : "text-[#0B192C]/80 hover:text-[#0B192C] font-bold"
            }`}
          >
            <Headphones className="w-5 h-5 shrink-0 text-[#0B192C]" />
            <span className="text-[9px] font-extrabold truncate w-full text-center text-[#0B192C]">Trợ Giúp</span>
          </button>
        </nav>
      )}

        {/* Mobile Payout Modal */}
        {payoutModalOpen && (
          <PayoutModal
            ctvUser={effectiveCtvUser}
            onClose={() => setPayoutModalOpen(false)}
            onConfirmPayout={handleConfirmPayout}
          />
        )}

        {/* Mobile Tools Drawer Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-[#0B192C]/70 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
            <div className="bg-white border-t border-slate-200 rounded-t-3xl p-5 text-slate-900 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl relative">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-1" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                    Bộ Công Cụ Hỗ Trợ WebApp
                  </h3>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                {quickNavItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full p-3.5 rounded-xl border font-medium flex items-center justify-between transition ${
                        isActive
                          ? "bg-amber-500 text-[#0B192C] font-bold border-amber-500 shadow-sm"
                          : "bg-slate-50 text-slate-800 border-slate-200/80 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-4 h-4" />
                        <span>{item.title} ({item.sub})</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Account Drawer Menu */}
        {accountDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-[#0B192C]/75 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
            <div className="bg-white border-t border-slate-200 rounded-t-3xl p-5 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-1" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                    Tài Khoản & Trung Tâm Dashboard
                  </h3>
                </div>
                <button
                  onClick={() => setAccountDrawerOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User info card */}
              <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] text-white p-4 rounded-2xl space-y-3 border border-blue-900 shadow-md">
                <div className="flex items-center gap-3">
                  <img src={ctvUser.avatar} alt={ctvUser.name} className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover shadow-sm" />
                  <div>
                    <div className="font-black text-sm text-white">{ctvUser.name}</div>
                    <div className="text-xs text-amber-400 font-mono font-extrabold">Mã CTV: {ctvUser.code}</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-blue-900/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-300 block font-medium">Ví khả dụng:</span>
                    <strong className="text-amber-400 font-mono text-sm">{ctvUser.availableBalance.toLocaleString("vi-VN")} VNĐ</strong>
                  </div>
                  <button
                    onClick={() => { setPayoutModalOpen(true); setAccountDrawerOpen(false); }}
                    className="bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xs"
                  >
                    Rút Hoa Hồng
                  </button>
                </div>
              </div>

              {/* Direct Dashboard Navigation Links */}
              <div className="space-y-2 text-xs">
                <span className="font-black text-slate-700 text-[11px] uppercase tracking-wider block">
                  TRUY CẬP TRANG DASHBOARD:
                </span>
                
                {/* 1. CTV Dashboard Link */}
                <button
                  onClick={() => {
                    setCurrentRole("ctv");
                    setActiveTab("ctv-dashboard");
                    setAccountDrawerOpen(false);
                    showToast("Đã chuyển sang Dashboard Cộng Tác Viên!");
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between text-left ${
                    activeTab === "ctv-dashboard"
                      ? "bg-amber-500 text-[#0B192C] font-black border-amber-500 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      activeTab === "ctv-dashboard" ? "bg-[#0B192C] text-amber-400" : "bg-amber-100 text-amber-800"
                    }`}>
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">Dashboard Cộng Tác Viên</div>
                      <div className="text-[10px] opacity-80 font-medium">Quản lý ví, hoa hồng & khách referral</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>

                {/* 2. Manager / Admin Dashboard Link */}
                <button
                  onClick={() => {
                    setCurrentRole("admin");
                    setActiveTab("admin");
                    setAccountDrawerOpen(false);
                    showToast("Đã chuyển sang Dashboard Ban Quản Lý Admin!");
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between text-left ${
                    activeTab === "admin"
                      ? "bg-[#0B192C] text-amber-400 font-black border-[#0B192C] shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">Dashboard Ban Quản Lý (Admin)</div>
                      <div className="text-[10px] text-slate-500 font-medium">Duyệt giải ngân hoa hồng & xếp hạng CTV</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>

                {/* 3. Editor Dashboard Link */}
                <button
                  onClick={() => {
                    setCurrentRole("editor");
                    setActiveTab("editor");
                    setAccountDrawerOpen(false);
                    showToast("Đã chuyển sang Dashboard Biên Tập Viên!");
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between text-left ${
                    activeTab === "editor"
                      ? "bg-amber-500 text-[#0B192C] font-black border-amber-500 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">Dashboard Biên Tập Viên (Content)</div>
                      <div className="text-[10px] text-slate-500 font-medium">Cập nhật dịch vụ, bài viết & ảnh Before/After 3D</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>

                {/* 4. Accountant Dashboard Link */}
                <button
                  onClick={() => {
                    setCurrentRole("accountant");
                    setActiveTab("accountant");
                    setAccountDrawerOpen(false);
                    showToast("Đã chuyển sang Dashboard Bộ Phận Kế Toán!");
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between text-left ${
                    activeTab === "accountant"
                      ? "bg-emerald-600 text-white font-black border-emerald-600 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">Dashboard Kế Toán & Quỹ Giải Ngân</div>
                      <div className="text-[10px] opacity-80 font-medium">Duyệt lệnh chuyển tiền VietQR 24/7</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>

                {/* 5. Customer Catalog Link */}
                <button
                  onClick={() => {
                    setCurrentRole("customer");
                    setActiveTab("service-catalog");
                    setAccountDrawerOpen(false);
                    showToast("Đã chuyển sang Giao diện Bảng giá Khách hàng!");
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between text-left ${
                    activeTab === "service-catalog"
                      ? "bg-amber-50 border-amber-400 text-amber-900 font-black"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs">Bảng Dịch Vụ Khách Hàng</div>
                      <div className="text-[10px] text-slate-500 font-medium">Bảng giá niêm yết & Đặt lịch tư vấn</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
              </div>



            </div>
          </div>
        )}

        {/* Payout Modal */}
        {payoutModalOpen && (
          <PayoutModal
            ctvUser={effectiveCtvUser}
            onClose={() => setPayoutModalOpen(false)}
            onConfirmPayout={handleConfirmPayout}
          />
        )}

        {/* Real Supabase Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* CTV Personal Profile Edit Modal */}
        <ProfileEditModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          authUser={authUser}
          ctvUser={ctvUser}
          onSaveProfile={handleSaveProfile}
        />

        {/* 24/7 Support & Guidance Modal */}
        <HelpSupportModal
          isOpen={helpModalOpen}
          onClose={() => setHelpModalOpen(false)}
        />

      </div>
    </PullToRefresh>
  );
}

