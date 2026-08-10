import React, { useState, useEffect } from "react";
import {
  AuthUserProfile,
  supabase,
  deleteUserProfileFromSupabase,
  toggleUserSuspensionInSupabase,
  fetchRolePermissionsFromSupabase,
  saveRolePermissionsToSupabase,
  deleteRolePermissionFromSupabase,
  fetchCmsSettingsFromSupabase,
  saveCmsSettingsToSupabase,
  fetchAllUserProfilesFromSupabase,
  saveRegisteredUserToLocalStorage,
  signUpUser
} from "../lib/supabase";
import { CTVUser } from "../types";
import { sendOneSignalNotification, notifySystemSettingsUpdated } from "../lib/onesignal";
import { ZaloNotifier } from "./ZaloNotifier";
import { ZaloStatsReportSender } from "./ZaloStatsReportSender";
import { registerZaloWebhook, refreshZaloOaAccessToken } from "../services/zaloService";
import { VIETNAM_BANKS, getBankLogo } from "../lib/banks";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/formatters";
import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  Key,
  Check,
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  Search,
  Filter,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Sparkles,
  Camera,
  RefreshCw,
  Phone,
  Mail,
  CreditCard,
  FileBadge,
  MapPin,
  Globe,
  Sliders,
  DollarSign,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  Layers,
  FileText,
  Stethoscope,
  QrCode,
  UserCheck,
  Award,
  TrendingUp,
  Percent,
  ChevronRight,
  MessageSquare,
  Smartphone,
  Download,
  CheckCircle2,
  PauseCircle,
  Play
} from "lucide-react";

interface SystemSettingsModuleProps {
  ctvUser: CTVUser;
  onToast: (msg: string) => void;
}

