import React, { useState, useEffect } from "react";
import {
  AuthUserProfile,
  supabase,
  deleteUserProfileFromSupabase,
  fetchRolePermissionsFromSupabase,
  saveRolePermissionsToSupabase,
  deleteRolePermissionFromSupabase,
  fetchCmsSettingsFromSupabase,
  saveCmsSettingsToSupabase,
  fetchAllUserProfilesFromSupabase,
  saveRegisteredUserToLocalStorage
} from "../lib/supabase";
import { CTVUser } from "../types";
import { sendOneSignalNotification } from "../lib/onesignal";
import { ZaloNotifier } from "./ZaloNotifier";
import { registerZaloWebhook } from "../services/zaloService";
import { VIETNAM_BANKS, getBankLogo } from "../lib/banks";
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
  Layers,
  FileText,
  Stethoscope,
  QrCode,
  Eye,
  UserCheck,
  Award,
  TrendingUp,
  Percent,
  ChevronRight,
  MessageSquare
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
  }
];

export const SystemSettingsModule: React.FC<SystemSettingsModuleProps> = ({
  ctvUser,
  onToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"brand" | "tiers" | "users" | "roles">("brand");

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
      address: "Số 88 Phố Huế, Q. Hai Bà Trưng, Hà Nội",
      baseCommissionRate: 15,
      autoPayoutThreshold: 50000000,
      systemCurrency: "VNĐ",
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

  // Add/Edit User Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUserProfile | null>(null);
  const [userFormData, setUserFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "ctv" as "ctv" | "admin" | "editor" | "accountant",
    tier: "Bạc" as "Bạc" | "Vàng" | "Bạch Kim" | "Kim Cương",
    bankName: "MB Bank",
    accountNumber: "",
    idCardNumber: "",
    facilityName: ""
  });

  // Bank selector inside user modal
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
      alert(`Lỗi kích hoạt Webhook Zalo Bot API: ${res.description || "Vui lòng kiểm tra lại Bot Token"}`);
    }
  };

  // SAVE BRAND CONFIG TO SUPABASE
  const handleSaveBrandConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("saohan_cms_settings", JSON.stringify(brandConfig));
    await saveCmsSettingsToSupabase(brandConfig);
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
      } catch (err) {}

      setUserAccounts((prev) => [newUser, ...prev]);
      onToast(`Đã tạo tài khoản mới ${newUser.fullName} trên Supabase thành công!`);
    }

    setUserModalOpen(false);
  };

  // DELETE USER FROM SUPABASE
  const handleDeleteUser = async (user: AuthUserProfile) => {
    if (user.role === "admin" && userAccounts.filter((u) => u.role === "admin").length <= 1) {
      alert("Không thể xóa tài khoản Admin duy nhất trong hệ thống!");
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản '${user.fullName}' (${user.email}) khỏi Supabase?`)) {
      try {
        await deleteUserProfileFromSupabase(user.id);
        setUserAccounts((prev) => prev.filter((u) => u.id !== user.id));
        onToast(`Đã xóa tài khoản ${user.fullName} khỏi CSDL Supabase!`);
      } catch (err: any) {
        alert(`Lỗi xóa tài khoản: ${err.message || err}`);
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
      u.ctvCode.toLowerCase().includes(userSearchTerm.toLowerCase());

    const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
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
          <span>1. Cấu Hình Thương Hiệu & Logo</span>
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
          <span>2. Cấp Bậc & % Hoa Hồng ({tierConfigs.length})</span>
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
          <span>3. Quản Lý Tài Khoản ({userAccounts.length})</span>
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
          <span>4. Vai Trò & Phân Quyền CRUD</span>
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
                <input
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
                <input
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
                <input
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
                <input
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
                <input
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
                <input
                  type="number"
                  step={5000000}
                  value={brandConfig.autoPayoutThreshold}
                  onChange={(e) => setBrandConfig({ ...brandConfig, autoPayoutThreshold: Number(e.target.value) })}
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
                  <input
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
                  <input
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
                  <input
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

            {/* CẤU HÌNH GỬI TIN NHẮN ZALO BOT API */}
            <div className="md:col-span-2 pt-4 border-t border-slate-100 space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" /> Tích Hợp Zalo Bot Platform (`sendMessage` API)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Cấu hình Bot Token từ Zalo Bot Platform (bot.zapps.me) để hệ thống gửi tin nhắn Zalo tự động.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                    Zalo Bot Token (*):
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập Zalo Bot Token từ Zalo Bot Platform..."
                    value={brandConfig.zaloBotToken || ""}
                    onChange={(e) => setBrandConfig({ ...brandConfig, zaloBotToken: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                    Webhook Secret Token:
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập Secret Token bí mật..."
                    value={brandConfig.zaloWebhookSecret || ""}
                    onChange={(e) => setBrandConfig({ ...brandConfig, zaloWebhookSecret: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                    Chat ID Mặc Định:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 123456789"
                    value={brandConfig.zaloDefaultChatId || ""}
                    onChange={(e) => setBrandConfig({ ...brandConfig, zaloDefaultChatId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Webhook URL Config Box */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" /> Webhook URL Tự Động Phản Hồi Chat ID (/id):
                  </span>
                  <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-md">
                    POST Webhook
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://korean-star.vercel.app'}/api/zalo/webhook${brandConfig.zaloBotToken ? `?token=${encodeURIComponent(brandConfig.zaloBotToken)}` : ''}`}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-blue-900 font-bold cursor-pointer select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/zalo/webhook${brandConfig.zaloBotToken ? `?token=${encodeURIComponent(brandConfig.zaloBotToken)}` : ''}`;
                      navigator.clipboard.writeText(url);
                      onToast("Đã sao chép Webhook URL Zalo thành công!");
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
                    {activatingWebhook ? "Đang kích hoạt..." : "Kích Hoạt Webhook Qua API"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  💡 Bấm <b>"Kích Hoạt Webhook Qua API"</b> để hệ thống tự động gọi API `setWebhook` tới Zalo Bot Platform! Bạn không cần cài đặt thủ công.
                </p>
              </div>

              {/* Form Gửi Thử Nghiệm Qua ZaloNotifier Component */}
              <div className="pt-2">
                <ZaloNotifier
                  defaultChatId={brandConfig.zaloDefaultChatId || ""}
                  defaultToken={brandConfig.zaloBotToken}
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
                <span>Lưu Cấu Hình Thương Hiệu, OneSignal & Zalo Bot</span>
              </button>
            </div>

          </div>
        </form>
      )}

      {/* SUB-TAB 2: CẤU HÌNH CẤP BẬC & PHẦN TRĂM HOA HỒNG THEO DOANH SỐ TÍCH LŨY */}
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
              <input
                type="text"
                placeholder="Tìm theo Tên, Email, SĐT hoặc Mã CTV..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ctv">Cộng Tác Viên (CTV)</option>
                <option value="admin">Ban Quản Trị (Admin)</option>
                <option value="editor">Biên Tập Viên (Editor)</option>
                <option value="accountant">Bộ Phận Kế Toán</option>
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
                  <th className="p-3">Mã CTV & Cấp</th>
                  <th className="p-3">Ngân Hàng</th>
                  <th className="p-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
                          alt={user.fullName}
                          className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shrink-0 bg-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate">{user.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{user.phone}</td>
                    <td className="p-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleQuickChangeUserRole(user.id, e.target.value as any)}
                        className={`px-2 py-1 rounded-xl text-[10px] font-extrabold uppercase focus:outline-none cursor-pointer border shadow-xs transition ${
                          user.role === "admin"
                            ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                            : user.role === "editor"
                            ? "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                            : user.role === "accountant"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                        }`}
                      >
                        <option value="ctv">🔑 CTV</option>
                        <option value="admin">🔴 ADMIN</option>
                        <option value="editor">🟣 EDITOR</option>
                        <option value="accountant">🟢 KẾ TOÁN</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="font-mono font-bold text-amber-700 text-xs">{user.ctvCode}</div>
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
                          title="Xóa tài khoản khỏi Supabase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                  <input
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
                  <select
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
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Số Điện Thoại (*):</label>
                  <input
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
                  <select
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
                  <input
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
                  <input
                    type="text"
                    required
                    value={userFormData.idCardNumber}
                    onChange={(e) => setUserFormData({ ...userFormData, idCardNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">Cơ Sở Hoạt Động (Nếu có):</label>
                  <input
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
                <input
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
                <input
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
                <textarea
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

            <input
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
                <input
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
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000000}
                    placeholder="0"
                    value={tierFormData.minRevenue}
                    onChange={(e) => setTierFormData({ ...tierFormData, minRevenue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">3. Doanh số tối đa (VNĐ):</label>
                  <input
                    type="number"
                    disabled={tierFormData.isUnlimited}
                    min={0}
                    step={1000000}
                    placeholder="50000000"
                    value={tierFormData.isUnlimited ? "" : tierFormData.maxRevenue || ""}
                    onChange={(e) => setTierFormData({ ...tierFormData, maxRevenue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <label className="flex items-center gap-1.5 mt-1 cursor-pointer text-slate-600 font-bold text-[11px]">
                    <input
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
                    <input
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
                  <input
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
                <textarea
                  rows={3}
                  placeholder="Mỗi đặc quyền viết trên 1 dòng..."
                  value={tierFormData.benefitsText}
                  onChange={(e) => setTierFormData({ ...tierFormData, benefitsText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold mb-1">7. Mô tả ngắn cấp bậc:</label>
                <input
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
