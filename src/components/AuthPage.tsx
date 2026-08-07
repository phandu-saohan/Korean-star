import React, { useState, useRef, useEffect } from "react";
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Sparkles, 
  Eye, 
  EyeOff, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserPlus,
  LogIn,
  Wallet,
  Stethoscope,
  Upload,
  Building2,
  CreditCard,
  FileBadge,
  MapPin,
  Crop,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X,
  Move,
  Scissors,
  ChevronDown,
  ChevronLeft,
  Search,
  ShieldCheck
} from "lucide-react";
import { signInUser, signUpUser, resetUserPassword, fetchRolePermissionsFromSupabase, AuthUserProfile, saveRegisteredUserToLocalStorage } from "../lib/supabase";
import { notifyUserSignedUp } from "../lib/onesignal";
import { notifyZaloUserSignedUp } from "../services/zaloService";
import { VIETNAM_BANKS, getBankLogo, BankInfo } from "../lib/banks";

interface AuthPageProps {
  onAuthSuccess: (userProfile: AuthUserProfile) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  
  // Registration 8 Fields
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState(VIETNAM_BANKS[0].shortName);
  const [idCardNumber, setIdCardNumber] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [signupRole, setSignupRole] = useState<string>("ctv");
  const [availableRoles] = useState<{ roleKey: string; roleName: string }[]>([
    { roleKey: "ctv", roleName: "Cộng Tác Viên (CTV)" },
    { roleKey: "admin", roleName: "Ban Quản Trị (Admin)" },
    { roleKey: "editor", roleName: "Biên Tập Viên (Editor)" },
    { roleKey: "accountant", roleName: "Bộ Phận Kế Toán" }
  ]);

  // Bank Selector Modal States
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // Policy & Terms Modal State
  const [policyModalType, setPolicyModalType] = useState<"privacy" | "terms" | "help" | null>(null);

  // Interactive 1:1 Image Cropper Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Canvas Refs & Dragging Logic
  const cropperCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImgRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialOffsetRef = useRef({ x: 0, y: 0 });

  // Draw real-time on live canvas whenever rawImageSrc, zoom, rotation, or offset updates
  const redrawCanvas = () => {
    const canvas = cropperCanvasRef.current;
    if (!canvas || !loadedImgRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = loadedImgRef.current;
    const targetSize = 400;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Clear with dark navy theme background
    ctx.fillStyle = "#0B192C";
    ctx.fillRect(0, 0, targetSize, targetSize);

    ctx.save();

    // Scale ratio between screen display width and 400px canvas size
    const displayWidth = canvas.clientWidth || 340;
    const ratio = targetSize / displayWidth;

    // 1. Move to canvas center + scaled user pan offset
    ctx.translate(
      targetSize / 2 + offset.x * ratio,
      targetSize / 2 + offset.y * ratio
    );

    // 2. Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // 3. Zoom
    ctx.scale(zoom, zoom);

    // 4. Base aspect cover scale (fills 400x400 area automatically)
    const baseScale = Math.max(targetSize / img.width, targetSize / img.height);
    const drawWidth = img.width * baseScale;
    const drawHeight = img.height * baseScale;

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();
  };

  useEffect(() => {
    if (!rawImageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      loadedImgRef.current = img;
      redrawCanvas();
    };
    img.src = rawImageSrc;
  }, [rawImageSrc]);

  useEffect(() => {
    redrawCanvas();
  }, [zoom, rotation, offset]);

  // Global Pointer / Touch Drag Event Handler for Smooth Unrestricted Panning
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      
      // Prevent page scrolling on touch devices while dragging
      if ("touches" in e && e.cancelable) {
        e.preventDefault();
      }

      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      setOffset({
        x: initialOffsetRef.current.x + deltaX,
        y: initialOffsetRef.current.y + deltaY
      });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, []);