// Permission interface for CRUD matrix
export interface ModulePermission {
  moduleKey: string;
  moduleName: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface RoleConfig {
  id: string;
  roleKey: string;
  roleName: string;
  description: string;
  isSystem: boolean; // System roles cannot be deleted
  badgeColor: string;
  permissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;
}

export interface CTVTierConfig {
  id: string;
  tierName: string;
  minRevenue: number;
  maxRevenue: number | null;
  commissionRate: number;
  bonusMultiplier: number;
  badgeColor: string;
  benefits: string[];
  description: string;
}

export const DEFAULT_TIER_CONFIGS: CTVTierConfig[] = [
  {
    id: "tier-bac",
    tierName: "Bạc",
    minRevenue: 0,
    maxRevenue: 50000000,
    commissionRate: 10,
    bonusMultiplier: 1.0,
    badgeColor: "bg-slate-200 text-slate-800 border border-slate-300 font-extrabold",
    benefits: [
      "Chiết khấu hoa hồng cơ bản 10%",
      "Cấp mã CTV & link giới thiệu cá nhân",
      "Rút tiền hoa hồng về ngân hàng 24/7"
    ],
    description: "Cấp bậc khởi tạo cho CTV mới tham gia hệ thống"
  },
  {
    id: "tier-vang",
    tierName: "Vàng",
    minRevenue: 50000000,
    maxRevenue: 200000000,
    commissionRate: 15,
    bonusMultiplier: 1.15,
    badgeColor: "bg-amber-100 text-amber-900 border border-amber-300 font-black",
    benefits: [
      "Chiết khấu hoa hồng 15% (+5% so với Cấp Bạc)",
      "Hệ số thưởng doanh số x1.15",
      "Ưu tiên hỗ trợ đặt lịch CRM nhanh",
      "Tặng Banner marketing cá nhân hóa"
    ],
    description: "Dành cho CTV có tích lũy doanh số từ 50 Triệu VNĐ"
  },
  {
    id: "tier-bachkim",
    tierName: "Bạch Kim",
    minRevenue: 200000000,
    maxRevenue: 500000000,
    commissionRate: 20,
    bonusMultiplier: 1.30,
    badgeColor: "bg-cyan-100 text-cyan-900 border border-cyan-300 font-black",
    benefits: [
      "Chiết khấu hoa hồng 20% (+10% so với Cấp Bạc)",
      "Hệ số thưởng doanh số x1.30",
      "Bác sĩ chuyên khoa hỗ trợ tư vấn 1-1 cho KH",
      "Thư mời tham dự Workshop thẩm mỹ đỉnh cao"
    ],
    description: "Dành cho CTV có tích lũy doanh số từ 200 Triệu VNĐ"
  },
  {
    id: "tier-kimcuong",
    tierName: "Kim Cương",
    minRevenue: 500000000,
    maxRevenue: null,
    commissionRate: 25,
    bonusMultiplier: 1.50,
    badgeColor: "bg-purple-100 text-purple-900 border border-purple-300 font-black",
    benefits: [
      "Mức chiết khấu hoa hồng MAX 25%",
      "Hệ số thưởng doanh số tối đa x1.50",
      "VIP Hotline hỗ trợ riêng 24/7 từ BGĐ",
      "Du lịch trải nghiệm Thẩm mỹ Hàn Quốc hằng năm"
    ],
    description: "Đỉnh cao Cộng tác viên VIP tích lũy doanh số trên 500 Triệu VNĐ"
  }
];

const SYSTEM_MODULES = [
  { key: "services", name: "Bảng Dịch Vụ & Giá Niêm Yết", icon: Stethoscope },
  { key: "crm_appointments", name: "Quản Lý Lịch Hẹn CRM", icon: CalendarCheckIcon },
  { key: "payouts", name: "Duyệt Hoa Hồng & Giải Ngân VietQR", icon: QrCode },
  { key: "content", name: "Bài Viết Y Khoa & Thư Viện 3D", icon: FileText },
  { key: "ctv_management", name: "Danh Sách & Doanh Số CTV", icon: Users },
  { key: "ai_tools", name: "Công Cụ AI Soi Da & Size Túi 3D", icon: Sparkles },
  { key: "system_settings", name: "Cấu Hình & Cài Đặt Hệ Thống", icon: Settings }
];

function CalendarCheckIcon(props: any) {
  return <Stethoscope {...props} />;
}

const DEFAULT_ROLES: RoleConfig[] = [
  {
    id: "role-admin",
    roleKey: "admin",
    roleName: "Ban Quản Trị (Admin)",
    description: "Toàn quyền quản trị hệ thống, duyệt hoa hồng và quản lý phân quyền",
    isSystem: true,
    badgeColor: "bg-red-500 text-white",
    permissions: {
      services: { create: true, read: true, update: true, delete: true },
      crm_appointments: { create: true, read: true, update: true, delete: true },
      payouts: { create: true, read: true, update: true, delete: true },
      content: { create: true, read: true, update: true, delete: true },
      ctv_management: { create: true, read: true, update: true, delete: true },
      ai_tools: { create: true, read: true, update: true, delete: true },
      system_settings: { create: true, read: true, update: true, delete: true }
    }
  },
  {
    id: "role-ctv",
    roleKey: "ctv",
    roleName: "Cộng Tác Viên (CTV)",
    description: "Giới thiệu khách hàng, tạo lịch hẹn CRM, xem doanh số & rút ví hoa hồng",
    isSystem: true,
    badgeColor: "bg-amber-500 text-slate-900 font-extrabold",
    permissions: {
      services: { create: false, read: true, update: false, delete: false },
      crm_appointments: { create: true, read: true, update: false, delete: false },
      payouts: { create: true, read: true, update: false, delete: false },
      content: { create: false, read: true, update: false, delete: false },
      ctv_management: { create: false, read: true, update: false, delete: false },
      ai_tools: { create: true, read: true, update: false, delete: false },
      system_settings: { create: false, read: false, update: false, delete: false }
    }
  },
  {
    id: "role-editor",
    roleKey: "editor",
    roleName: "Biên Tập Viên (Editor)",
    description: "Quản lý bài viết y khoa, kho ảnh Before/After 3D & dịch vụ niêm yết",
    isSystem: true,
    badgeColor: "bg-purple-600 text-white",
    permissions: {
      services: { create: true, read: true, update: true, delete: false },
      crm_appointments: { create: false, read: true, update: false, delete: false },
      payouts: { create: false, read: false, update: false, delete: false },
      content: { create: true, read: true, update: true, delete: true },
      ctv_management: { create: false, read: true, update: false, delete: false },
      ai_tools: { create: true, read: true, update: true, delete: false },
      system_settings: { create: false, read: false, update: false, delete: false }
    }
  },
  {
    id: "role-accountant",
    roleKey: "accountant",
    roleName: "Bộ Phận Kế Toán (Accountant)",
    description: "Kiểm tra số dư, xác minh tài khoản ngân hàng & giải ngân VietQR 24/7",
    isSystem: true,
    badgeColor: "bg-emerald-600 text-white",
    permissions: {
      services: { create: false, read: true, update: false, delete: false },
      crm_appointments: { create: false, read: true, update: true, delete: false },
      payouts: { create: true, read: true, update: true, delete: true },
      content: { create: false, read: true, update: false, delete: false },
      ctv_management: { create: false, read: true, update: true, delete: false },
      ai_tools: { create: false, read: true, update: false, delete: false },
      system_settings: { create: false, read: false, update: false, delete: false }
    }
  },
  {
    id: "role-team-leader",
    roleKey: "team_leader",
    roleName: "Trưởng Nhóm CTV",
    description: "Quản lý nhóm CTV trực thuộc, xem doanh số nhóm và duyệt chuyển doanh số từ CTV thành viên",
    isSystem: true,
    badgeColor: "bg-blue-700 text-white",
    permissions: {
      services: { create: false, read: true, update: false, delete: false },
      crm_appointments: { create: true, read: true, update: false, delete: false },
      payouts: { create: true, read: true, update: false, delete: false },
      content: { create: false, read: true, update: false, delete: false },
      ctv_management: { create: false, read: true, update: false, delete: false },
      ai_tools: { create: true, read: true, update: false, delete: false },
      system_settings: { create: false, read: false, update: false, delete: false }
    }
  }
];

export const PRESET_PWA_LOGOS = [
  {
    id: "preset-star",
    name: "✨ Korean Star Gold",
    url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%230B192C'/><text y='.75em' x='50%' text-anchor='middle' font-size='60'>✨</text></svg>"
  },
  {
    id: "preset-hospital",
    name: "🏥 Thẩm Mỹ Viện Shield",
    url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%230F172A'/><path d='M50 15 L80 30 V60 C80 75 50 88 50 88 C50 88 20 75 20 60 V30 Z' fill='%23F59E0B'/><path d='M43 40 H57 V60 H43 Z M38 45 H62 V55 H38 Z' fill='%230F172A'/></svg>"
  },
  {
    id: "preset-crown",
    name: "👑 Crown VIP Gold",
    url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%230B192C'/><text y='.75em' x='50%' text-anchor='middle' font-size='60'>👑</text></svg>"
  },
  {
    id: "preset-diamond",
    name: "💎 Diamond Luxury",
    url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%230B192C'/><text y='.75em' x='50%' text-anchor='middle' font-size='60'>💎</text></svg>"
  }
];

export const SystemSettingsModule: React.FC<SystemSettingsModuleProps> = ({
  ctvUser,
  onToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"brand" | "pwa" | "financial" | "tiers" | "users" | "roles">("brand");

  // 1.5 CTV TIERS & COMMISSION PERCENTAGES STATE
  const [tierConfigs, setTierConfigs] = useState<CTVTierConfig[]>(() => {
    const saved = localStorage.getItem("saohan_ctv_tiers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_TIER_CONFIGS;
  });

  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CTVTierConfig | null>(null);
  const [tierFormData, setTierFormData] = useState({
    tierName: "",
    minRevenue: 0,
    maxRevenue: 50000000 as number | null,
    isUnlimited: false,
    commissionRate: 15,
    bonusMultiplier: 1.0,
    badgeColor: "bg-amber-100 text-amber-900 border border-amber-300 font-black",
    benefitsText: "",
    description: ""
  });

  const handleSaveTierConfigs = async (updated: CTVTierConfig[]) => {
    setTierConfigs(updated);
    localStorage.setItem("saohan_ctv_tiers", JSON.stringify(updated));
    try {
      const remoteConfig = {
        ...brandConfig,
        ctvTiers: updated
      };
      await saveCmsSettingsToSupabase(remoteConfig);
      onToast("Đã lưu & đồng bộ Cấu hình Cấp bậc & % Hoa Hồng lên Supabase thành công!");
    } catch (err) {}
  };

  const handleOpenAddTierModal = () => {
    setEditingTier(null);
    setTierFormData({
      tierName: "",
      minRevenue: 0,
      maxRevenue: 100000000,
      isUnlimited: false,
      commissionRate: 15,
      bonusMultiplier: 1.0,
      badgeColor: "bg-[#0B192C] text-amber-400 border border-amber-400/40 font-black",
      benefitsText: "Chiết khấu hoa hồng theo % quy định\nĐược tạo link giới thiệu riêng\nRút tiền hoa hồng 24/7",
      description: "Cấp bậc tùy chỉnh mới"
    });
    setTierModalOpen(true);
  };

  const handleOpenEditTierModal = (tier: CTVTierConfig) => {
    setEditingTier(tier);
    setTierFormData({
      tierName: tier.tierName,
      minRevenue: tier.minRevenue,
      maxRevenue: tier.maxRevenue,
      isUnlimited: tier.maxRevenue === null,
      commissionRate: tier.commissionRate,
      bonusMultiplier: tier.bonusMultiplier,
      badgeColor: tier.badgeColor,
      benefitsText: (tier.benefits || []).join("\n"),
      description: tier.description || ""
    });
    setTierModalOpen(true);
  };

  const handleSaveTierForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierFormData.tierName.trim()) {
      alert("Vui lòng nhập Tên Cấp Bậc!");
      return;
    }

    const benefits = tierFormData.benefitsText
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    const newTierObj: CTVTierConfig = {
      id: editingTier ? editingTier.id : `tier-${Date.now()}`,
      tierName: tierFormData.tierName.trim(),
      minRevenue: Number(tierFormData.minRevenue) || 0,
      maxRevenue: tierFormData.isUnlimited ? null : Number(tierFormData.maxRevenue) || 0,
      commissionRate: Number(tierFormData.commissionRate) || 0,
      bonusMultiplier: Number(tierFormData.bonusMultiplier) || 1.0,
      badgeColor: tierFormData.badgeColor,
      benefits: benefits.length > 0 ? benefits : ["Quyền lợi tích lũy doanh số mặc định"],
      description: tierFormData.description.trim() || `Tích lũy từ ${Number(tierFormData.minRevenue).toLocaleString()} VNĐ`
    };

    let updatedList: CTVTierConfig[] = [];
    if (editingTier) {
      updatedList = tierConfigs.map((t) => (t.id === editingTier.id ? newTierObj : t));
    } else {
      updatedList = [...tierConfigs, newTierObj];
    }

    updatedList.sort((a, b) => a.minRevenue - b.minRevenue);
    handleSaveTierConfigs(updatedList);
    setTierModalOpen(false);
  };

  const handleDeleteTierConfig = (tierId: string) => {
    const tierObj = tierConfigs.find((t) => t.id === tierId);
    if (tierConfigs.length <= 1) {
      alert("Hệ thống cần ít nhất 1 cấp bậc CTV!");
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa Cấp bậc '${tierObj?.tierName}'?`)) {
      const updated = tierConfigs.filter((t) => t.id !== tierId);
      handleSaveTierConfigs(updated);
    }
  };

  const handleResetDefaultTiers = () => {
    if (window.confirm("Khôi phục tất cả Cấp bậc & % Hoa Hồng về cài đặt mặc định của Bệnh viện?")) {
      handleSaveTierConfigs(DEFAULT_TIER_CONFIGS);
    }
  };

  // 1. BRAND & GENERAL SETTINGS STATE
  const [brandConfig, setBrandConfig] = useState(() => {
    const saved = localStorage.getItem("saohan_cms_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      hospitalName: "KOREAN STAR",
      logoUrl: "",
      tagline: "Hệ Thống Bệnh Viện Thẩm Mỹ Quốc Tế & Quản Lý CTV 24/7",
      hotline: "1900 8888 - 0901 888 999",
      zaloSupport: "0901 888 999",
      emailSupport: "cskh@koreanstar.vn",
      address: "Số 88 Phố Huế, Q. Hai Bà Trưng, Hà Nội",
      baseCommissionRate: 15,
      minPayoutAmount: 100000,
      maxSinglePayout: 100000000,
      autoPayoutThreshold: 50000000,
      payoutRefPrefix: "KS-PAY-",
      systemCurrency: "VNĐ",
      pwaAppName: "KOREAN STAR - Hệ Thống CTV & Thẩm Mỹ",
      pwaShortName: "KOREAN STAR",
      pwaThemeColor: "#F59E0B",
      pwaBgColor: "#0B192C",
      pwaDescription: "Hệ thống quản lý Cộng tác viên & Đặt lịch dịch vụ thẩm mỹ KOREAN STAR 24/7",
      pwaEnableInstallPrompt: true,
      oneSignalAppId: "",
      oneSignalApiKey: "",
      oneSignalEnabled: true,
      zaloBotToken: "",
      zaloDefaultChatId: ""
    };
  });

  // 2. USER ACCOUNTS MANAGEMENT STATE
  const [userAccounts, setUserAccounts] = useState<AuthUserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");

  // Add/Edit User Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUserProfile | null>(null);
  const [userFormData, setUserFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "ctv" as "ctv" | "admin" | "editor" | "accountant" | "team_leader",
    tier: "Bạc" as "Bạc" | "Vàng" | "Bạch Kim" | "Kim Cương",
    bankName: "MB Bank",
    accountNumber: "",
    idCardNumber: "",
    facilityName: ""
  });

  // Bank selector inside user modal
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userBankModalOpen, setUserBankModalOpen] = useState(false);
  const [userBankSearch, setUserBankSearch] = useState("");

  // 3. ROLES & CRUD PERMISSION MATRIX STATE
  const [rolesList, setRolesList] = useState<RoleConfig[]>(() => {
    const saved = localStorage.getItem("saohan_roles_permissions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_ROLES;
  });

  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("admin");

  // Add Custom Role Modal
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    roleName: "",
    roleKey: "",
    description: ""
  });

  // Fetch Users, Roles Matrix & CMS Settings from Supabase on mount
  useEffect(() => {
    fetchUsersFromSupabase();
    fetchRolesMatrixFromSupabase();
    fetchBrandConfigFromSupabase();
  }, []);

  // Re-fetch users from Supabase immediately whenever Admin opens User Accounts subtab
  useEffect(() => {
    if (activeSubTab === "users") {
      fetchUsersFromSupabase();
    }
  }, [activeSubTab]);

  const fetchBrandConfigFromSupabase = async () => {
    const remote = await fetchCmsSettingsFromSupabase();
    if (remote) {
      setBrandConfig((prev: any) => {
        const merged = {
          ...prev,
          ...remote,
          zaloBotToken: remote.zaloBotToken || prev.zaloBotToken || "",
          zaloDefaultChatId: remote.zaloDefaultChatId || prev.zaloDefaultChatId || "",
          oneSignalAppId: remote.oneSignalAppId || prev.oneSignalAppId || "",
          oneSignalApiKey: remote.oneSignalApiKey || prev.oneSignalApiKey || ""
        };
        localStorage.setItem("saohan_cms_settings", JSON.stringify(merged));
        return merged;
      });
    }
  };

  const fetchRolesMatrixFromSupabase = async () => {
    const remoteRoles = await fetchRolePermissionsFromSupabase();
    if (remoteRoles && remoteRoles.length > 0) {
      setRolesList(remoteRoles);
      localStorage.setItem("saohan_roles_permissions", JSON.stringify(remoteRoles));
    }
  };

  // Auto-sync userAccounts to localStorage
  useEffect(() => {
    if (userAccounts.length > 0) {
      localStorage.setItem("saohan_registered_users", JSON.stringify(userAccounts));
    }
  }, [userAccounts]);

  const fetchUsersFromSupabase = async () => {
    setLoadingUsers(true);
    try {
      const remoteUsers = await fetchAllUserProfilesFromSupabase(true);
      const localSaved = localStorage.getItem("saohan_registered_users");
      const localUsers: AuthUserProfile[] = localSaved ? JSON.parse(localSaved) : [];

      const userMap = new Map<string, AuthUserProfile>();

      // 1. Seed fallback default admin user
      const defaultAdmin: AuthUserProfile = {
        id: "56496f7b-5b74-4282-83dc-eeb8f1df3dab",
        email: "admin@saohan.vn",
        fullName: "Nguyễn Thị B (Admin)",
        phone: "0901888999",
        role: "admin",
        ctvCode: "SAOHAN-ADMIN",
        tier: "Kim Cương",
        availableBalance: 0,
        pendingBalance: 0,
        totalRevenue: 0,
        totalCommission: 0,
        bankName: "Vietcombank",
        accountNumber: "999988889999"
      };
      userMap.set("admin@saohan.vn", defaultAdmin);

      // 2. Add local users (from signups)
      localUsers.forEach((u) => {
        const key = (u.email || u.id).toLowerCase();
        userMap.set(key, u);
      });

      // 3. Add remote users from Supabase (merge fields)
      remoteUsers.forEach((u) => {
        const key = (u.email || u.id).toLowerCase();
        const existing = userMap.get(key);
        userMap.set(key, { ...existing, ...u });
      });

      const mergedList = Array.from(userMap.values());
      setUserAccounts(mergedList);
      localStorage.setItem("saohan_registered_users", JSON.stringify(mergedList));
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const [activatingWebhook, setActivatingWebhook] = useState(false);

  const handleRegisterWebhook = async () => {
    if (!brandConfig.zaloBotToken) {
      alert("Vui lòng nhập Zalo Bot Token trước khi kích hoạt Webhook!");
      return;
    }
    setActivatingWebhook(true);
    const targetUrl = `${window.location.origin}/api/zalo/webhook?token=${encodeURIComponent(brandConfig.zaloBotToken)}`;
    const res = await registerZaloWebhook(
      brandConfig.zaloBotToken,
      targetUrl,
      brandConfig.zaloWebhookSecret
    );
    setActivatingWebhook(false);
    if (res.ok) {
      onToast("🎉 Kích hoạt Webhook Zalo Bot API thành công! Bot đã sẵn sàng nhận tin nhắn & phản hồi Chat ID!");
    } else {
      const debugInfo = (res as any).debug;
      let errMsg = res.description || "Vui lòng kiểm tra lại Bot Token";
      if (debugInfo) {
        errMsg += `\n\n🔍 Debug:\n• Token (10 ký tự đầu): ${debugInfo.token_preview}\n• HTTP Status: ${(res as any).httpStatus || "N/A"}\n• Webhook URL: ${debugInfo.webhookUrl}`;
      }
      alert(`❌ Lỗi kích hoạt Webhook Zalo Bot API:\n\n${errMsg}`);
    }
  };

  const [refreshingToken, setRefreshingToken] = useState(false);

  const handleRefreshToken = async () => {
    const appId = brandConfig.zaloOaAppId || brandConfig.zaloBotToken;
    const secretKey = brandConfig.zaloOaSecretKey || brandConfig.zaloWebhookSecret;
    const refreshToken = brandConfig.zaloOaRefreshToken;

    if (!appId || !secretKey || !refreshToken) {
      alert("Vui lòng nhập Zalo OA App ID, Secret Key và Refresh Token trước khi thực hiện làm mới Access Token!");
      return;
    }

    setRefreshingToken(true);
    const res = await refreshZaloOaAccessToken({ appId, secretKey, refreshToken });
    setRefreshingToken(false);

    if (res.ok && res.accessToken) {
      setBrandConfig((prev) => ({
        ...prev,
        zaloOaAccessToken: res.accessToken,
        zaloBotToken: res.accessToken,
        zaloOaRefreshToken: res.refreshToken || prev.zaloOaRefreshToken
      }));
      onToast("🎉 Đã lấy lại Access Token Zalo OA mới từ Refresh Token thành công (Có hiệu lực 24h)!");
    } else {
      alert(`❌ Lỗi cấp lại Access Token Zalo OA:\n\n${res.description || "Không thể cấp lại token. Kiểm tra lại Refresh Token!"}`);
    }
  };

  // PWA LOGO UPLOAD & COMPRESSION HANDLER
  const handlePwaLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước file ảnh logo quá lớn (> 5MB). Vui lòng chọn ảnh nhỏ hơn!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      if (!base64Str) return;

      // Nén ảnh tự động qua Canvas max 512x512 cho PWA App Icon
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/png", 0.9);
          setBrandConfig((prev: any) => ({
            ...prev,
            pwaLogoUrl: compressedDataUrl,
            logoUrl: compressedDataUrl
          }));
          onToast("✨ Đã tải lên & nén ảnh Logo PWA (512x512) thành công!");
        }
      };
      img.src = base64Str;
    };
    reader.readAsDataURL(file);
  };

  // SAVE BRAND CONFIG TO SUPABASE
  const handleSaveBrandConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("saohan_cms_settings", JSON.stringify(brandConfig));
    await saveCmsSettingsToSupabase(brandConfig);
    notifySystemSettingsUpdated("Thương Hiệu & Cấu Hình Realtime");
    onToast("Đã lưu cấu hình thương hiệu & logo hệ thống lên Supabase thành công!");
  };

  // SAVE USER FORM TO SUPABASE
  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userFormData.fullName.trim()) {
      alert("Vui lòng nhập Họ Và Tên!");
      return;
    }

    if (editingUser) {
      // Edit User
      const updatedUser: AuthUserProfile = {
        ...editingUser,
        fullName: userFormData.fullName.trim(),
        phone: userFormData.phone.trim(),
        role: userFormData.role,
        tier: userFormData.tier,
        bankName: userFormData.bankName,
        accountNumber: userFormData.accountNumber.trim(),
        accountHolder: userFormData.fullName.trim().toUpperCase(),
        idCardNumber: userFormData.idCardNumber.trim(),
        facilityName: userFormData.facilityName.trim()
      };

      try {
        await supabase
          .from("user_profiles")
          .update({
            full_name: updatedUser.fullName,
            phone: updatedUser.phone,
            role: updatedUser.role,
            tier: updatedUser.tier,
            bank_name: updatedUser.bankName,
            account_number: updatedUser.accountNumber,
            account_holder: updatedUser.accountHolder,
            id_card_number: updatedUser.idCardNumber,
            facility_name: updatedUser.facilityName,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingUser.id);
      } catch (err) {}

      setUserAccounts((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
      onToast(`Đã cập nhật thông tin tài khoản ${updatedUser.fullName} lên Supabase thành công!`);
    } else {
      // Create New User
      if (!userFormData.email.trim()) {
        alert("Vui lòng nhập Email tài khoản!");
        return;
      }

      if (!userFormData.password.trim() || userFormData.password.trim().length < 6) {
        alert("Vui lòng nhập Mật Khẩu tài khoản (tối thiểu 6 ký tự)!");
        return;
      }

      const cleanPhone = userFormData.phone.replace(/\D/g, "");
      const ctvCode = `SAOHAN-${userFormData.fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase()}${cleanPhone.slice(-4) || "2026"}`;
      const newUserId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `56496f7b-5b74-4282-83dc-${Date.now().toString().padStart(12, "0")}`;

      const newUser: AuthUserProfile = {
        id: newUserId,
        email: userFormData.email.trim(),
        fullName: userFormData.fullName.trim(),
        phone: userFormData.phone.trim(),
        role: userFormData.role,
        ctvCode: ctvCode,
        tier: userFormData.tier,
        availableBalance: 0,
        pendingBalance: 0,
        totalRevenue: 0,
        totalCommission: 0,
        bankName: userFormData.bankName,
        accountNumber: userFormData.accountNumber.trim(),
        accountHolder: userFormData.fullName.trim().toUpperCase(),
        idCardNumber: userFormData.idCardNumber.trim(),
        facilityName: userFormData.facilityName.trim()
      };

      try {
        await signUpUser({
          email: newUser.email,
          password: userFormData.password.trim(),
          fullName: newUser.fullName,
          phone: newUser.phone,
          role: newUser.role,
          bankName: newUser.bankName,
          bankAccount: newUser.accountNumber,
          idCardNumber: newUser.idCardNumber,
          facilityName: newUser.facilityName
        });
      } catch (err) {
        try {
          await supabase.from("user_profiles").upsert({
            id: newUserId,
            email: newUser.email,
            full_name: newUser.fullName,
            phone: newUser.phone,
            role: newUser.role,
            ctv_code: newUser.ctvCode,
            tier: newUser.tier,
            available_balance: 0,
            pending_balance: 0,
            total_revenue: 0,
            total_commission: 0,
            bank_name: newUser.bankName,
            account_number: newUser.accountNumber,
            account_holder: newUser.accountHolder,
            id_card_number: newUser.idCardNumber,
            facility_name: newUser.facilityName
          });
        } catch (_) {}
      }

      setUserAccounts((prev) => [newUser, ...prev]);
      onToast(`Đã tạo tài khoản mới ${newUser.fullName} (${newUser.email}) với mật khẩu đã nhập!`);
    }

    setUserModalOpen(false);
  };

  // DELETE USER FROM SUPABASE & LOCAL STORAGE
  const handleDeleteUser = async (user: AuthUserProfile) => {
    const isTargetAdmin = user.role === "admin" || (user.ctvCode && user.ctvCode.toLowerCase().includes("admin"));
    const adminCount = userAccounts.filter((u) => u.role === "admin" || (u.ctvCode && u.ctvCode.toLowerCase().includes("admin"))).length;
    
    if (isTargetAdmin && adminCount <= 1) {
      alert("Không thể xóa tài khoản Admin duy nhất trong hệ thống!");
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản '${user.fullName}' (${user.email || user.ctvCode}) khỏi hệ thống?`)) {
      try {
        const targetId = user.id;
        const targetCode = (user.ctvCode || (user as any).code || "").trim().toUpperCase();
        const targetEmail = (user.email || "").trim().toLowerCase();

        await deleteUserProfileFromSupabase(targetId, targetCode, targetEmail);

        setUserAccounts((prev) => {
          const updated = prev.filter((u) => {
            const uId = u.id;
            const uCode = (u.ctvCode || (u as any).code || "").trim().toUpperCase();
            const uEmail = (u.email || "").trim().toLowerCase();

            if (targetId && uId === targetId) return false;
            if (targetCode && uCode === targetCode) return false;
            if (targetEmail && uEmail === targetEmail) return false;
            return true;
          });

          // Sync immediately to saohan_registered_users & saohan_all_user_profiles
          localStorage.setItem("saohan_registered_users", JSON.stringify(updated));
          localStorage.setItem("saohan_all_user_profiles", JSON.stringify(updated));
          return updated;
        });

        onToast(`Đã xóa tài khoản ${user.fullName} (${user.ctvCode || user.email}) thành công!`);
      } catch (err: any) {
        alert(`Lỗi xóa tài khoản: ${err.message || err}`);
      }
    }
  };

