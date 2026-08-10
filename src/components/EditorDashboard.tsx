import React, { useState } from "react";
import { ServiceItem, VideoGuide, Promotion, ServiceFeedback } from "../types";
import { BeforeAfterGallery } from "./BeforeAfterGallery";
import { 
  FileText, 
  Image, 
  Video, 
  Sparkles, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Stethoscope, 
  Camera, 
  GraduationCap, 
  Flame,
  CheckCircle2,
  X
} from "lucide-react";

interface EditorDashboardProps {
  services: ServiceItem[];
  videoGuides: VideoGuide[];
  promotions: Promotion[];
  feedbacks?: ServiceFeedback[];
  onAddService: (newService: ServiceItem) => void;
  onUpdateService: (updatedService: ServiceItem) => void;
  onDeleteService: (serviceId: string) => void;
  onAddVideo: (newVid: VideoGuide) => void;
  onUpdateVideo: (updatedVid: VideoGuide) => void;
  onDeleteVideo: (vidId: string) => void;
  onAddPromo: (newPromo: Promotion) => void;
  onUpdatePromo: (updatedPromo: Promotion) => void;
  onDeletePromo: (promoId: string) => void;
  onAddFeedback?: (newFb: ServiceFeedback) => void;
  onUpdateFeedback?: (updatedFb: ServiceFeedback) => void;
  onDeleteFeedback?: (fbId: string) => void;
}