  const handleStartDrag = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg("Kích thước ảnh đại diện không được vượt quá 8MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result as string);
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmCrop = () => {
    if (!cropperCanvasRef.current) return;
    try {
      const croppedResult = cropperCanvasRef.current.toDataURL("image/jpeg", 0.95);
      setAvatarPreview(croppedResult);
      setCropModalOpen(false);
      setRawImageSrc(null);
    } catch (err) {
      setErrorMsg("Không thể xử lý cắt ảnh. Vui lòng thử lại!");
    }
  };

  const filteredBanks = VIETNAM_BANKS.filter((b) => {
    const q = bankSearchQuery.toLowerCase();
    return (
      b.shortName.toLowerCase().includes(q) ||
      b.fullName.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q)
    );
  });

  const selectedBankObj = VIETNAM_BANKS.find(
    (b) => b.shortName.toLowerCase() === bankName.toLowerCase()
  ) || VIETNAM_BANKS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "signin") {
        if (!emailOrPhone || !password) {
          setErrorMsg("Vui lòng nhập đầy đủ Email hoặc Số điện thoại và Mật khẩu!");
          setLoading(false);
          return;
        }

        try {
          const { profile, user } = await signInUser(emailOrPhone, password);
          setSuccessMsg("Đăng nhập tài khoản thật qua Supabase thành công!");
          const authProfile: AuthUserProfile = profile || {
            id: user?.id || `user-${Date.now()}`,
            email: user?.email || emailOrPhone,
            fullName: user?.user_metadata?.full_name || emailOrPhone.split("@")[0] || "Tài Khoản Hệ Thống",
            phone: user?.user_metadata?.phone || emailOrPhone,
            role: user?.user_metadata?.role || "ctv",
            ctvCode: user?.user_metadata?.ctv_code || `SAOHAN-CTV`,
            tier: "Bạc",
            availableBalance: 0,
            pendingBalance: 0,
            totalRevenue: 0,
            totalCommission: 0
          };
          saveRegisteredUserToLocalStorage(authProfile);
          setTimeout(() => {
            onAuthSuccess(authProfile);
          }, 400);
        } catch (authErr: any) {
          setErrorMsg(authErr.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại Email / SĐT và Mật khẩu!");
        }
      } else if (mode === "signup") {
        // Validation for the 8 registration fields
        if (!avatarPreview) {
          setErrorMsg("1. Vui lòng tải lên và xác nhận Ảnh Đại Diện 1:1 (*)");
          setLoading(false);
          return;
        }
        if (!fullName.trim()) {
          setErrorMsg("2. Vui lòng nhập Họ Và Tên (*)");
          setLoading(false);
          return;
        }
        if (!signupEmail.trim()) {
          setErrorMsg("3. Vui lòng nhập Email đăng nhập (*)");
          setLoading(false);
          return;
        }
        if (!signupPhone.trim()) {
          setErrorMsg("4. Vui lòng nhập Số điện thoại đăng nhập (*)");
          setLoading(false);
          return;
        }
        if (!password) {
          setErrorMsg("Vui lòng thiết lập Mật Khẩu tài khoản (*)");
          setLoading(false);
          return;
        }
        if (!bankAccount.trim()) {
          setErrorMsg("5. Vui lòng nhập Số tài khoản ngân hàng (*)");
          setLoading(false);
          return;
        }
        if (!bankName) {
          setErrorMsg("6. Vui lòng chọn Tên Ngân Hàng (*)");
          setLoading(false);
          return;
        }
        if (!idCardNumber.trim()) {
          setErrorMsg("7. Vui lòng nhập Số Căn Cước Công Dân (CCCD) (*)");
          setLoading(false);
          return;
        }

        const cleanPhone = signupPhone.replace(/\D/g, "");
        const generatedCode = `SAOHAN-${fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase()}${cleanPhone.slice(-4) || "2026"}`;
        const userEmail = signupEmail.trim();

        try {
          const { user } = await signUpUser({
            email: userEmail,
            password,
            fullName,
            phone: signupPhone,
            role: signupRole,
            avatarUrl: avatarPreview,
            bankName,
            bankAccount,
            idCardNumber,
            facilityName
          });

          setSuccessMsg("Đăng ký tài khoản thành công trên Supabase!");
          const authProfile: AuthUserProfile = {
            id: user?.id || `user-${Date.now()}`,
            email: userEmail,
            fullName,
            phone: signupPhone,
            role: signupRole,
            ctvCode: generatedCode,
            avatarUrl: avatarPreview,
            bankName,
            accountNumber: bankAccount,
            accountHolder: fullName.toUpperCase(),
            idCardNumber,
            facilityName: facilityName.trim() || undefined,
            tier: "Bạc",
            availableBalance: 0,
            pendingBalance: 0,
            totalRevenue: 0,
            totalCommission: 0
          };
          saveRegisteredUserToLocalStorage(authProfile);
          notifyUserSignedUp({ fullName, email: userEmail, phone: signupPhone, role: signupRole });
          notifyZaloUserSignedUp({ fullName, email: userEmail, phone: signupPhone, role: signupRole });
          setTimeout(() => {
            onAuthSuccess(authProfile);
          }, 500);
        } catch (signupErr: any) {
          setErrorMsg(signupErr.message || "Lỗi đăng ký tài khoản trên Supabase. Vui lòng thử lại!");
        }
      } else if (mode === "forgot") {
        if (!emailOrPhone) {
          setErrorMsg("Vui lòng nhập Email hoặc Số điện thoại khôi phục mật khẩu");
          setLoading(false);
          return;
        }
        const targetEmail = emailOrPhone.includes("@") ? emailOrPhone : `${emailOrPhone.replace(/\D/g, "")}@koreanstar.vn`;
        await resetUserPassword(targetEmail);
        setSuccessMsg("Link đặt lại mật khẩu đã được gửi tới địa chỉ của bạn thành công!");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi xử lý. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: "admin" | "ctv" | "editor" | "accountant") => {
    setErrorMsg("");
    setSuccessMsg("");
    let email = "";
    let name = "";
    let code = "";

    if (role === "admin") {
      email = "admin@koreanstar.vn";
      name = "Ban Quản Trị Admin";
      code = "SAOHAN-ADMIN";
    } else if (role === "editor") {
      email = "editor@koreanstar.vn";
      name = "Biên Tập Viên Y Khoa";
      code = "SAOHAN-EDITOR";
    } else if (role === "accountant") {
      email = "accountant@koreanstar.vn";
      name = "Kế Toán Giải Ngân VietQR";
      code = "SAOHAN-KETOAN";
    } else {
      email = "saohan.ctv@gmail.com";
      name = "Phan Du";
      code = "SAOHAN-PHANDU3486";
    }

    const demoProfile: AuthUserProfile = {
      id: `demo-${role}-${Date.now()}`,
      email,
      fullName: name,
      phone: role === "ctv" ? "093788945" : "0901888999",
      role,
      ctvCode: code,
      tier: "Kim Cương",
      availableBalance: role === "ctv" ? 0 : 50000000,
      pendingBalance: 0,
      totalRevenue: role === "ctv" ? 0 : 350000000,
      totalCommission: role === "ctv" ? 0 : 52500000
    };

    saveRegisteredUserToLocalStorage(demoProfile);
    setSuccessMsg(`Đang vào hệ thống với quyền ${name}...`);
    setTimeout(() => {
      onAuthSuccess(demoProfile);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B192C] via-[#102A45] to-[#0B192C] text-white flex flex-col items-center justify-center p-4 selection:bg-amber-400 selection:text-[#0B192C] relative overflow-x-hidden">
      
      {/* Background Subtle Glows */}
      <div className="fixed top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Centered Content Envelope */}
      <main className={`w-full my-auto flex flex-col items-center justify-center space-y-4 z-10 py-4 sm:py-6 transition-all duration-300 max-w-full px-2 sm:px-4 overflow-x-hidden ${
        mode === "signup" ? "max-w-xl" : "max-w-md"
      }`}>
        
        {/* LOGO SECTION: ICON ON TOP, NAME BELOW */}
        <div className="text-center space-y-3 w-full max-w-full">
          {/* Logo Icon on Top */}
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-500 text-[#0B192C] shadow-2xl flex items-center justify-center font-bold mx-auto border-2 border-amber-300/40 animate-pulse">
            <Sparkles className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              KOREAN <span className="text-amber-400">STAR</span>
            </h1>
            <p className="text-amber-400 font-extrabold text-[11px] tracking-widest uppercase mt-1">
              BỆNH VIỆN THẨM MỸ QUỐC TẾ
            </p>
            <p className="text-slate-300 text-xs font-medium mt-1">
              Hệ thống quản lý Cộng tác viên & Doanh số Realtime
            </p>
          </div>
        </div>

        {/* BACK NAVIGATION FOR REGISTRATION OR FORGOT MODES */}
        {mode !== "signin" && (
          <button
            type="button"
            onClick={() => { setMode("signin"); setErrorMsg(""); setSuccessMsg(""); }}
            className="self-start text-xs text-slate-300 hover:text-white font-extrabold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-md transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại Đăng Nhập
          </button>
        )}

        {/* AUTH FORM CARD (NO TABS) */}
        <div className="w-full bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
          
          {/* Header Title inside Card */}
          <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between border-b border-blue-900">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-[#0B192C] flex items-center justify-center font-extrabold">
                {mode === "signin" && <LogIn className="w-4 h-4" />}
                {mode === "signup" && <UserPlus className="w-4 h-4 text-emerald-800" />}
                {mode === "forgot" && <KeyRound className="w-4 h-4 text-blue-800" />}
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wide text-white">
                  {mode === "signin" && "ĐĂNG NHẬP HỆ THỐNG"}
                  {mode === "signup" && "ĐĂNG KÝ CỘNG TÁC VIÊN (CTV)"}
                  {mode === "forgot" && "KHÔI PHỤC MẬT KHẨU"}
                </h3>
                <p className="text-[10px] text-amber-400 font-bold">
                  {mode === "signin" && "Vui lòng nhập tài khoản của bạn để tiếp tục"}
                  {mode === "signup" && "Điền đầy đủ thông tin để khởi tạo tài khoản CTV"}
                  {mode === "forgot" && "Nhập email/SĐT để nhận hướng dẫn khôi phục"}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content Body */}
          <div className="p-5 sm:p-6 space-y-4">

            {/* Feedback Notifications */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* 1. FORM ĐĂNG NHẬP (TRANG ĐĂNG NHẬP CHÍNH) */}
              {mode === "signin" && (
                <>
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">Email hoặc Số điện thoại (*):</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="admin@koreanstar.vn hoặc SĐT..."
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">Mật Khẩu (*):</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                      />
                      <span>Ghi nhớ đăng nhập</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-amber-700 font-bold hover:underline cursor-pointer text-[11px]"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  {/* Nút Đăng Nhập Ngay */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 active:scale-98 text-[#0B192C] font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <span>Đang xử lý...</span>
                    ) : (
                      <>
                        <span>Đăng Nhập Ngay</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* NÚT TẠO TÀI KHOẢN CTV MỚI DƯỚI NÚT ĐĂNG NHẬP */}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="w-full py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Tạo tài khoản Cộng tác viên mới</span>
                  </button>
                </>
              )}

              {/* 2. FORM ĐĂNG KÝ CỘNG TÁC VIÊN (TRANG RIÊNG) */}
              {mode === "signup" && (
                <>
                  <div className="space-y-3">
                    {/* FIELD 1: AVATAR 1:1 CROPPER */}
                    <div>
                      <label className="block text-slate-700 font-extrabold text-[11px] mb-1">1. Ảnh Đại Diện (*):</label>
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-300/80 rounded-2xl p-2.5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-200 border-2 border-amber-400 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar 1:1" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#0B192C] font-extrabold text-xs cursor-pointer transition shadow-xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{avatarPreview ? "Đổi ảnh khác" : "Tải ảnh & Cắt 1:1"}</span>
                            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-extrabold text-[11px] mb-1">2. Họ Và Tên (*):</label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-extrabold text-[11px] mb-1">3. Email (*):</label>
                        <input
                          type="email"
                          required
                          placeholder="nguyenvana@gmail.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-extrabold text-[11px] mb-1">4. Số ĐT (*):</label>
                        <input
                          type="text"
                          required
                          placeholder="0912345678"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-extrabold text-[11px] mb-1">Mật Khẩu Tài Khoản (*):</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-extrabold text-[11px] mb-1">5. STK Ngân Hàng (*):</label>
                        <input
                          type="text"
                          required
                          placeholder="STK nhận hoa hồng"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-extrabold text-[11px] mb-1">6. Tên Ngân Hàng (*):</label>
                        <button
                          type="button"
                          onClick={() => setBankModalOpen(true)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-900 flex items-center justify-between transition cursor-pointer text-xs"
                        >
                          <span className="truncate font-black">{bankName}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-extrabold text-[11px] mb-1">7. Số CCCD (*):</label>
                      <input
                        type="text"
                        required
                        placeholder="12 số căn cước"
                        value={idCardNumber}
                        onChange={(e) => setIdCardNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-extrabold text-[11px] mb-1">8. Cơ sở (Tùy chọn):</label>
                      <input
                        type="text"
                        placeholder="Tên Spa / TMV của bạn"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-98 text-white font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <span>Đang xử lý...</span>
                    ) : (
                      <>
                        <span>Hoàn Tất Đăng Ký CTV</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => { setMode("signin"); setErrorMsg(""); setSuccessMsg(""); }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-bold"
                    >
                      Đã có tài khoản? <span className="text-amber-600 font-extrabold underline">Đăng nhập ngay</span>
                    </button>
                  </div>
                </>
              )}

              {/* 3. FORM KHÔI PHỤC MẬT KHẨU */}
              {mode === "forgot" && (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email hoặc Số điện thoại (*):</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="Email hoặc SĐT khôi phục..."
                        value={emailOrPhone}
                        onChange={(e) => setEmailOrPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:brightness-110 active:scale-98 text-white font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <span>Đang xử lý...</span>
                    ) : (
                      <>
                        <span>Gửi Link Khôi Phục</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => { setMode("signin"); setErrorMsg(""); setSuccessMsg(""); }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-bold"
                    >
                      Quay lại <span className="text-amber-600 font-extrabold underline">Đăng nhập</span>
                    </button>
                  </div>
                </>
              )}

            </form>

          </div>

        </div>

        {/* FOOTER: SYSTEM INFO, PRIVACY & TERMS */}
        <div className="w-full text-center space-y-2 pt-3 border-t border-white/10 text-slate-400 text-xs">
          
          {/* System Status & SSL Badge */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-300 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Realtime v2.5 Active
            </span>
            <span className="text-slate-500">•</span>
            <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" /> Bảo Mật SSL 256-Bit
            </span>
          </div>

          {/* Links: Policy & Terms */}
          <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-slate-300 flex-wrap">
            <button
              type="button"
              onClick={() => setPolicyModalType("privacy")}
              className="hover:text-amber-400 transition cursor-pointer underline decoration-slate-500 underline-offset-2"
            >
              Chính Sách Bảo Mật
            </button>
            <span className="text-slate-500">•</span>
            <button
              type="button"
              onClick={() => setPolicyModalType("terms")}
              className="hover:text-amber-400 transition cursor-pointer underline decoration-slate-500 underline-offset-2"
            >
              Điều Khoản Sử Dụng
            </button>
            <span className="text-slate-500">•</span>
            <button
              type="button"
              onClick={() => setPolicyModalType("help")}
              className="hover:text-amber-400 transition cursor-pointer underline decoration-slate-500 underline-offset-2"
            >
              Hướng Dẫn CTV
            </button>
          </div>

          {/* Copyright Info */}
          <p className="text-[10px] text-slate-400 pt-0.5">
            © 2026 Bệnh viện Thẩm mỹ Quốc tế Korean Star. Tất cả quyền được bảo lưu.
          </p>

        </div>

      </main>

      {/* RICH BANK SELECTOR MODAL WITH OFFICIAL LOGOS */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative p-5 space-y-4 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                    Chọn Ngân Hàng Thụ Hưởng
                  </h3>
                  <p className="text-[10px] text-slate-500">Hỗ trợ nhận hoa hồng tức thì qua VietQR 24/7</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm tên ngân hàng (Vietcombank, MB, TCB, VCB...)"
                value={bankSearchQuery}
                onChange={(e) => setBankSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Bank Items List Grid */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-2 max-h-[380px]">
              {filteredBanks.length > 0 ? (
                filteredBanks.map((b) => {
                  const isSelected = bankName.toLowerCase() === b.shortName.toLowerCase();
                  return (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => {
                        setBankName(b.shortName);
                        setBankModalOpen(false);
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? "bg-amber-50 border-amber-400 shadow-xs"
                          : "bg-slate-50/80 border-slate-200/80 hover:bg-white hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                          <img
                            src={b.logo}
                            alt={b.shortName}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = `https://api.vietqr.io/img/${b.code}.png`;
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-xs text-slate-900 truncate">{b.shortName}</h4>
                            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {b.code}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{b.fullName}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-[#0B192C] flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  Không tìm thấy ngân hàng khớp với từ khóa "{bankSearchQuery}"
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* INTERACTIVE 1:1 AVATAR CROPPER MODAL WITH REAL-TIME LIVE CANVAS */}
      {cropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative p-5 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                    Chỉnh Sửa & Cắt Ảnh 1:1
                  </h3>
                  <p className="text-[10px] text-slate-500">Kéo di chuyển, xoay hoặc phóng to ảnh vuông chuẩn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive 1:1 Crop Viewport Box */}
            <div className="space-y-3">
              
              {/* Viewport Frame Container */}
              <div
                onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
                onTouchStart={(e) => handleStartDrag(e.touches[0].clientX, e.touches[0].clientY)}
                className="w-full aspect-square bg-[#0B192C] rounded-2xl overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center select-none shadow-inner border-2 border-amber-400/80 touch-none"
              >
                {/* 1:1 Live HTML5 Canvas Viewport */}
                <canvas
                  ref={cropperCanvasRef}
                  width={400}
                  height={400}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* 1:1 Overlay Grid Lines */}
                <div className="absolute inset-0 border-2 border-amber-400 pointer-events-none z-20 rounded-2xl">
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                </div>

                <div className="absolute top-3 left-3 z-30 bg-[#0B192C]/85 text-amber-400 text-[10px] font-bold font-mono px-2 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 border border-amber-400/30">
                  <Move className="w-3 h-3" /> Kéo để di chuyển tự do
                </div>
              </div>

              {/* Cropper Interactive Controls (Zoom & Rotate) */}
              <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
                
                {/* Zoom Slider */}
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-[10px] font-mono font-bold text-slate-700 w-10 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                {/* Control Actions Row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xoay 90° ({rotation}°)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                      setOffset({ x: 0, y: 0 });
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                  >
                    Đặt lại mặc định
                  </button>
                </div>

              </div>

              {/* Action Confirmation Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCropModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer text-xs"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCrop}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] font-black transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận Cắt 1:1</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* POLICY, TERMS & HELP MODAL POPUP */}
      {policyModalType && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative p-5 space-y-4 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                    {policyModalType === "privacy" && "Chính Sách Bảo Mật Thông Tin"}
                    {policyModalType === "terms" && "Điều Khoản Sử Dụng Hệ Thống"}
                    {policyModalType === "help" && "Hướng Dẫn Dành Cho Cộng Tác Viên"}
                  </h3>
                  <p className="text-[10px] text-amber-700 font-bold">Bệnh viện Thẩm mỹ Quốc tế Korean Star</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPolicyModalType(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto space-y-3 text-xs text-slate-600 leading-relaxed pr-1">
              {policyModalType === "privacy" && (
                <>
                  <p className="font-bold text-slate-800">1. Cam kết bảo mật dữ liệu:</p>
                  <p>Hệ thống Korean Star cam kết bảo mật 100% dữ liệu cá nhân bao gồm Họ tên, Số điện thoại, CCCD và Số tài khoản ngân hàng của Cộng tác viên. Mọi dữ liệu đều được mã hóa SSL 256-bit chuẩn quốc tế.</p>
                  <p className="font-bold text-slate-800">2. Mục đích sử dụng thông tin:</p>
                  <p>Thông tin của CTV chỉ được sử dụng cho mục đích xác minh danh tính, đối soát lịch hẹn tư vấn và thực hiện chi trả hoa hồng tự động qua hệ thống VietQR.</p>
                  <p className="font-bold text-slate-800">3. Quyền riêng tư khách hàng:</p>
                  <p>Dữ liệu lịch hẹn khám bệnh và hình ảnh mô phỏng thẩm mỹ được lưu trữ riêng tư, chỉ có Bác sĩ và Admin Bệnh viện có quyền truy cập chuyên môn.</p>
                </>
              )}

              {policyModalType === "terms" && (
                <>
                  <p className="font-bold text-slate-800">1. Quy định đối với Cộng tác viên:</p>
                  <p>CTV có trách nhiệm tư vấn trung thực thông tin các dịch vụ thẩm mỹ của Bệnh viện Korean Star, không tự ý chỉnh sửa mức giá chính thức hoặc đưa ra cam kết vượt ngoài thẩm quyền.</p>
                  <p className="font-bold text-slate-800">2. Cơ chế ghi nhận hoa hồng & giải ngân:</p>
                  <p>Hoa hồng ghi nhận theo thời gian thực khi khách hàng hoàn tất thanh toán dịch vụ tại Bệnh viện. CTV có thể yêu cầu rút tiền về STK cá nhân 24/7 qua lệnh VietQR.</p>
                  <p className="font-bold text-slate-800">3. Xử lý vi phạm:</p>
                  <p>Hệ thống sẽ tự động khóa tài khoản đối với các trường hợp gian lận thông tin khách hàng hoặc vi phạm quy định đạo đức nghề nghiệp.</p>
                </>
              )}

              {policyModalType === "help" && (
                <>
                  <p className="font-bold text-slate-800">1. Đăng ký tài khoản CTV:</p>
                  <p>Nhấp nút "Tạo tài khoản Cộng tác viên mới", điền đầy đủ 8 thông tin cơ bản kèm ảnh đại diện cắt 1:1 và STK ngân hàng nhận hoa hồng.</p>
                  <p className="font-bold text-slate-800">2. Đặt lịch tư vấn cho khách hàng:</p>
                  <p>Vào mục CRM Khám Bệnh ➔ Chọn Tạo Lịch Hẹn Mới ➔ Nhập thông tin khách hàng và dịch vụ mong muốn.</p>
                  <p className="font-bold text-slate-800">3. Rút hoa hồng về ngân hàng:</p>
                  <p>Vào mục Ví Hoa Hồng ➔ Chọn "Rút Hoa Hồng" ➔ Hệ thống tự động tạo mã VietQR giải ngân về tài khoản ngân hàng của bạn trong vòng vài giây.</p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setPolicyModalType(null)}
                className="w-full py-2.5 rounded-xl bg-[#0B192C] text-amber-400 hover:bg-slate-800 font-extrabold text-xs transition cursor-pointer"
              >
                Đã Hiểu Và Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