  // TOGGLE SUSPEND / ACTIVATE USER ACCOUNT
  const handleToggleUserSuspension = async (user: AuthUserProfile) => {
    const isTargetAdmin = user.role === "admin" || (user.ctvCode && user.ctvCode.toLowerCase().includes("admin"));
    if (isTargetAdmin) {
      alert("Không thể tạm ngưng tài khoản Admin hệ thống!");
      return;
    }

    const currentSuspended = Boolean(user.isSuspended || user.status === "suspended");
    const nextSuspended = !currentSuspended;
    const actionLabel = nextSuspended ? "TẠM NGƯNG" : "KÍCH HOẠT LẠI";

    if (window.confirm(`Bạn có chắc chắn muốn ${actionLabel} hoạt động của tài khoản '${user.fullName}' (${user.ctvCode || user.email})?`)) {
      try {
        const targetId = user.id;
        const targetCode = (user.ctvCode || (user as any).code || "").trim().toUpperCase();
        const targetEmail = (user.email || "").trim().toLowerCase();

        await toggleUserSuspensionInSupabase(user.id, nextSuspended);

        setUserAccounts((prev) => {
          const updated = prev.map((u) => {
            const uId = u.id;
            const uCode = (u.ctvCode || (u as any).code || "").trim().toUpperCase();
            const uEmail = (u.email || "").trim().toLowerCase();

            const isMatch = (targetId && uId === targetId) || (targetCode && uCode === targetCode) || (targetEmail && uEmail === targetEmail);

            if (isMatch) {
              return {
                ...u,
                isSuspended: nextSuspended,
                status: nextSuspended ? "suspended" : "active"
              };
            }
            return u;
          });

          localStorage.setItem("saohan_registered_users", JSON.stringify(updated));
          localStorage.setItem("saohan_all_user_profiles", JSON.stringify(updated));
          return updated;
        });

        onToast(`Đã ${actionLabel.toLowerCase()} tài khoản ${user.fullName} (${user.ctvCode || user.email})!`);
      } catch (err: any) {
        alert(`Lỗi thay đổi trạng thái tài khoản: ${err.message || err}`);
      }
    }
  };

