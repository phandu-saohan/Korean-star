import React, { useState, useRef, useEffect } from "react";
import { AuthUserProfile } from "../lib/supabase";
import { CTVUser } from "../types";
import { VIETNAM_BANKS, getBankLogo } from "../lib/banks";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Building2,
  FileBadge,
  MapPin,
  Camera,
  X,
  Check,
  ChevronDown,
  Search,
  ZoomIn,
  RotateCw,
  Move,
  Save,
  Loader2,
  ShieldCheck,
  MessageSquare
} from "lucide-react";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: AuthUserProfile | null;
  ctvUser: CTVUser;
  onSaveProfile: (updates: Partial<AuthUserProfile>) => Promise<void>;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  authUser,
  ctvUser,
  onSaveProfile
}) => {
  if (!isOpen) return null;

  // Form states pre-filled with authUser or ctvUser
  const [fullName, setFullName] = useState(authUser?.fullName || ctvUser.name || "");
  const [email] = useState(authUser?.email || "user@koreanstar.vn");
  const [phone, setPhone] = useState(authUser?.phone || ctvUser.phone || "");
  const [bankAccount, setBankAccount] = useState(
    authUser?.accountNumber ||
    (typeof ctvUser.bankAccount === "object" ? ctvUser.bankAccount?.accountNumber : ctvUser.bankAccount) ||
    ""
  );
  const [bankName, setBankName] = useState(
    authUser?.bankName ||
    (typeof ctvUser.bankAccount === "object" ? ctvUser.bankAccount?.bankName : "") ||
    "MB Bank"
  );
  const [idCardNumber, setIdCardNumber] = useState(
    authUser?.idCardNumber || (ctvUser as any).idCardNumber || ""
  );
  const [facilityName, setFacilityName] = useState(
    authUser?.facilityName || (ctvUser as any).facilityName || ""
  );
  const [zaloChatId, setZaloChatId] = useState(authUser?.zaloChatId || ctvUser.zaloChatId || "");
  const [avatarPreview, setAvatarPreview] = useState<string>(
    authUser?.avatarUrl || authUser?.avatar || ctvUser.avatar || ""
  );

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Bank Selector Modal State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // Image Cropper State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const cropperCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropperContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialOffsetRef = useRef({ x: 0, y: 0 });

  // Redraw Cropper Live HTML5 Canvas
  useEffect(() => {
    if (!cropModalOpen || !rawImageSrc || !cropperCanvasRef.current) return;
    const canvas = cropperCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = rawImageSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Viewport 400x400
      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Fit image cover
      const minDim = Math.min(img.width, img.height);
      const drawW = (img.width / minDim) * canvas.width;
      const drawH = (img.height / minDim) * canvas.height;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };
  }, [cropModalOpen, rawImageSrc, zoom, rotation, offset]);

  // Handle Cropper Pan Listeners
  useEffect(() => {
    if (!cropModalOpen) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

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
  }, [cropModalOpen]);

  const handleStartDrag = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg("Kích thước ảnh không được vượt quá 8MB!");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Vui lòng nhập Họ Và Tên!");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Vui lòng nhập Số điện thoại!");
      return;
    }
    if (!bankAccount.trim()) {
      setErrorMsg("Vui lòng nhập Số tài khoản ngân hàng!");
      return;
    }
    if (!idCardNumber.trim()) {
      setErrorMsg("Vui lòng nhập Số Căn cước công dân (CCCD)!");
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<AuthUserProfile> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        avatarUrl: avatarPreview,
        bankName,
        accountNumber: bankAccount.trim(),
        accountHolder: fullName.trim().toUpperCase(),
        idCardNumber: idCardNumber.trim(),
        facilityName: facilityName.trim(),
        zaloChatId: zaloChatId.trim()
      };

      await onSaveProfile(updates);
      setSuccessMsg("Cập nhật thông tin cá nhân thành công!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi cập nhật thông tin cá nhân!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-5 relative my-auto animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                Thông Tin Cá Nhân CTV
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Quản lý và cập nhật hồ sơ cá nhân, tài khoản ngân hàng VietQR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium p-3 rounded-xl flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="relative group shrink-0">
              <img
                src={avatarPreview || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"}
                alt="Avatar CTV"
                className="w-20 h-20 rounded-full object-cover border-4 border-amber-400 shadow-md bg-white"
              />
              <label
                htmlFor="profile-avatar-upload"
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
              >
                <Camera className="w-6 h-6" />
              </label>
              <input
                id="profile-avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
              <div className="font-extrabold text-sm text-slate-900">
                Ảnh Đại Diện CTV (Tỷ lệ 1:1)
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tải lên ảnh chân dung sắc nét để hiển thị chuyên nghiệp trên toàn hệ thống.
              </p>
              <label
                htmlFor="profile-avatar-upload"
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-[#0B192C] text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Đổi Ảnh Đại Diện (Cắt 1:1)</span>
              </label>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* 1. HỌ VÀ TÊN */}
            <div>
              <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                1. Họ Và Tên (*):
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* 2. EMAIL (READ-ONLY) */}
            <div>
              <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                2. Email (Đăng nhập):
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 font-mono text-slate-500 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* 3. SỐ ĐIỆN THOẠI */}
            <div>
              <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                3. Số điện thoại (*):
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* 4. SỐ TÀI KHOẢN NGÂN HÀNG */}
            <div>
              <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                4. Số tài khoản ngân hàng (*):
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="STK nhận hoa hồng"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            {/* 5. TÊN NGÂN HÀNG WITH LOGOS */}
            <div>
              <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                5. Tên Ngân hàng (*):
              </label>
              <button
                type="button"
                onClick={() => setBankModalOpen(true)}
                className="w-full bg-slate-50 border border-slate-300 hover:border-amber-500 rounded-xl px-3 py-2.5 font-bold text-slate-900 flex items-center justify-between transition cursor-pointer text-xs shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={getBankLogo(bankName)}
                    alt={bankName}
                    className="w-5 h-5 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                  />
                  <span className="truncate font-black">{bankName}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              </button>
            </div>

            {/* 6. SỐ CCCD */}
            <div>
              <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
                6. Số CCCD (*):
              </label>
              <div className="relative">
                <FileBadge className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Nhập 12 số Căn cước công dân"
                  value={idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 7. CƠ SỞ HOẠT ĐỘNG */}
          <div>
            <label className="block text-slate-700 font-extrabold text-[11px] mb-1">
              7. Cơ sở hoạt động <span className="text-slate-400 font-normal">(Nếu có)</span>:
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tên Spa / Clinic / TMV của bạn (Không bắt buộc)"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          {/* 8. ZALO CHAT ID CÁ NHÂN */}
          <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 space-y-1.5">
            <label className="block text-blue-950 font-extrabold text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" /> 8. Zalo Chat ID Cá Nhân (Tự Động Nhận Tin Zalo):
              </span>
              <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded-md border border-blue-200">
                REALTIME ZALO
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ví dụ: 123456789 (Nhập ID cuộc trò chuyện Zalo Bot)"
                value={zaloChatId}
                onChange={(e) => setZaloChatId(e.target.value)}
                className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2.5 font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-500 text-xs shadow-xs"
              />
            </div>
            <p className="text-[10px] text-blue-700 font-medium pt-0.5">
              💡 Hệ thống sẽ tự động gửi thông báo Lịch hẹn và Hoa hồng đến trực tiếp Chat ID Zalo này của bạn.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-[#0B192C] font-extrabold px-5 py-2.5 rounded-xl transition shadow-md text-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Thay Đổi Thông Tin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* BANK SELECTOR MODAL */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <h4 className="font-extrabold text-base text-slate-900">Chọn Ngân Hàng VietQR</h4>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm tên ngân hàng (MB, VCB, ACB, VPB...)"
                value={bankSearchQuery}
                onChange={(e) => setBankSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Bank Cards Grid */}
            <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
              {filteredBanks.map((bank) => {
                const isSelected = bankName.toLowerCase() === bank.shortName.toLowerCase();
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => {
                      setBankName(bank.shortName);
                      setBankModalOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-50 border-amber-400 text-amber-900 font-extrabold shadow-xs"
                        : "bg-white border-slate-200 hover:border-amber-300 text-slate-800 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={bank.logoUrl || bank.logo}
                        alt={bank.shortName}
                        className="w-8 h-8 object-contain bg-white p-1 rounded-lg border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{bank.shortName}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">({bank.code})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{bank.fullName}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1:1 LIVE HTML5 CANVAS CROPPER MODAL */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp flex flex-col items-center">
            
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-500" />
                <h4 className="font-extrabold text-base text-slate-900">Cắt Ảnh Đại Diện 1:1 Mượt Mà</h4>
              </div>
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewport Canvas 400x400 */}
            <div
              ref={cropperContainerRef}
              onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
              onTouchStart={(e) => handleStartDrag(e.touches[0].clientX, e.touches[0].clientY)}
              className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-400 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            >
              <canvas
                ref={cropperCanvasRef}
                width={400}
                height={400}
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* 1:1 Circular Mask Overlay */}
              <div className="absolute inset-0 border-[36px] border-black/50 rounded-full pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Move className="w-6 h-6 text-white/40 animate-pulse" />
              </div>
            </div>

            {/* Controls */}
            <div className="w-full space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="font-extrabold text-slate-700 flex items-center gap-1">
                  <ZoomIn className="w-4 h-4 text-amber-500" /> Phóng To / Thu Nhỏ:
                </span>
                <span className="font-mono font-bold text-amber-600">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 flex items-center gap-1 hover:bg-slate-100"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" /> Xoay 90°
                </button>
                <button
                  type="button"
                  onClick={() => setOffset({ x: 0, y: 0 })}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Căn Giữa
                </button>
              </div>
            </div>

            {/* Confirm Crop Button */}
            <div className="w-full flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                className="bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-extrabold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Ảnh 1:1</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