export const EditorDashboard: React.FC<EditorDashboardProps> = ({
  services,
  videoGuides,
  promotions,
  feedbacks = [],
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddVideo,
  onUpdateVideo,
  onDeleteVideo,
  onAddPromo,
  onUpdatePromo,
  onDeletePromo,
  onAddFeedback,
  onUpdateFeedback,
  onDeleteFeedback
}) => {
  const [activeTab, setActiveTab] = useState<"services" | "before-after" | "media" | "promotions">("services");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner - Content Editor Command Center */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] border border-blue-900/60 rounded-3xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4 text-amber-400" /> BẢNG QUẢN TRỊ BIÊN TẬP VIÊN NỘI DUNG (CONTENT EDITOR)
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-white">
            Trung Tâm Cập Nhật Thông Tin, Bài Viết & Ảnh Before/After 3D
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Quản lý bảng giá niêm yết • Biên tập bài viết y khoa • Cập nhật hình ảnh Before/After & Flash Sale.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> Quyền Quản Trị Nội Dung
          </span>
        </div>
      </div>

      {/* KPI Content Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-1 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-extrabold uppercase block truncate">Dịch Vụ Niêm Yết</span>
          <div className="text-base sm:text-2xl font-black font-mono text-amber-700">{services.length} Dịch Vụ</div>
          <div className="text-[10px] text-slate-500 font-medium">Đã chuẩn hóa giá & hoa hồng</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-1 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-extrabold uppercase block truncate">Ca Lâm Sàng Before/After</span>
          <div className="text-base sm:text-2xl font-black font-mono text-purple-700">{feedbacks.length} Bộ Ảnh 3D</div>
          <div className="text-[10px] text-slate-500 font-medium">Hình ảnh thực tế chuẩn y khoa</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-1 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-extrabold uppercase block truncate">Bài Viết & Video Kịch Bản</span>
          <div className="text-base sm:text-2xl font-black font-mono text-blue-700">{videoGuides.length} Bài Viết</div>
          <div className="text-[10px] text-slate-500 font-medium">Video hướng dẫn tư vấn CTV</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-1 shadow-xs">
          <span className="text-[11px] sm:text-xs text-slate-500 font-extrabold uppercase block truncate">Chương Trình Ưu Đãi</span>
          <div className="text-base sm:text-2xl font-black font-mono text-emerald-700">{promotions.length} Voucher</div>
          <div className="text-[10px] text-slate-500 font-medium">Flash sale thời gian thực</div>
        </div>
      </div>

      {/* Main Content Management Controls Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 text-slate-900 space-y-5 shadow-sm">
        
        {/* Sub-tabs */}
        <div className="flex border-b border-slate-100 gap-3 sm:gap-6 text-xs font-extrabold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("services")}
            className={`pb-3 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "services" ? "border-amber-500 text-amber-800 font-black" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Stethoscope className="w-4 h-4 text-amber-600" />
            <span>1. Biên Tập Dịch Vụ ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("before-after")}
            className={`pb-3 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "before-after" ? "border-amber-500 text-amber-800 font-black" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Camera className="w-4 h-4 text-purple-600" />
            <span>2. Ảnh Trước Sau ({feedbacks.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab("media")}
            className={`pb-3 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "media" ? "border-amber-500 text-amber-800 font-black" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <span>3. Quản Lý Thư Viện Bài Viết & Video ({videoGuides.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("promotions")}
            className={`pb-3 border-b-2 transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "promotions" ? "border-amber-500 text-amber-800 font-black" : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Flame className="w-4 h-4 text-amber-600" />
            <span>4. Biên Tập Ưu Đãi Flash Sale ({promotions.length})</span>
          </button>
        </div>

        {/* TAB 1: SERVICES & BEFORE/AFTER */}
        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Image className="w-4 h-4 text-amber-600" /> Quản Lý Thông Tin Dịch Vụ & Hình Ảnh Lâm Sàng Before/After
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Biên tập nội dung mô tả, cập nhật giá niêm yết và hoa hồng CTV</p>
              </div>

              <input id="tMTNDChV_176" name="tMTNDChV_176"
                type="text"
                placeholder="Tìm tên dịch vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 w-full sm:w-56"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((srv) => (
                <div key={srv.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={srv.image} alt={srv.name} className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        {srv.categoryName}
                      </span>
                      <h4 className="font-black text-sm text-slate-900 mt-1 leading-snug whitespace-normal break-words">{srv.name}</h4>
                      <div className="text-xs font-mono font-black text-amber-700 mt-0.5">
                        {srv.price.toLocaleString("vi-VN")}đ <span className="text-slate-400 text-[10px] font-normal font-sans">(Hoa hồng: {srv.commissionRate}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Before/After Preview Images */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-center text-[10px]">
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">Ảnh Before (Trước):</span>
                      <img src={srv.beforeAfter.before} alt="Before" className="w-full h-16 rounded-lg object-cover border border-slate-100" />
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">Ảnh After (Sau):</span>
                      <img src={srv.beforeAfter.after} alt="After" className="w-full h-16 rounded-lg object-cover border border-slate-100" />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                    <button
                      onClick={() => onDeleteService(srv.id)}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ẢNH TRƯỚC SAU (BEFORE/AFTER GALLERY CRUD) */}
        {activeTab === "before-after" && (
          <BeforeAfterGallery
            services={services}
            feedbacks={feedbacks}
            isAdmin={true}
            onBookAppointment={(srvName) => {}}
            onAddFeedback={onAddFeedback}
            onUpdateFeedback={onUpdateFeedback}
            onDeleteFeedback={onDeleteFeedback}
          />
        )}

        {/* TAB 3: ARTICLES & VIDEOS */}
        {activeTab === "media" && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-700" /> Thư Viện Kịch Bản Video & Bài Viết Y Khoa
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Biên tập tài liệu chuẩn y khoa tư vấn cho CTV và khách hàng</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoGuides.map((vid) => (
                <div key={vid.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={vid.thumbnail} alt={vid.title} className="w-20 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {vid.category}
                      </span>
                      <h4 className="font-extrabold text-xs text-slate-900 truncate mt-1">{vid.title}</h4>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Thời lượng: {vid.duration}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
                    <button
                      onClick={() => onDeleteVideo(vid.id)}
                      className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROMOTIONS */}
        {activeTab === "promotions" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600" /> Quản Lý Chương Trình Ưu Đãi & Voucher Flash Sale
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">Biên tập banner khuyến mãi thời gian thực</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {promotions.map((promo) => (
                <div key={promo.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-xs text-slate-900">{promo.title}</h4>
                  <div className="font-mono font-bold text-amber-700 text-xs">Mã: {promo.code} ({promo.discount})</div>
                  <div className="flex justify-end pt-1 border-t border-slate-200">
                    <button
                      onClick={() => onDeletePromo(promo.id)}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold"
                    >
                      Xóa Voucher
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