  // QUICK UPDATE USER ROLE IN SUPABASE
  const handleQuickChangeUserRole = async (userId: string, newRole: "ctv" | "admin" | "editor" | "accountant") => {
    try {
      await supabase
        .from("user_profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId);

      setUserAccounts((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      onToast(`Đã đổi vai trò thành '${newRole.toUpperCase()}' trên Supabase!`);
    } catch (err: any) {
      alert(`Lỗi cập nhật vai trò: ${err.message || err}`);
    }
  };

  // TOGGLE CRUD PERMISSION
  const handleTogglePermission = (
    roleKey: string,
    moduleKey: string,
    action: "create" | "read" | "update" | "delete"
  ) => {
    setRolesList((prev) =>
      prev.map((role) => {
        if (role.roleKey !== roleKey) return role;
        const currentModPerm = role.permissions[moduleKey] || { create: false, read: false, update: false, delete: false };
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [moduleKey]: {
              ...currentModPerm,
              [action]: !currentModPerm[action]
            }
          }
        };
      })
    );
  };

  // PRESET ALL PERMISSIONS FOR A ROLE
  const handlePresetPermissions = (roleKey: string, preset: "full" | "readOnly" | "reset") => {
    setRolesList((prev) =>
      prev.map((role) => {
        if (role.roleKey !== roleKey) return role;
        const newPerms: any = {};
        SYSTEM_MODULES.forEach((mod) => {
          if (preset === "full") {
            newPerms[mod.key] = { create: true, read: true, update: true, delete: true };
          } else if (preset === "readOnly") {
            newPerms[mod.key] = { create: false, read: true, update: false, delete: false };
          } else {
            newPerms[mod.key] = { create: false, read: false, update: false, delete: false };
          }
        });
        return { ...role, permissions: newPerms };
      })
    );
    onToast(`Đã áp dụng cấu hình nhanh cho vai trò ${roleKey.toUpperCase()}!`);
  };

  // SAVE ROLES & PERMISSIONS MATRIX TO SUPABASE
  const handleSaveRolesMatrix = async () => {
    localStorage.setItem("saohan_roles_permissions", JSON.stringify(rolesList));
    try {
      await saveRolePermissionsToSupabase(rolesList);
      onToast("Đã lưu & đồng bộ Ma Trận Phân Quyền CRUD lên Supabase thành công!");
    } catch (err: any) {
      onToast(`Lỗi lưu ma trận phân quyền: ${err.message || err}`);
    }
  };

  // CREATE CUSTOM ROLE IN SUPABASE
  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleData.roleName.trim() || !newRoleData.roleKey.trim()) {
      alert("Vui lòng nhập Tên và Mã Vai Trò!");
      return;
    }

    const cleanKey = newRoleData.roleKey.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    if (rolesList.some((r) => r.roleKey === cleanKey)) {
      alert("Mã vai trò này đã tồn tại! Vui lòng chọn mã khác.");
      return;
    }

    const initialPerms: any = {};
    SYSTEM_MODULES.forEach((mod) => {
      initialPerms[mod.key] = { create: false, read: true, update: false, delete: false };
    });

    const newRole: RoleConfig = {
      id: `role-${Date.now()}`,
      roleKey: cleanKey,
      roleName: newRoleData.roleName.trim(),
      description: newRoleData.description.trim() || "Vai trò tùy chỉnh mới",
      isSystem: false,
      badgeColor: "bg-cyan-600 text-white",
      permissions: initialPerms
    };

