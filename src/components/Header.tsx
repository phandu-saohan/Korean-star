import React, { useState, useRef, useEffect } from "react";
import { UserRole, CTVUser, RealtimeNotification } from "../types";
import { resetUserPassword } from "../lib/supabase";
import { requestNotificationPermission } from "../lib/onesignal";
import { 
  Sparkles, 
  Users, 
  Building2, 
  User,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Bell,
  FileText,
  Wallet,
  KeyRound,
  LogOut,
  Mail,
  X,
  Coins,
  Calendar,
  Stethoscope,
  Gift,
  CheckCheck,
  Trash2,
  BellOff,
  BellRing
} from "lucide-react";

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  ctvUser: CTVUser;
  notifications: RealtimeNotification[];
  onOpenPayout: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenAuthModal?: () => void;
  onOpenProfileModal?: () => void;
  onSignOut?: () => void;
  authUser?: any;
  onClearNotifications?: () => void;
  onMarkAllRead?: () => void;
  onNotificationClick?: (notif: RealtimeNotification) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  ctvUser,
  notifications,
  onTabChange,
  onOpenAuthModal,
  onOpenProfileModal,
  onSignOut,
  authUser,
  onClearNotifications,
  onMarkAllRead,
  onNotificationClick
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [pushPerm, setPushPerm] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "granted"
  );

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resetEmail || authUser?.email;
    if (!targetEmail) {
      setResetStatus("Vui lòng nhập địa chỉ Email khôi phục mật khẩu!");
      return;
    }
    setResetLoading(true);
    try {
      await resetUserPassword(targetEmail);
      setResetStatus("Hệ thống đã gửi hướng dẫn đặt lại mật khẩu tới Email của bạn thành công!");
    } catch (err: any) {
      setResetStatus(err?.message || "Lỗi gửi yêu cầu đổi mật khẩu.");
    } finally {
      setResetLoading(false);
    }
  };

  const displayName = authUser?.fullName || ctvUser.name;
  const displayEmail = authUser?.email || ctvUser.phone || "user@koreanstar.vn";

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "ctv":
        return { name: ctvUser.name, subtitle: "Cộng Tác Viên", icon: Users, badge: "CTV VIP" };
      case "admin":
        return { name: "Bệnh Viện KOREAN STAR", subtitle: "Ban Quản Trị Admin", icon: Building2, badge: "ADMIN" };
      case "editor":
        return { name: "Biên Tập Viên", subtitle: "Quản Lý Nội Dung & Ảnh 3D", icon: FileText, badge: "EDITOR" };
      case "accountant":
        return { name: "Bộ Phận Kế Toán", subtitle: "Duyệt Giải Ngân VietQR 24/7", icon: Wallet, badge: "KẾ TOÁN" };
      case "customer":
        return { name: "Khách Hàng Trải Nghiệm", subtitle: "Giao diện trải nghiệm dịch vụ", icon: User, badge: "GUEST" };
      default:
        return { name: ctvUser.name, subtitle: "CTV", icon: Users, badge: "CTV" };
    }
  };

  const activeRoleInfo = getRoleLabel(currentRole);

  return (
    <header className="bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] text-white border-b border-blue-900/50 sticky top-0 z-40 shadow-xl">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          
          {/* Brand Logo & Title */}
          <div
            className="flex items-center gap-2 min-w-0 shrink cursor-pointer hover:opacity-90 transition group"
            onClick={() => {
              if (onTabChange) {
                const targetTab =
                  currentRole === "admin"
                    ? "admin"
                    : currentRole === "editor"
                    ? "editor"
                    : currentRole === "accountant"
                    ? "accountant"
                    : currentRole === "customer"
                    ? "service-catalog"
                    : "ctv-dashboard";
                onTabChange(targetTab);
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title="Quay về trang chủ"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md flex items-center justify-center font-bold text-white shrink-0">
              <div className="w-full h-full bg-[#0B192C] rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-sm sm:text-lg font-black tracking-tight text-white leading-none truncate">
                  KOREAN <span className="text-amber-400 font-extrabold">STAR</span>
                </h1>
                <span className="hidden sm:inline-block bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] px-1.5 py-0.5 rounded-md font-mono uppercase font-bold shrink-0">
                  REALTIME
                </span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5 hidden md:block truncate">
                Hệ Thống Thẩm Mỹ & Quản Lý Cộng Tác Viên
              </p>
            </div>
          </div>

          {/* Right Header Actions: Notifications & Account Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 sm:p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                title="Thông báo hệ thống"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                {notifications.filter((n) => n.isRead === false || (n.isRead === undefined && notifications.length > 0)).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-mono text-[9px] font-extrabold flex items-center justify-center animate-pulse shadow-xs">
                    {notifications.filter((n) => n.isRead === false || (n.isRead === undefined && notifications.length > 0)).length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl z-50 p-3.5 space-y-3 animate-scaleUp text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <Bell className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">Thông Báo Thời Gian Thực</h4>
                        <span className="text-[10px] text-slate-500 font-medium">Cập nhật biến động CRM & Hoa hồng</span>
                      </div>
                    </div>

                    <span className="text-[10px] text-amber-700 font-mono font-black bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                      {notifications.filter((n) => !n.isRead).length} chưa đọc
                    </span>
                  </div>

                  {/* Browser Push Permission Banner */}
                  {pushPerm !== "granted" && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] text-amber-900 font-semibold">
                        <BellRing className="w-4 h-4 text-amber-600 animate-bounce shrink-0" />
                        <span>Bật thông báo đẩy trình duyệt để nhận tin tức thời!</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const perm = await requestNotificationPermission();
                          setPushPerm(perm);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded-lg font-bold text-[10px] shrink-0 transition cursor-pointer shadow-xs"
                      >
                        BẬT NGAY
                      </button>
                    </div>
                  )}

                  {/* Actions Header bar */}
                  {notifications.length > 0 && (
                    <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-semibold border-b border-slate-100 pb-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onMarkAllRead) onMarkAllRead();
                        }}
                        className="hover:text-blue-600 transition flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span>Đánh dấu đã đọc</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onClearNotifications) onClearNotifications();
                        }}
                        className="hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                        <span>Xóa tất cả</span>
                      </button>
                    </div>
                  )}

                  {/* Notifications Scrollable List */}
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((n) => {
                        const isUnread = n.isRead === false || n.isRead === undefined;
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (onNotificationClick) onNotificationClick(n);
                            }}
                            className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                              isUnread
                                ? "bg-amber-50/60 border-amber-200/80 shadow-2xs hover:bg-amber-50"
                                : "bg-slate-50/80 border-slate-200/60 hover:bg-white opacity-85"
                            }`}
                          >
                            {/* Icon per type */}
                            {n.type === "commission" ? (
                              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                                <Coins className="w-3.5 h-3.5" />
                              </div>
                            ) : n.type === "lead" ? (
                              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                                <Calendar className="w-3.5 h-3.5" />
                              </div>
                            ) : n.type === "postop" ? (
                              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                                <Stethoscope className="w-3.5 h-3.5" />
                              </div>
                            ) : n.type === "promo" ? (
                              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                                <Gift className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className={`text-[11px] font-extrabold truncate ${isUnread ? "text-slate-900" : "text-slate-700"}`}>
                                  {n.title || "Thông Báo Thời Gian Thực"}
                                </h5>
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 leading-snug font-medium line-clamp-2">
                                {n.text}
                              </p>
                              <div className="text-[9px] text-slate-400 font-mono pt-0.5">
                                {n.time}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <BellOff className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="font-extrabold text-xs text-slate-700">Chưa có thông báo mới nào</h5>
                          <p className="text-[10px] text-slate-400 font-medium">Tất cả thông báo biến động hệ thống thời gian thực sẽ xuất hiện tại đây.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Dropdown Menu (Gồm Tên, Đổi mật khẩu & Đăng xuất) */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 rounded-xl p-1.5 sm:px-3 flex items-center gap-2 transition text-left shadow-sm focus:outline-none cursor-pointer"
              >
                {authUser?.avatarUrl || authUser?.avatar || ctvUser.avatar ? (
                  <img
                    src={authUser?.avatarUrl || authUser?.avatar || ctvUser.avatar}
                    alt={displayName}
                    className="w-8 h-8 rounded-lg object-cover border border-amber-400 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-500 text-[#0B192C] flex items-center justify-center shrink-0 font-extrabold shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
                
                <div className="hidden md:block text-left">
                  <div className="text-xs font-extrabold text-white line-clamp-1 max-w-[120px]">
                    {displayName}
                  </div>
                  <span className="text-[9px] text-amber-400 font-bold block leading-tight font-mono">
                    {activeRoleInfo.badge}
                  </span>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Account Dropdown Menu Panel */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2.5 space-y-2 animate-scaleUp text-xs text-slate-900">
                  
                  {/* 1. TÊN TÀI KHOẢN & THÔNG TIN */}
                  <div className="p-3 bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] text-white rounded-xl shadow-sm border border-blue-900/50 flex items-center gap-3">
                    {(authUser?.avatarUrl || authUser?.avatar || ctvUser.avatar) && (
                      <img
                        src={authUser?.avatarUrl || authUser?.avatar || ctvUser.avatar}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-sm text-white truncate">
                          {displayName}
                        </span>
                        <span className="bg-amber-400 text-[#0B192C] text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded shadow-xs shrink-0">
                          {activeRoleInfo.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate font-mono">
                        {displayEmail}
                      </div>
                    </div>
                  </div>

                  {/* 2. MENU THÔNG TIN CÁ NHÂN & ĐỔI MẬT KHẨU & ĐĂNG XUẤT */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    
                    {/* THÔNG TIN CÁ NHÂN */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        if (onOpenProfileModal) {
                          onOpenProfileModal();
                        } else if (onOpenAuthModal) {
                          onOpenAuthModal();
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-amber-300/90 bg-amber-50/80 hover:bg-amber-100 text-slate-900 font-black flex items-center gap-2.5 transition text-left cursor-pointer shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-[#0B192C] flex items-center justify-center shrink-0 font-black shadow-xs">
                        <User className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                          <span>Thông Tin Cá Nhân</span>
                          <span className="text-[9px] bg-amber-400 text-[#0B192C] font-mono px-1.5 py-0.2 rounded font-bold">SỬA HỒ SƠ</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium truncate">Chỉnh sửa Họ tên, SĐT, Ngân hàng, Avatar</div>
                      </div>
                    </button>

                    {/* ĐỔI MẬT KHẨU */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setResetEmail(authUser?.email || "");
                        setResetStatus(null);
                        setChangePasswordModalOpen(true);
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-800 font-extrabold flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900">Đổi Mật Khẩu</div>
                        <div className="text-[10px] text-slate-500 font-normal truncate">Gửi link đặt lại mật khẩu an toàn</div>
                      </div>
                    </button>

                    {/* ĐĂNG XUẤT HOẶC ĐĂNG NHẬP */}
                    {authUser ? (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onSignOut) onSignOut();
                        }}
                        className="w-full p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold flex items-center gap-2.5 transition text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-rose-900">Đăng Xuất</div>
                          <div className="text-[10px] text-rose-600 font-normal truncate">Thoát tài khoản khỏi hệ thống</div>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenAuthModal) onOpenAuthModal();
                        }}
                        className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold flex items-center gap-2.5 transition text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-400 text-[#0B192C] flex items-center justify-center shrink-0 font-bold">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-amber-950">Đăng Nhập Supabase</div>
                          <div className="text-[10px] text-amber-700 font-normal truncate">Kết nối tài khoản hệ thống</div>
                        </div>
                      </button>
                    )}

                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal Đổi Mật Khẩu */}
      {changePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden relative p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                  Đổi Mật Khẩu Tài Khoản
                </h3>
              </div>
              <button
                onClick={() => setChangePasswordModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendResetPassword} className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium leading-relaxed">
                Nhập địa chỉ Email tài khoản để nhận link thiết lập lại mật khẩu mới an toàn qua Supabase.
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Tài Khoản (*):</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="user@koreanstar.vn"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {resetStatus && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] font-bold">
                  {resetStatus}
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] font-black transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {resetLoading ? "Đang gửi..." : "Gửi Link Đổi MK"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </header>
  );
};