    const updatedRoles = [...rolesList, newRole];
    setRolesList(updatedRoles);
    localStorage.setItem("saohan_roles_permissions", JSON.stringify(updatedRoles));
    saveRolePermissionsToSupabase(updatedRoles).catch(console.error);
    setSelectedRoleKey(cleanKey);
    setCreateRoleModalOpen(false);
    setNewRoleData({ roleName: "", roleKey: "", description: "" });
    onToast(`Đã tạo thành công vai trò mới: ${newRole.roleName} trên Supabase`);
  };

  // DELETE CUSTOM ROLE FROM SUPABASE
  const handleDeleteRole = async (roleKey: string) => {
    const roleObj = rolesList.find((r) => r.roleKey === roleKey);
    if (roleObj?.isSystem) {
      alert("Không thể xóa các Vai trò Hệ thống mặc định!");
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa vai trò '${roleObj?.roleName}' khỏi Supabase?`)) {
      const updated = rolesList.filter((r) => r.roleKey !== roleKey);
      setRolesList(updated);
      localStorage.setItem("saohan_roles_permissions", JSON.stringify(updated));
      setSelectedRoleKey("admin");
      deleteRolePermissionFromSupabase(roleKey).catch(console.error);
      onToast(`Đã xóa vai trò ${roleObj?.roleName} khỏi Supabase!`);
    }
  };

  // Filtered Users List
  const filteredUsers = userAccounts.filter((u) => {
    const matchesSearch =
      !userSearchTerm.trim() ||
      u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.phone.includes(userSearchTerm) ||
      u.ctvCode.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      getUserUid(u).toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.id && u.id.toLowerCase().includes(userSearchTerm.toLowerCase()));

    const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;

    const isSuspended = Boolean(u.isSuspended || u.status === "suspended");
    const matchesStatus =
      userStatusFilter === "ALL" ||
      (userStatusFilter === "active" && !isSuspended) ||
      (userStatusFilter === "suspended" && isSuspended);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const selectedRoleObj = rolesList.find((r) => r.roleKey === selectedRoleKey) || rolesList[0];

  return (
    <div className="space-y-5">

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("brand")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "brand"
              ? "bg-amber-500 text-[#0B192C] shadow-md"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Thương Hiệu & Contact</span>
        </button>

        <button
          onClick={() => setActiveSubTab("pwa")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "pwa"
              ? "bg-amber-500 text-[#0B192C] shadow-md"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <span>2. Cấu Hình PWA & App Di Động</span>
        </button>

        <button
          onClick={() => setActiveSubTab("financial")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "financial"
              ? "bg-amber-500 text-[#0B192C] shadow-md"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <DollarSign className="w-4 h-4 text-cyan-600" />
          <span>3. Tài Chính & Hoa Hồng</span>
        </button>

        <button
          onClick={() => setActiveSubTab("tiers")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "tiers"
              ? "bg-amber-500 text-[#0B192C] shadow-md"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Award className="w-4 h-4 text-amber-600" />
          <span>4. Cấp Bậc CTV ({tierConfigs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("users")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "users"
              ? "bg-amber-500 text-[#0B192C] shadow-md"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>5. Quản Lý Tài Khoản ({userAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("roles")}
          className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "roles"
              ? "bg-amber-500 text-[#0B192C] shadow-md"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>6. Vai Trò & Phân Quyền</span>
        </button>
      </div>

      {/* SUB-TAB 1: CẤU HÌNH THƯƠNG HIỆU & LOGO */}
      {activeSubTab === "brand" && (
        <form onSubmit={handleSaveBrandConfig} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" /> Thiết Lập Thông Tin Bệnh Viện & Hệ Thống
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cập nhật tên bệnh viện, logo hiển thị, khẩu hiệu, hotline và các tỷ lệ hoa hồng mặc định
              </p>
            </div>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-extrabold px-5 py-2.5 rounded-xl transition text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Thương Hiệu</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tên Bệnh viện */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Tên Bệnh Viện / Hệ Thống Thẩm Mỹ (*):
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="hospitalname_1094" name="hospitalname_1094"
                  type="text"
                  required
                  value={brandConfig.hospitalName}
                  onChange={(e) => setBrandConfig({ ...brandConfig, hospitalName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-black text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Hotline */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Hotline Tổng Đài 24/7 (*):
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="hotline_1111" name="hotline_1111"
                  type="text"
                  required
                  value={brandConfig.hotline}
                  onChange={(e) => setBrandConfig({ ...brandConfig, hotline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Khẩu hiệu Tagline */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Khẩu Hiệu / Tagline Thương Hiệu:
              </label>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="tagline_1128" name="tagline_1128"
                  type="text"
                  value={brandConfig.tagline}
                  onChange={(e) => setBrandConfig({ ...brandConfig, tagline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Địa chỉ trụ sở */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Địa Chỉ Trụ Sở Chính:
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="address_1144" name="address_1144"
                  type="text"
                  value={brandConfig.address}
                  onChange={(e) => setBrandConfig({ ...brandConfig, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Phần trăm hoa hồng cơ bản */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Phần Trăm Hoa Hồng Mặc Định (% Base Rate):
              </label>
              <div className="relative">
                <Sliders className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="basecommissionrate_1160" name="basecommissionrate_1160"
                  type="number"
                  min={1}
                  max={50}
                  value={brandConfig.baseCommissionRate}
                  onChange={(e) => setBrandConfig({ ...brandConfig, baseCommissionRate: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Hạn mức rút tiền VietQR */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Hạn Mức Duyệt Rút Tiền Tự Động VNĐ:
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="field_50000000_1178" name="field_50000000_1178"
                  type="text"
                  placeholder="50.000.000"
                  value={formatCurrencyInput(brandConfig.autoPayoutThreshold)}
                  onChange={(e) => setBrandConfig({ ...brandConfig, autoPayoutThreshold: parseCurrencyInput(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* CẤU HÌNH THÔNG BÁO REALTIME ONESIGNAL */}
            <div className="md:col-span-2 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Tích Hợp Thông Báo Realtime OneSignal Web Push
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tự động đẩy thông báo Lịch hẹn & Hoa hồng về từng User (CTV), đồng thời gửi tất cả biến động về cho Admin và Kế Toán.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                  <input id="checkbox_1200" name="checkbox_1200"
                    type="checkbox"
                    checked={brandConfig.oneSignalEnabled !== false}
                    onChange={(e) => setBrandConfig({ ...brandConfig, oneSignalEnabled: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span>Bật OneSignal</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                    OneSignal App ID (*):
                  </label>
                  <input id="input_1215" name="input_1215"
                    type="text"
                    placeholder="b8a9101f-0e12-4f01-b345-onesignal-demo"
                    value={brandConfig.oneSignalAppId || ""}
                    onChange={(e) => setBrandConfig({ ...brandConfig, oneSignalAppId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                    OneSignal REST API Key (Tùy chọn):
                  </label>
                  <input id="osV2AppXxxxxxxxxxxxxxxxxx_1228" name="osV2AppXxxxxxxxxxxxxxxxxx_1228"
                    type="password"
                    placeholder="os_v2_app_xxxxxxxxxxxxxxxxxx"
                    value={brandConfig.oneSignalApiKey || ""}
                    onChange={(e) => setBrandConfig({ ...brandConfig, oneSignalApiKey: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  ✓ Quy tắc: Lịch hẹn CTV ➔ CTV + Admin + Kế Toán | Giải Ngân ➔ CTV + Admin + Kế Toán
                </span>

                <button
                  type="button"
                  onClick={() => {
                    sendOneSignalNotification({
                      title: "🔔 Thông Báo Thử Nghiệm Realtime",
                      message: "Hệ thống OneSignal Korean Star đã kết nối và sẵn sàng gửi thông báo!",
                      targetRoles: ["admin", "accountant"]
                    });
                    onToast("Đã gửi thông báo thử nghiệm qua OneSignal & Trình duyệt!");
                  }}
                  className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl font-extrabold text-xs transition cursor-pointer shrink-0"
                >
                  ⚡ Gửi Thông Báo Thử Nghiệm
                </button>
              </div>
            </div>

            {/* CẤU HÌNH GỬI TIN NHẮN ZALO OFFICIAL ACCOUNT (OA) OPEN API */}
            <div className="md:col-span-2 pt-4 border-t border-slate-100 space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" /> Tích Hợp Zalo Official Account (OA) API (`openapi.zalo.me`)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Cấu hình Zalo Official Account (OA) App ID, Secret Key, Access Token & Refresh Token (developers.zalo.me) để gửi thông báo CSKH và báo cáo tự động.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                    Zalo OA App ID (*):
                  </label>
                  <input id="input_1276" name="input_1276"
                    type="text"
                    placeholder="Ví dụ: 38291048291048"
                    value={brandConfig.zaloOaAppId || brandConfig.zaloBotToken || ""}
                    onChange={(e) => setBrandConfig({ ...brandConfig, zaloOaAppId: e.target.value, zaloBotToken: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                    Zalo OA Secret Key (*):
                  </label>
                  <input id="nhPSecretTokenBMT_1289" name="nhPSecretTokenBMT_1289"
                    type="password"
                    placeholder="Nhập Zalo OA Secret Key..."
                    value={brandConfig.zaloOaSecretKey || brandConfig.zaloWebhookSecret || ""}
                    onChange={(e) => setBrandConfig({ ...brandConfig, zaloOaSecretKey: e.target.value, zaloWebhookSecret: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                    Zalo OA ID / SĐT Admin Nhận Báo Cáo:
                  </label>
                  <input id="vD123456789_1302" name="vD123456789_1302"
                    type="text"
                    placeholder="Ví dụ: 0901888999 hoặc OA Chat ID"
                    value={brandConfig.zaloDefaultChatId || ""}
                    onChange={(e) => setBrandConfig({ ...brandConfig, zaloDefaultChatId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 mt-1">
                  <div>
                    <label className="block text-blue-900 font-extrabold text-[11px] mb-1 flex items-center justify-between">
                      <span>Zalo OA Access Token (Hạn dùng 24h) (*):</span>
                      <span className="text-[10px] text-blue-600 font-bold">Gửi tin nhắn OpenAPI</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input id="zalo_oa_access_token_input" name="zalo_oa_access_token_input"
                        type="password"
                        placeholder="Nhập Zalo OA Access Token..."
                        value={brandConfig.zaloOaAccessToken || brandConfig.zaloBotToken || ""}
                        onChange={(e) => setBrandConfig({ ...brandConfig, zaloOaAccessToken: e.target.value, zaloBotToken: e.target.value })}
                        className="w-full bg-blue-50/70 border border-blue-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-blue-900 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        disabled={refreshingToken}
                        onClick={handleRefreshToken}
                        className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingToken ? "animate-spin" : ""}`} />
                        <span>{refreshingToken ? "Đang lấy..." : "Làm Mới Token"}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-extrabold text-[11px] mb-1 flex items-center justify-between">
                      <span>Zalo OA Refresh Token (Thời hạn 3 tháng) (*):</span>
                      <span className="text-[10px] text-slate-500 font-medium">Tự động cấp lại Access Token</span>
                    </label>
                    <input id="zalo_oa_refresh_token_input" name="zalo_oa_refresh_token_input"
                      type="password"
                      placeholder="Nhập Refresh Token từ Zalo Developer..."
                      value={brandConfig.zaloOaRefreshToken || ""}
                      onChange={(e) => setBrandConfig({ ...brandConfig, zaloOaRefreshToken: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Webhook URL Config Box */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" /> Webhook URL Tiếp Nhận Sự Kiện Zalo Official Account (OA):
                  </span>
                  <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-md">
                    POST Zalo OA Webhook
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input id="app_1323" name="app_1323"
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://korean-star.vercel.app'}/api/zalo-oa/webhook`}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-blue-900 font-bold cursor-pointer select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/zalo-oa/webhook`;
                      navigator.clipboard.writeText(url);
                      onToast("Đã sao chép Webhook URL Zalo Official Account (OA) thành công!");
                    }}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
                  >
                    Sao Chép URL
                  </button>

                  <button
                    type="button"
                    disabled={activatingWebhook}
                    onClick={handleRegisterWebhook}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-md shrink-0 cursor-pointer flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {activatingWebhook ? "Đang kết nối..." : "Kích Hoạt Zalo OA Webhook"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  💡 Bấm <b>"Kích Hoạt Zalo OA Webhook"</b> để đăng ký Webhook tự động gửi nhận tin nhắn Zalo Official Account (OA).
                </p>
              </div>

              {/* Form Gửi Thử Nghiệm Qua ZaloNotifier Component */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                <ZaloNotifier
                  defaultChatId={brandConfig.zaloDefaultChatId || ""}
                  defaultToken={brandConfig.zaloBotToken}
                />

                <ZaloStatsReportSender
                  defaultChatId={brandConfig.zaloDefaultChatId || ""}
                  onToast={onToast}
                />
              </div>
            </div>

            {/* Nút lưu cấu hình */}
            <div className="md:col-span-2 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 font-black text-[#0B192C] text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Cấu Hình Thương Hiệu, OneSignal & Zalo OA</span>
              </button>
            </div>

          </div>
        </form>
      )}

      {/* SUB-TAB 2: CẤU HÌNH PWA & APP DI ĐỘNG */}
      {activeSubTab === "pwa" && (
        <form onSubmit={handleSaveBrandConfig} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-500" /> Cấu Hình Progressive Web App (PWA) & App Di Động
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Quản lý tên app hiển thị trên màn hình điện thoại/máy tính, màu chủ đạo, mô tả và banner tự động nhắc cài đặt
              </p>
            </div>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-extrabold px-5 py-2.5 rounded-xl transition text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình PWA</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 📸 PWA LOGO UPLOAD & CUSTOMIZATION SECTION */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-500" /> Upload & Tùy Chỉnh Biểu Tượng Logo PWA (App Icon)
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Logo này sẽ hiển thị làm Icon ứng dụng trên Màn hình chính điện thoại, Favicon trình duyệt và Banner cài đặt
                  </p>
                </div>
                {(brandConfig.pwaLogoUrl || brandConfig.logoUrl) && (
                  <button
                    type="button"
                    onClick={() => setBrandConfig({ ...brandConfig, pwaLogoUrl: "", logoUrl: "" })}
                    className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer bg-red-50 px-2.5 py-1 rounded-lg border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Reset Mặc Định
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
                
                {/* Left Column: Live Logo Preview Card */}
                <div className="bg-[#0B192C] text-white rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 text-center border border-amber-400/40 shadow-inner">
                  <span className="text-[10px] text-amber-400 font-mono uppercase font-black tracking-wider">Xem Trước App Icon (PWA)</span>
                  
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-amber-400/60 p-1 flex items-center justify-center overflow-hidden shadow-xl">
                      {brandConfig.pwaLogoUrl || brandConfig.logoUrl ? (
                        <img
                          src={brandConfig.pwaLogoUrl || brandConfig.logoUrl}
                          alt="PWA Logo Preview"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <span className="text-4xl">✨</span>
                      )}
                    </div>
                    <span className="absolute -bottom-2 bg-amber-500 text-[#0B192C] font-black text-[9px] px-2 py-0.5 rounded-full shadow-xs">
                      512x512 PNG
                    </span>
                  </div>

                  <div className="space-y-0.5 pt-1">
                    <h5 className="font-extrabold text-xs text-white">{brandConfig.pwaShortName || "KOREAN STAR"}</h5>
                    <span className="text-[10px] text-slate-400 font-medium block">Hiển thị trên Home Screen iOS/Android</span>
                  </div>
                </div>

                {/* Right Column: Upload File & Preset Choice */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* 1. File Upload Dropzone */}
                  <div>
                    <label className="block text-slate-700 font-extrabold text-xs mb-1">
                      1. Tải Lên Tập Tin Ảnh Logo Mới (PNG, JPG, SVG, WebP - Tối Đa 5MB):
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                        onChange={handlePwaLogoUpload}
                        className="hidden"
                        id="pwa-logo-file-input"
                      />
                      <label
                        htmlFor="pwa-logo-file-input"
                        className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-black text-xs px-4 py-3 rounded-xl cursor-pointer transition shadow-sm border border-amber-600/30"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Chọn Ảnh Tải Lên Từ Máy ĐT / Máy Tính</span>
                      </label>
                    </div>
                  </div>

                  {/* 2. Image URL Input */}
                  <div>
                    <label className="block text-slate-700 font-extrabold text-xs mb-1">
                      Hoặc Nhập URL Đường Dẫn Ảnh Trực Tiếp:
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input id="httpsExampleComLogoPng_1487" name="httpsExampleComLogoPng_1487"
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={brandConfig.pwaLogoUrl || ""}
                        onChange={(e) => setBrandConfig({ ...brandConfig, pwaLogoUrl: e.target.value, logoUrl: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* 3. Preset Icons Choice */}
                  <div>
                    <label className="block text-slate-700 font-extrabold text-xs mb-1.5">
                      Hoặc Chọn Biểu Tượng Mẫu Chuẩn Có Sẵn:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRESET_PWA_LOGOS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setBrandConfig({ ...brandConfig, pwaLogoUrl: preset.url, logoUrl: preset.url })}
                          className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                            brandConfig.pwaLogoUrl === preset.url
                              ? "bg-amber-100 border-amber-500 ring-2 ring-amber-400/50"
                              : "bg-white border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="w-6 h-6 rounded-md shrink-0" />
                          <span className="text-[11px] font-extrabold text-slate-800 truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Tên Ứng Dụng Đầy Đủ (App Title):
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="input_1531" name="input_1531"
                  type="text"
                  required
                  value={brandConfig.pwaAppName || "KOREAN STAR - Hệ Thống CTV & Thẩm Mỹ"}
                  onChange={(e) => setBrandConfig({ ...brandConfig, pwaAppName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-black text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Tên Ngắn Màn Hình Chính */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Tên Ngắn Trên Màn Hình Chính (Short Name):
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="pwashortnameKoreanStar_1548" name="pwashortnameKoreanStar_1548"
                  type="text"
                  required
                  value={brandConfig.pwaShortName || "KOREAN STAR"}
                  onChange={(e) => setBrandConfig({ ...brandConfig, pwaShortName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Màu Chủ Đạo Theme Color */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Mã Màu Chủ Đạo PWA (Theme Color Hex):
              </label>
              <div className="flex items-center gap-2">
                <input id="pwathemecolorF59e0b_1564" name="pwathemecolorF59e0b_1564"
                  type="color"
                  value={brandConfig.pwaThemeColor || "#F59E0B"}
                  onChange={(e) => setBrandConfig({ ...brandConfig, pwaThemeColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                />
                <input id="pwathemecolorF59e0b_1570" name="pwathemecolorF59e0b_1570"
                  type="text"
                  value={brandConfig.pwaThemeColor || "#F59E0B"}
                  onChange={(e) => setBrandConfig({ ...brandConfig, pwaThemeColor: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs uppercase"
                />
              </div>
            </div>

            {/* Màu Nền Splash Screen */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Mã Màu Nền Màn Hình Chờ (Splash Screen Background):
              </label>
              <div className="flex items-center gap-2">
                <input id="pwabgcolor0b192c_1585" name="pwabgcolor0b192c_1585"
                  type="color"
                  value={brandConfig.pwaBgColor || "#0B192C"}
                  onChange={(e) => setBrandConfig({ ...brandConfig, pwaBgColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                />
                <input id="pwabgcolor0b192c_1591" name="pwabgcolor0b192c_1591"
                  type="text"
                  value={brandConfig.pwaBgColor || "#0B192C"}
                  onChange={(e) => setBrandConfig({ ...brandConfig, pwaBgColor: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs uppercase"
                />
              </div>
            </div>

            {/* Mô Tả PWA */}
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Mô Tả Ứng Dụng PWA (App Description):
              </label>
              <textarea id="textarea_1605" name="textarea_1605"
                rows={2}
                value={brandConfig.pwaDescription || "Hệ thống quản lý Cộng tác viên & Đặt lịch dịch vụ thẩm mỹ KOREAN STAR 24/7"}
                onChange={(e) => setBrandConfig({ ...brandConfig, pwaDescription: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>

            {/* Toggle Banner Tự Động Nhắc Cài Đặt */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Tự Động Hiển Thị Banner Nhắc Cài Đặt PWA
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Tự động gợi ý người dùng (CTV & Khách hàng) thêm ứng dụng vào Màn hình chính khi truy cập từ Safari / Chrome
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input id="checkbox_1625" name="checkbox_1625"
                  type="checkbox"
                  checked={brandConfig.pwaEnableInstallPrompt !== false}
                  onChange={(e) => setBrandConfig({ ...brandConfig, pwaEnableInstallPrompt: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Thẻ Trạng Thái PWA System Status */}
            <div className="md:col-span-2 bg-[#0B192C] text-white rounded-2xl p-4 space-y-3 border border-slate-800">
              <h4 className="font-extrabold text-xs text-amber-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Trạng Thái Tích Hợp PWA Service Worker Hiện Tại
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block font-semibold">Service Worker</span>
                  <span className="font-mono font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Check className="w-3.5 h-3.5" /> Đã Kích Hoạt (/sw.js)
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block font-semibold">Web App Manifest</span>
                  <span className="font-mono font-bold text-sky-400 flex items-center gap-1 mt-0.5">
                    <Check className="w-3.5 h-3.5" /> /manifest.json
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block font-semibold">Hỗ Trợ Offline</span>
                  <span className="font-mono font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                    <Check className="w-3.5 h-3.5" /> Cache Shell Ready
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 font-black text-[#0B192C] text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình PWA & App Di Động</span>
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 3: CẤU HÌNH TÀI CHÍNH & QUY ĐỊNH HOA HỒNG */}
      {activeSubTab === "financial" && (
        <form onSubmit={handleSaveBrandConfig} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-600" /> Cấu Hình Tài Chính & Quy Định Rút Hoa Hồng
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Thiết lập hạn mức rút tối thiểu/tối đa, tỷ lệ hoa hồng mặc định và tiền tố giao dịch VietQR
              </p>
            </div>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-extrabold px-5 py-2.5 rounded-xl transition text-xs shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Tài Chính</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tỷ lệ hoa hồng cơ bản */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Tỷ Lệ Hoa Hồng Cơ Bản Mặc Định (%):
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="basecommissionrate_1706" name="basecommissionrate_1706"
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={brandConfig.baseCommissionRate}
                  onChange={(e) => setBrandConfig({ ...brandConfig, baseCommissionRate: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-black text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Hạn mức tự động duyệt VietQR */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Hạn Mức Tự Động Phê Duyệt Giải Ngân (VNĐ):
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="autopayoutthreshold_1725" name="autopayoutthreshold_1725"
                  type="text"
                  required
                  value={formatCurrencyInput(brandConfig.autoPayoutThreshold)}
                  onChange={(e) => setBrandConfig({ ...brandConfig, autoPayoutThreshold: parseCurrencyInput(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Hạn mức rút tiền tối thiểu */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Số Tiền Rút Hoa Hồng Tối Thiểu 1 Lần (VNĐ):
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="minpayoutamount100000_1742" name="minpayoutamount100000_1742"
                  type="text"
                  required
                  value={formatCurrencyInput(brandConfig.minPayoutAmount || 100000)}
                  onChange={(e) => setBrandConfig({ ...brandConfig, minPayoutAmount: parseCurrencyInput(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Hạn mức rút tiền tối đa */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Số Tiền Rút Hoa Hồng Tối Đa 1 Lần (VNĐ):
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="maxsinglepayout100000000_1759" name="maxsinglepayout100000000_1759"
                  type="text"
                  required
                  value={formatCurrencyInput(brandConfig.maxSinglePayout || 100000000)}
                  onChange={(e) => setBrandConfig({ ...brandConfig, maxSinglePayout: parseCurrencyInput(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Tiền tố giao dịch VietQR */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Tiền Tố Mã Giao Dịch Rút Tiền (Prefix):
              </label>
              <div className="relative">
                <FileBadge className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="payoutrefprefixKsPay_1776" name="payoutrefprefixKsPay_1776"
                  type="text"
                  required
                  value={brandConfig.payoutRefPrefix || "KS-PAY-"}
                  onChange={(e) => setBrandConfig({ ...brandConfig, payoutRefPrefix: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Đơn vị tiền tệ */}
            <div>
              <label className="block text-slate-700 font-extrabold text-xs mb-1">
                Đơn Vị Tiền Tệ Hệ Thống:
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="systemcurrencyVn_1793" name="systemcurrencyVn_1793"
                  type="text"
                  required
                  value={brandConfig.systemCurrency || "VNĐ"}
                  onChange={(e) => setBrandConfig({ ...brandConfig, systemCurrency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-extrabold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 font-black text-[#0B192C] text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Tài Chính & Quy Định Hoa Hồng</span>
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 4: CẤU HÌNH CẤP BẬC & PHẦN TRĂM HOA HỒNG THEO DOANH SỐ TÍCH LŨY */}
      {activeSubTab === "tiers" && (
        <div className="space-y-6">
          
          {/* Header Banner for Tier Management */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> Quản Lý Cấp Bậc & Phần Trăm Hoa Hồng Theo Doanh Số Tích Lũy
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Thiết lập mốc doanh số tích lũy (VNĐ) để tự động thăng cấp bậc CTV (Bạc, Vàng, Bạch Kim, Kim Cương) và áp dụng % hoa hồng thưởng tương ứng.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetDefaultTiers}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-slate-600 text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Đặt Lại Mặc Định</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddTierModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 font-black text-[#0B192C] text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Cấp Bậc Mới</span>
              </button>
            </div>
          </div>

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tierConfigs.map((tier, idx) => {
              // Count CTVs at this tier
              const ctvCountAtTier = userAccounts.filter((u) => {
                const uTier = u.tier || "Bạc";
                return uTier.toLowerCase().includes(tier.tierName.toLowerCase());
              }).length;

              return (
                <div
                  key={tier.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between relative overflow-hidden space-y-4"
                >
                  <div className="space-y-3">
                    {/* Badge & Actions */}
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-black shadow-xs ${tier.badgeColor}`}>
                        {tier.tierName}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTierModal(tier)}
                          className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-600 transition cursor-pointer"
                          title="Chỉnh Sửa Cấp Bậc"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTierConfig(tier.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Xóa Cấp Bậc"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Revenue Threshold */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mốc Doanh Số Tích Lũy:</div>
                      <div className="text-xs font-black text-slate-900 bg-slate-50 border border-slate-200/80 p-2 rounded-xl flex items-center justify-between">
                        <span>{tier.minRevenue.toLocaleString()} VNĐ</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tier.maxRevenue ? `${tier.maxRevenue.toLocaleString()} VNĐ` : "Không giới hạn"}</span>
                      </div>
                    </div>

                    {/* Commission Rate & Bonus Multiplier */}
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-amber-900">Mức Hoa Hồng:</span>
                        <span className="font-black text-lg text-amber-700">{tier.commissionRate}%</span>
                      </div>
                      <div className="w-full bg-amber-200/60 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${Math.min(tier.commissionRate * 3.5, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold pt-0.5">
                        <span>Hệ số thưởng:</span>
                        <span className="bg-amber-400 text-[#0B192C] px-2 py-0.5 rounded-full font-black text-[10px]">
                          x{tier.bonusMultiplier}
                        </span>
                      </div>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Đặc Quyền Cấp Bậc:</div>
                      <ul className="space-y-1 text-[11px] text-slate-600 font-medium">
                        {(tier.benefits || []).map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-extrabold text-slate-700">
                      <Users className="w-3.5 h-3.5 text-blue-600" /> {ctvCountAtTier} CTV đạt cấp
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Cấp #{idx + 1}</span>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Realtime CTV Tier Status Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Bảng Thống Kê Cấp Bậc & % Hoa Hồng CTV Thực Tế
                </h4>
                <p className="text-xs text-slate-500">
                  Tự động tính toán cấp bậc và tỷ lệ hoa hồng dựa trên tổng doanh số tích lũy của từng Cộng tác viên.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                Tổng số CTV: {userAccounts.filter((u) => u.role === "ctv").length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-3">Họ Tên CTV & Mã</th>
                    <th className="p-3">Số Điện Thoại</th>
                    <th className="p-3">Doanh Số Tích Lũy</th>
                    <th className="p-3">Cấp Bậc Hiện Tại</th>
                    <th className="p-3">% Hoa Hồng Được Hưởng</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                  {userAccounts.filter((u) => u.role === "ctv").length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                        Chưa có dữ liệu Cộng tác viên trong hệ thống
                      </td>
                    </tr>
                  ) : (
                    userAccounts
                      .filter((u) => u.role === "ctv")
                      .map((ctv) => {
                        const rev = ctv.totalRevenue || 0;
                        // Find matching tier config
                        const matchedTier =
                          [...tierConfigs]
                            .reverse()
                            .find((t) => rev >= t.minRevenue) || tierConfigs[0];

                        return (
                          <tr key={ctv.id} className="hover:bg-slate-50 transition">
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900">{ctv.fullName}</div>
                              <div className="text-[10px] text-amber-700 font-mono">{ctv.ctvCode}</div>
                            </td>
                            <td className="p-3 font-mono">{ctv.phone || "N/A"}</td>
                            <td className="p-3 font-mono font-black text-emerald-700">
                              {rev.toLocaleString()} VNĐ
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${matchedTier.badgeColor}`}>
                                {matchedTier.tierName}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-amber-700 font-black text-sm bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                {matchedTier.commissionRate}%
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTierModal(matchedTier)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] transition cursor-pointer"
                              >
                                Cấu Hình Cấp
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 3: QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG */}
      {activeSubTab === "users" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" /> Quản Lý Danh Sách Tài Khoản Người Dùng
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Xem danh sách, thêm tài khoản mới, phân vai trò và chỉnh sửa hồ sơ tài khoản CTV/Admin
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchUsersFromSupabase}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                title="Tải lại danh sách từ Supabase"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin text-amber-500" : ""}`} />
              </button>

              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserFormData({
                    fullName: "",
                    email: "",
                    phone: "",
                    password: "Password123!",
                    role: "ctv",
                    tier: "Bạc",
                    bankName: "MB Bank",
                    accountNumber: "",
                    idCardNumber: "",
                    facilityName: ""
                  });
                  setUserModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-extrabold px-4 py-2.5 rounded-xl transition text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Thêm Tài Khoản Mới</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input id="tMTheoTNEmailSTHoCMCtv_2090" name="tMTheoTNEmailSTHoCMCtv_2090"
                type="text"
                placeholder="Tìm theo Tên, Email, SĐT, Mã UID hoặc Mã CTV..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select id="userrole_2101" name="userrole_2101"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ctv">Cộng Tác Viên (CTV)</option>
                <option value="team_leader">Trưởng Nhóm CTV</option>
                <option value="admin">Ban Quản Trị (Admin)</option>
                <option value="editor">Biên Tập Viên (Editor)</option>
                <option value="accountant">Bộ Phận Kế Toán</option>
              </select>

              <select id="userstatus_filter" name="userstatus_filter"
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="active">🟢 Đang hoạt động</option>
                <option value="suspended">🔴 Đã tạm ngưng</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Họ Tên & Email</th>
                  <th className="p-3">Số Điện Thoại</th>
                  <th className="p-3">Vai Trò (Role)</th>
                  <th className="p-3">Trạng Thái</th>
                  <th className="p-3">Mã UID & Mã CTV</th>
                  <th className="p-3">Ngân Hàng</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredUsers.map((user) => {
                  const isSuspended = Boolean(user.isSuspended || user.status === "suspended");
                  return (
                  <tr key={user.id} className={`transition ${isSuspended ? "bg-rose-50/50 hover:bg-rose-50" : "hover:bg-slate-50"}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
                          alt={user.fullName}
                          className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shrink-0 bg-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{user.fullName}</span>
                            {isSuspended && (
                              <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">Tạm ngưng</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{user.phone}</td>
                    <td className="p-3">
                      <select id="role_2146" name="role_2146"
                        value={user.role}
                        onChange={(e) => handleQuickChangeUserRole(user.id, e.target.value as any)}
                        className={`px-2 py-1 rounded-xl text-[10px] font-extrabold uppercase focus:outline-none cursor-pointer border shadow-xs transition ${
                          user.role === "admin"
                            ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                            : user.role === "team_leader"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                            : user.role === "editor"
                            ? "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                            : user.role === "accountant"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                        }`}
                      >
                        <option value="ctv">🔑 CTV</option>
                        <option value="team_leader">👑 TRƯỞNG NHÓM</option>
                        <option value="admin">🔴 ADMIN</option>
                        <option value="editor">🟣 EDITOR</option>
                        <option value="accountant">🟢 KẾ TOÁN</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                          <PauseCircle className="w-3 h-3 text-rose-600" /> Tạm Ngưng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt Động
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-mono font-black text-blue-900 text-[11px] flex items-center gap-1">
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-blue-200">
                          {getUserUid(user)}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-amber-700 text-xs mt-0.5">{user.ctvCode}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">Cấp {user.tier}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={getBankLogo(user.bankName || "MB Bank")}
                          alt={user.bankName}
                          className="w-5 h-5 object-contain bg-white rounded border border-slate-200 p-0.5 shrink-0"
                        />
                        <div className="min-w-0 text-[11px]">
                          <div className="font-bold text-slate-900 truncate">{user.bankName}</div>
                          <div className="font-mono text-slate-500 truncate">{user.accountNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.role !== "admin" && (
                          <button
                            onClick={() => handleToggleUserSuspension(user)}
                            className={`p-1.5 rounded-lg transition font-bold text-xs inline-flex items-center gap-1 cursor-pointer border ${
                              isSuspended
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                            }`}
                            title={isSuspended ? "Kích hoạt lại tài khoản" : "Tạm ngưng tài khoản"}
                          >
                            {isSuspended ? (
                              <>
                                <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                                <span>Kích hoạt</span>
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                                <span>Tạm ngưng</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setUserFormData({
                              fullName: user.fullName,
                              email: user.email,
                              phone: user.phone,
                              password: "",
                              role: user.role,
                              tier: user.tier,
                              bankName: user.bankName || "MB Bank",
                              accountNumber: user.accountNumber || "",
                              idCardNumber: user.idCardNumber || "",
                              facilityName: user.facilityName || ""
                            });
                            setUserModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                          title="Sửa thông tin tài khoản"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 transition font-bold text-xs inline-flex items-center gap-1 cursor-pointer border border-rose-200"
                          title="Xóa tài khoản khỏi CSDL"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: VAI TRÒ & MA TRẬN PHÂN QUYỀN CRUD CHI TIẾT */}
      {activeSubTab === "roles" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-sm">
          
          {/* Header & Save Button Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" /> Thiết Lập Ma Trận Phân Quyền CRUD Theo Vai Trò
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Bật/Tắt chi tiết các quyền C (Create), R (Read), U (Update), D (Delete) trên 7 module hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreateRoleModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-600" />
                <span>+ Tạo Vai Trò Mới</span>
              </button>

              <button
                onClick={handleSaveRolesMatrix}
                className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-extrabold px-5 py-2 rounded-xl transition text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Ma Trận Phân Quyền</span>
              </button>
            </div>
          </div>

          {/* Role Cards Picker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {rolesList.map((role) => {
              const isSelected = selectedRoleKey === role.roleKey;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleKey(role.roleKey)}
                  className={`p-3 rounded-2xl border text-left transition relative cursor-pointer ${
                    isSelected
                      ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 shadow-xs"
                      : "bg-slate-50 border-slate-200 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${role.badgeColor}`}>
                      {role.roleKey}
                    </span>
                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.roleKey);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="Xóa vai trò tùy chỉnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="font-extrabold text-xs text-slate-900 truncate">{role.roleName}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{role.description}</div>
                </button>
              );
            })}
          </div>

          {/* Current Selected Role Details & Action Presets */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm">{selectedRoleObj.roleName}</span>
                <span className="text-slate-400 font-mono">({selectedRoleObj.roleKey})</span>
              </div>
              <p className="text-slate-500 font-medium mt-0.5">{selectedRoleObj.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handlePresetPermissions(selectedRoleKey, "full")}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] transition"
              >
                ✓ Cho Phép Tất Cả
              </button>
              <button
                type="button"
                onClick={() => handlePresetPermissions(selectedRoleKey, "readOnly")}
                className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[11px] transition"
              >
                👁 Chỉ Xem (Read Only)
              </button>
              <button
                type="button"
                onClick={() => handlePresetPermissions(selectedRoleKey, "reset")}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] transition"
              >
                ✕ Bỏ Tất Cả
              </button>
            </div>
          </div>

          {/* CRUD Permissions Matrix Grid Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3 w-1/3">Module Hệ Thống</th>
                  <th className="p-3 text-center">C - Create (Tạo Mới)</th>
                  <th className="p-3 text-center">R - Read (Xem/Đọc)</th>
                  <th className="p-3 text-center">U - Update (Chỉnh Sửa)</th>
                  <th className="p-3 text-center">D - Delete (Xóa)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {SYSTEM_MODULES.map((mod) => {
                  const IconComp = mod.icon;
                  const modPerms = selectedRoleObj.permissions[mod.key] || {
                    create: false,
                    read: false,
                    update: false,
                    delete: false
                  };

                  return (
                    <tr key={mod.key} className="hover:bg-slate-50 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5 font-extrabold text-slate-900">
                          <IconComp className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{mod.name}</span>
                        </div>
                      </td>

                      {/* CREATE Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(selectedRoleKey, mod.key, "create")}
                          className={`p-1 rounded-lg transition inline-flex items-center justify-center cursor-pointer ${
                            modPerms.create
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-2 py-1"
                              : "bg-slate-100 text-slate-400 border border-slate-200 px-2 py-1"
                          }`}
                        >
                          {modPerms.create ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* READ Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(selectedRoleKey, mod.key, "read")}
                          className={`p-1 rounded-lg transition inline-flex items-center justify-center cursor-pointer ${
                            modPerms.read
                              ? "bg-blue-100 text-blue-800 border border-blue-300 font-black px-2 py-1"
                              : "bg-slate-100 text-slate-400 border border-slate-200 px-2 py-1"
                          }`}
                        >
                          {modPerms.read ? <Check className="w-4 h-4 text-blue-600" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* UPDATE Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(selectedRoleKey, mod.key, "update")}
                          className={`p-1 rounded-lg transition inline-flex items-center justify-center cursor-pointer ${
                            modPerms.update
                              ? "bg-amber-100 text-amber-800 border border-amber-300 font-black px-2 py-1"
                              : "bg-slate-100 text-slate-400 border border-slate-200 px-2 py-1"
                          }`}
                        >
                          {modPerms.update ? <Check className="w-4 h-4 text-amber-600" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* DELETE Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(selectedRoleKey, mod.key, "delete")}
                          className={`p-1 rounded-lg transition inline-flex items-center justify-center cursor-pointer ${
                            modPerms.delete
                              ? "bg-rose-100 text-rose-800 border border-rose-300 font-black px-2 py-1"
                              : "bg-slate-100 text-slate-400 border border-slate-200 px-2 py-1"
                          }`}
                        >
                          {modPerms.delete ? <Check className="w-4 h-4 text-rose-600" /> : <X className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4 animate-scaleUp my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <h4 className="font-extrabold text-base text-slate-900">
                  {editingUser ? `Chỉnh Sửa Tài Khoản: ${editingUser.fullName}` : "Tạo Tài Khoản Mới"}
                </h4>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Họ Và Tên (*):</label>
                  <input id="fullname_2458" name="fullname_2458"
                    type="text"
                    required
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Vai Trò (Role) (*):</label>
                  <select id="role_2470" name="role_2470"
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {rolesList.map((r) => (
                      <option key={r.roleKey} value={r.roleKey}>
                        {r.roleName} ({r.roleKey})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Email Đăng Nhập (*):</label>
                  <input id="email_2486" name="email_2486"
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    {editingUser ? "Mật Khẩu Mới (Đổi mật khẩu):" : "Mật Khẩu Đăng Nhập (*):"}
                  </label>
                  <div className="relative">
                    <input id="password_2502" name="password_2502"
                      type={showUserPassword ? "text" : "password"}
                      required={!editingUser}
                      placeholder={editingUser ? "•••••••• (Giữ nguyên mật khẩu cũ)" : "Nhập mật khẩu (tối thiểu 6 ký tự)..."}
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pr-10 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showUserPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Số Điện Thoại (*):</label>
                  <input id="phone_2524" name="phone_2524"
                    type="text"
                    required
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Tier */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Cấp Độ Tier (*):</label>
                  <select id="tier_2536" name="tier_2536"
                    value={userFormData.tier}
                    onChange={(e) => setUserFormData({ ...userFormData, tier: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Bạc">Bạc (10% - 15%)</option>
                    <option value="Vàng">Vàng (15% - 20%)</option>
                    <option value="Bạch Kim">Bạch Kim (20% - 25%)</option>
                    <option value="Kim Cương">Kim Cương (VVIP 30%)</option>
                  </select>
                </div>

                {/* STK Ngân Hàng */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Số Tài Khoản Ngân Hàng (*):</label>
                  <input id="accountnumber_2551" name="accountnumber_2551"
                    type="text"
                    required
                    value={userFormData.accountNumber}
                    onChange={(e) => setUserFormData({ ...userFormData, accountNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Tên Ngân hàng */}
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Tên Ngân Hàng (*):</label>
                <button
                  type="button"
                  onClick={() => setUserBankModalOpen(true)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={getBankLogo(userFormData.bankName)}
                      alt={userFormData.bankName}
                      className="w-5 h-5 object-contain bg-white rounded border border-slate-200 p-0.5 shrink-0"
                    />
                    <span className="truncate">{userFormData.bankName}</span>
                  </div>
                  <Sliders className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* CCCD & Facility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Số CCCD (12 số) (*):</label>
                  <input id="idcardnumber_2585" name="idcardnumber_2585"
                    type="text"
                    required
                    value={userFormData.idCardNumber}
                    onChange={(e) => setUserFormData({ ...userFormData, idCardNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Cơ Sở Hoạt Động (Nếu có):</label>
                  <input id="facilityname_2596" name="facilityname_2596"
                    type="text"
                    value={userFormData.facilityName}
                    onChange={(e) => setUserFormData({ ...userFormData, facilityName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-extrabold px-5 py-2 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingUser ? "Cập Nhật Hồ Sơ" : "Tạo Tài Khoản"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM ROLE */}
      {createRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4 animate-scaleUp my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <h4 className="font-extrabold text-base text-slate-900">Tạo Vai Trò Mới</h4>
              </div>
              <button
                onClick={() => setCreateRoleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Tên Vai Trò (*):</label>
                <input id="vDBCSTrNgKhoaTVNViNSpa_2646" name="vDBCSTrNgKhoaTVNViNSpa_2646"
                  type="text"
                  required
                  placeholder="Ví dụ: Bác Sĩ Trưởng Khoa, Tư Vấn Viên Spa..."
                  value={newRoleData.roleName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").toLowerCase().replace(/[^a-z0-9_]/g, "");
                    setNewRoleData({ roleName: name, roleKey: key, description: newRoleData.description });
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Mã Định Danh (Role Key) (*):</label>
                <input id="doctorLeadSpaConsultant_2662" name="doctorLeadSpaConsultant_2662"
                  type="text"
                  required
                  placeholder="doctor_lead, spa_consultant..."
                  value={newRoleData.roleKey}
                  onChange={(e) => setNewRoleData({ ...newRoleData, roleKey: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">Mô Tả Vai Trò:</label>
                <textarea id="mTNgNGNChCNNgCAVaiTrNY_2674" name="mTNgNGNChCNNgCAVaiTrNY_2674"
                  rows={2}
                  placeholder="Mô tả ngắn gọn chức năng của vai trò này..."
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-extrabold px-5 py-2 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Vai Trò & Thiết Lập Quyền</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER BANK SELECTOR MODAL */}
      {userBankModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp max-h-[85vh] flex flex-col text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h4 className="font-extrabold text-base text-slate-900">Chọn Ngân Hàng VietQR</h4>
              </div>
              <button
                type="button"
                onClick={() => setUserBankModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input id="tMTNNgNHNgMbVcbAcb_2722" name="tMTNNgNHNgMbVcbAcb_2722"
              type="text"
              placeholder="Tìm tên ngân hàng (MB, VCB, ACB...)"
              value={userBankSearch}
              onChange={(e) => setUserBankSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
            />

            <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
              {VIETNAM_BANKS.filter((b) =>
                b.shortName.toLowerCase().includes(userBankSearch.toLowerCase()) ||
                b.fullName.toLowerCase().includes(userBankSearch.toLowerCase())
              ).map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => {
                    setUserFormData({ ...userFormData, bankName: bank.shortName });
                    setUserBankModalOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50 flex items-center gap-3 text-left transition cursor-pointer"
                >
                  <img
                    src={bank.logoUrl || bank.logo}
                    alt={bank.shortName}
                    className="w-7 h-7 object-contain bg-white rounded border border-slate-200 p-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900">{bank.shortName}</div>
                    <div className="text-[10px] text-slate-500 truncate">{bank.fullName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TIER MODAL POPUP */}
      {tierModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                    {editingTier ? `Chỉnh Sửa Cấp Bậc: ${editingTier.tierName}` : "Thêm Cấp Bậc CTV Mới"}
                  </h3>
                  <p className="text-[10px] text-amber-700 font-bold">Cấu hình mốc doanh số & phần trăm hoa hồng</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTierModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveTierForm} className="overflow-y-auto space-y-3 text-xs pr-1 flex-1">
              
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">1. Tên Cấp Bậc (*):</label>
                <input id="vDBCVNgBChKimKimCNg_2792" name="vDBCVNgBChKimKimCNg_2792"
                  type="text"
                  required
                  placeholder="Ví dụ: Bạc, Vàng, Bạch Kim, Kim Cương..."
                  value={tierFormData.tierName}
                  onChange={(e) => setTierFormData({ ...tierFormData, tierName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">2. Doanh số tối thiểu (VNĐ) (*):</label>
                  <input id="field_0_2805" name="field_0_2805"
                    type="text"
                    required
                    placeholder="0"
                    value={formatCurrencyInput(tierFormData.minRevenue)}
                    onChange={(e) => setTierFormData({ ...tierFormData, minRevenue: parseCurrencyInput(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">3. Doanh số tối đa (VNĐ):</label>
                  <input id="field_50000000_2817" name="field_50000000_2817"
                    type="text"
                    disabled={tierFormData.isUnlimited}
                    placeholder="50.000.000"
                    value={tierFormData.isUnlimited ? "" : formatCurrencyInput(tierFormData.maxRevenue || 0)}
                    onChange={(e) => setTierFormData({ ...tierFormData, maxRevenue: parseCurrencyInput(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <label className="flex items-center gap-1.5 mt-1 cursor-pointer text-slate-600 font-bold text-[11px]">
                    <input id="checkbox_2826" name="checkbox_2826"
                      type="checkbox"
                      checked={tierFormData.isUnlimited}
                      onChange={(e) => setTierFormData({ ...tierFormData, isUnlimited: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Không giới hạn (Cấp MAX)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">4. Mức Hoa Hồng (%):</label>
                  <div className="relative">
                    <Percent className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
                    <input id="commissionrate_2842" name="commissionrate_2842"
                      type="number"
                      required
                      min={0}
                      max={100}
                      step={0.5}
                      value={tierFormData.commissionRate}
                      onChange={(e) => setTierFormData({ ...tierFormData, commissionRate: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-black text-amber-700 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">5. Hệ số thưởng (x):</label>
                  <input id="bonusmultiplier_2857" name="bonusmultiplier_2857"
                    type="number"
                    required
                    min={1}
                    max={5}
                    step={0.05}
                    value={tierFormData.bonusMultiplier}
                    onChange={(e) => setTierFormData({ ...tierFormData, bonusMultiplier: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">6. Đặc quyền dành cho Cấp Bậc này (Mỗi dòng 1 đặc quyền):</label>
                <textarea id="mICQuyNViTTrN1DNg_2872" name="mICQuyNViTTrN1DNg_2872"
                  rows={3}
                  placeholder="Mỗi đặc quyền viết trên 1 dòng..."
                  value={tierFormData.benefitsText}
                  onChange={(e) => setTierFormData({ ...tierFormData, benefitsText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">7. Mô tả ngắn cấp bậc:</label>
                <input id="mTTMTTCPBC_2883" name="mTTMTTCPBC_2883"
                  type="text"
                  placeholder="Mô tả tóm tắt cấp bậc..."
                  value={tierFormData.description}
                  onChange={(e) => setTierFormData({ ...tierFormData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 shrink-0 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTierModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer text-xs"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] font-black transition shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingTier ? "Lưu Cập Nhật" : "Tạo Cấp Bậc Mới"}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
