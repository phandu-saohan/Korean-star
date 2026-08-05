import React, { useState } from "react";
import { ServiceItem, ServiceFeedback } from "../types";
import { 
  Camera, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Filter, 
  ChevronDown, 
  Star, 
  UserCheck, 
  Quote, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  Upload,
  ChevronLeft,
  ChevronRight,
  Search,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Images
} from "lucide-react";

interface BeforeAfterGalleryProps {
  services: ServiceItem[];
  feedbacks: ServiceFeedback[];
  onBookAppointment: (serviceName: string, notes: string) => void;
  onAddFeedback?: (newFb: ServiceFeedback) => void;
  onUpdateFeedback?: (updatedFb: ServiceFeedback) => void;
  onDeleteFeedback?: (fbId: string) => void;
  isAdmin?: boolean;
  initialServiceId?: string;
  onClearServiceFilter?: () => void;
}

// Helper Sub-component for Each Feedback Card Item in the Vertical List
const FeedbackCardItem: React.FC<{
  feedback: ServiceFeedback;
  index: number;
  onBookAppointment: (serviceName: string, notes: string) => void;
  onOpenEdit?: (fb: ServiceFeedback) => void;
  onDeleteFeedback?: (fbId: string) => void;
  isAdmin?: boolean;
}> = ({ feedback, index, onBookAppointment, onOpenEdit, onDeleteFeedback, isAdmin }) => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Gather unique non-empty images for this customer feedback
  const allImages = Array.from(
    new Set([feedback.beforeImage, feedback.afterImage, ...(feedback.images || [])].filter(Boolean))
  );

  const currentLightboxImg = allImages[lightboxIndex] || feedback.afterImage;

  const getImageLabel = (idx: number) => {
    if (idx === 0) return "TRƯỚC PHẪU THUẬT";
    if (idx === 1) return "SAU THẨM MỸ 30 NGÀY";
    return `GÓC CHỤP LÂM SÀNG #${idx + 1}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm hover:shadow-md transition relative">
      
      {/* Feedback Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-[#0B192C] font-black text-sm flex items-center justify-center shadow-xs shrink-0">
            #{index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900">{feedback.customerName}</h3>
              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {feedback.customerAge}
              </span>
            </div>
            <span className="text-xs font-bold text-amber-700 block mt-0.5">
              Dịch vụ: {feedback.serviceName}
            </span>
          </div>
        </div>

        {/* Doctor & Rating */}
        <div className="flex items-center gap-3 flex-wrap self-end sm:self-center">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-amber-500">
              {Array.from({ length: feedback.rating || 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs font-bold text-slate-700 ml-1">5.0</span>
            </div>
            <span className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1 justify-end mt-0.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" /> {feedback.doctorName}
            </span>
          </div>

        {/* Admin Edit & Delete Buttons - Restricted to Admin & Editor */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            {onOpenEdit && (
              <button
                onClick={() => onOpenEdit(feedback)}
                className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl transition shadow-xs cursor-pointer"
                title="Chỉnh Sửa Feedback"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDeleteFeedback && (
              <button
                onClick={() => onDeleteFeedback(feedback.id)}
                className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl transition shadow-xs cursor-pointer"
                title="Xóa Feedback"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Main Grid: Carousel Bộ Ảnh + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT: MULTI-IMAGE CAROUSEL */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="space-y-2">
            <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-slate-900 rounded-2xl overflow-hidden border border-slate-200">
              <img
                src={allImages[carouselIndex] || feedback.afterImage}
                alt={`Ảnh ${carouselIndex + 1}`}
                onClick={() => {
                  setLightboxIndex(carouselIndex);
                  setZoomLevel(1);
                  setIsLightboxOpen(true);
                }}
                className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition duration-300"
              />

              {/* Badge Label */}
              <div className="absolute top-3 left-3 bg-[#0B192C]/85 backdrop-blur-md text-amber-400 font-black text-[10px] sm:text-xs px-3 py-1 rounded-full border border-amber-500/40 shadow-md">
                {getImageLabel(carouselIndex)} ({carouselIndex + 1}/{allImages.length})
              </div>

              {/* Navigation Arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCarouselIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0B192C]/80 hover:bg-[#0B192C] text-white flex items-center justify-center transition shadow-lg border border-slate-700 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 text-amber-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCarouselIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0B192C]/80 hover:bg-[#0B192C] text-white flex items-center justify-center transition shadow-lg border border-slate-700 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5 text-amber-400" />
                  </button>
                </>
              )}

              {/* Zoom Button */}
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(carouselIndex);
                  setZoomLevel(1);
                  setIsLightboxOpen(true);
                }}
                className="absolute bottom-3 right-3 bg-[#0B192C]/85 hover:bg-[#0B192C] backdrop-blur-md text-amber-400 font-extrabold text-[11px] px-3 py-1.5 rounded-xl border border-amber-500/40 shadow-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Phóng To HD</span>
              </button>
            </div>

            {/* Thumbnails Row */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allImages.map((imgUrl, imgIdx) => (
                  <button
                    key={imgIdx}
                    type="button"
                    onClick={() => setCarouselIndex(imgIdx)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                      carouselIndex === imgIdx
                        ? "border-amber-500 ring-2 ring-amber-400/50 scale-105"
                        : "border-slate-200 opacity-65 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt={`Ảnh ${imgIdx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-[#0B192C]/80 text-white text-[8px] font-extrabold text-center py-0.5">
                      #{imgIdx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT DETAILS INFO & CTA */}
        <div className="lg:col-span-5 space-y-3 text-xs">
          
          {/* Treatment & Recovery Details */}
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-1.5">
            <span className="text-slate-500 font-bold uppercase text-[10px] block">Gói Kỹ Thuật Thực Hiện:</span>
            <p className="text-slate-900 font-extrabold text-xs">{feedback.treatmentDetails}</p>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-[11px]">
              <span className="text-slate-500">Phục hồi:</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                {feedback.recoveryDays}
              </span>
            </div>
          </div>

          {/* Customer Testimonial Quote */}
          <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl relative space-y-1">
            <Quote className="w-4 h-4 text-amber-400 absolute top-2 right-2 opacity-50" />
            <span className="text-amber-900 font-black text-[11px] block">Cảm nhận thực tế từ khách hàng:</span>
            <p className="text-slate-800 text-xs font-medium italic leading-relaxed">
              "{feedback.reviewText}"
            </p>
          </div>

          {/* Hospital Guarantee */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl text-[11px] text-slate-700 font-medium space-y-1">
            <div className="font-bold text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Bệnh viện KOREAN STAR Cam Kết:
            </div>
            <p className="text-[10px] text-slate-600">Bảo hành bằng văn bản trọn đời - Phòng mổ Áp lực dương vô trùng 100%</p>
          </div>

          {/* Action CTA Button */}
          <button
            onClick={() => onBookAppointment(feedback.serviceName, `Khách hàng tư vấn từ Feedback #${index + 1} (${feedback.customerName})`)}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-[#0B192C] font-black py-3 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" /> Đặt Lịch Tư Vấn Ca Lâm Sàng Này
          </button>
        </div>

      </div>

      {/* FULLSCREEN INTERACTIVE LIGHTBOX MODAL */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-70 bg-[#0B192C]/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 animate-fadeIn text-white">
          
          {/* Lightbox Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="bg-amber-500 text-[#0B192C] font-black text-xs px-3 py-1 rounded-full">
                {getImageLabel(lightboxIndex)} ({lightboxIndex + 1}/{allImages.length})
              </span>
              <h4 className="font-extrabold text-sm text-white hidden sm:block">
                {feedback.customerName} • {feedback.serviceName}
              </h4>
            </div>

            {/* Zoom Controls & Close Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-extrabold text-amber-400 px-2">{zoomLevel}x</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition ml-2 cursor-pointer"
                title="Đóng chế độ xem lớn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Image Preview Area with Zoom */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden my-4 select-none">
            {allImages.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
                }}
                className="absolute left-2 sm:left-4 z-20 w-12 h-12 rounded-full bg-[#0B192C]/80 hover:bg-[#0B192C] text-amber-400 border border-amber-500/40 flex items-center justify-center transition shadow-2xl cursor-pointer"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}

            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={currentLightboxImg}
                alt="Full size customer photo"
                style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.2s ease-out" }}
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-slate-700/50"
              />
            </div>

            {allImages.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setLightboxIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-2 sm:right-4 z-20 w-12 h-12 rounded-full bg-[#0B192C]/80 hover:bg-[#0B192C] text-amber-400 border border-amber-500/40 flex items-center justify-center transition shadow-2xl cursor-pointer"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </div>

          {/* Lightbox Footer Thumbnails Strip */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pt-3 border-t border-slate-800">
            {allImages.map((imgUrl, imgIdx) => (
              <button
                key={imgIdx}
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setLightboxIndex(imgIdx);
                }}
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                  lightboxIndex === imgIdx
                    ? "border-amber-400 ring-2 ring-amber-400/60 scale-105"
                    : "border-slate-700 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={imgUrl} alt={`Lightbox thumb ${imgIdx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};

export const BeforeAfterGallery: React.FC<BeforeAfterGalleryProps> = ({
  services,
  feedbacks,
  onBookAppointment,
  onAddFeedback,
  onUpdateFeedback,
  onDeleteFeedback,
  isAdmin = false,
  initialServiceId = "ALL",
  onClearServiceFilter
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Sync khi initialServiceId thay đổi từ bên ngoài (ví dụ từ ServiceCatalog)
  React.useEffect(() => {
    if (initialServiceId && initialServiceId !== "ALL") {
      setSelectedServiceId(initialServiceId);
      setSelectedCategory("ALL");
      setCurrentPage(1);
    }
  }, [initialServiceId]);

  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<ServiceFeedback | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceList, setShowServiceList] = useState(false);
  const [fbFormData, setFbFormData] = useState<Partial<ServiceFeedback>>({
    serviceId: services[0]?.id || "",
    customerName: "",
    customerAge: "Nữ 28 tuổi (Hà Nội)",
    doctorName: "Bs. CKII Nguyễn Văn Hùng",
    rating: 5,
    beforeImage: "",
    afterImage: "",
    reviewText: "Kết quả phẫu thuật đẹp xuất sắc ngoài mong đợi, không sưng đau nhức...",
    treatmentDetails: "Gói phẫu thuật cao cấp chuẩn y khoa KOREAN STAR",
    recoveryDays: "3 - 5 ngày",
    date: new Date().toLocaleDateString("vi-VN")
  });

  const handleOpenAdd = () => {
    setEditingFeedback(null);
    setUploadedImages([]);
    setServiceSearch("");
    setShowServiceList(false);
    const defaultSrv = services[0];
    setFbFormData({
      serviceId: defaultSrv?.id || "",
      customerName: "",
      customerAge: "Nữ 28 tuổi (Hà Nội)",
      doctorName: "Bs. CKII Nguyễn Văn Hùng",
      rating: 5,
      beforeImage: "",
      afterImage: "",
      reviewText: "Kết quả phẫu thuật hoàn hảo, phom dáng đẹp tự nhiên vượt mong đợi...",
      treatmentDetails: defaultSrv?.beforeAfter?.treatmentDetails || defaultSrv?.name || "Gói phẫu thuật cao cấp KOREAN STAR",
      recoveryDays: defaultSrv?.recoveryTime || "3 - 5 ngày",
      date: new Date().toLocaleDateString("vi-VN")
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fb: ServiceFeedback) => {
    setEditingFeedback(fb);
    setFbFormData({ ...fb });
    const existingImgs = [fb.beforeImage, fb.afterImage, ...(fb.images || [])].filter(Boolean);
    setUploadedImages(Array.from(new Set(existingImgs)).slice(0, 5));
    const foundSrv = services.find((s) => s.id === fb.serviceId);
    setServiceSearch(foundSrv ? `${foundSrv.name} (${foundSrv.categoryName})` : "");
    setShowServiceList(false);
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbFormData.customerName) {
      alert("Vui lòng nhập Tên Khách Hàng!");
      return;
    }

    const srv = services.find((s) => s.id === fbFormData.serviceId) || services[0];
    const beforeImg = uploadedImages[0] || fbFormData.beforeImage || "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80";
    const afterImg = uploadedImages[1] || uploadedImages[0] || fbFormData.afterImage || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80";

    if (editingFeedback && onUpdateFeedback) {
      const updated: ServiceFeedback = {
        ...editingFeedback,
        ...fbFormData,
        serviceId: srv.id,
        serviceName: srv.name,
        customerName: fbFormData.customerName || editingFeedback.customerName,
        beforeImage: beforeImg,
        afterImage: afterImg,
        images: uploadedImages.length > 0 ? uploadedImages : editingFeedback.images,
        recoveryDays: fbFormData.recoveryDays || srv.recoveryTime || "3 - 5 ngày",
        treatmentDetails: fbFormData.treatmentDetails || srv.beforeAfter?.treatmentDetails || srv.name
      } as ServiceFeedback;
      onUpdateFeedback(updated);
    } else if (onAddFeedback) {
      const newFb: ServiceFeedback = {
        id: `fb-${Date.now()}`,
        serviceId: srv.id,
        serviceName: srv.name,
        customerName: fbFormData.customerName || "Khách Hàng Thẩm Mỹ",
        customerAge: fbFormData.customerAge || "Nữ 28 tuổi (Hà Nội)",
        doctorName: fbFormData.doctorName || "Bs. CKII Nguyễn Văn Hùng",
        rating: Number(fbFormData.rating) || 5,
        beforeImage: beforeImg,
        afterImage: afterImg,
        reviewText: fbFormData.reviewText || "Cảm nhận tuyệt vời sau ca phẫu thuật...",
        treatmentDetails: fbFormData.treatmentDetails || srv.beforeAfter?.treatmentDetails || srv.name,
        recoveryDays: fbFormData.recoveryDays || srv.recoveryTime || "3 - 5 ngày",
        date: fbFormData.date || new Date().toLocaleDateString("vi-VN"),
        images: uploadedImages.length > 0 ? uploadedImages : [beforeImg, afterImg]
      };
      onAddFeedback(newFb);
    }

    setIsModalOpen(false);
  };

  const ITEMS_PER_PAGE = 10;

  // Category → services list
  const categoryServices = selectedCategory === "ALL"
    ? services
    : services.filter((s) => (s.categoryKey || s.categoryName || "").toLowerCase().includes(selectedCategory));

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedServiceId("ALL");
    setCurrentPage(1);
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchCategory = selectedCategory === "ALL"
      || categoryServices.some((s) => s.id === fb.serviceId);
    const matchService = selectedServiceId === "ALL" || fb.serviceId === selectedServiceId;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term
      || fb.customerName.toLowerCase().includes(term)
      || fb.serviceName.toLowerCase().includes(term)
      || (fb.doctorName || "").toLowerCase().includes(term)
      || (fb.reviewText || "").toLowerCase().includes(term);
    return matchCategory && matchService && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredFeedbacks.length / ITEMS_PER_PAGE));
  const displayedFeedbacks = filteredFeedbacks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">

      {/* Service Filter Banner - Hiển thị khi được chuyển từ Bảng Dịch Vụ */}
      {selectedServiceId !== "ALL" && (() => {
        const activeSrv = services.find((s) => s.id === selectedServiceId);
        return activeSrv ? (
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-2xl shadow-md border border-indigo-500/40">
            <div className="flex items-center gap-2.5">
              <Images className="w-4 h-4 text-indigo-200 shrink-0" />
              <div>
                <span className="text-[10px] font-extrabold text-indigo-200 uppercase block leading-none">Đang xem ảnh trước sau của dịch vụ</span>
                <span className="text-sm font-black text-white leading-tight block">{activeSrv.name}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedServiceId("ALL");
                if (onClearServiceFilter) onClearServiceFilter();
              }}
              className="bg-white/20 hover:bg-white/30 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 border border-white/30"
            >
              <X className="w-3.5 h-3.5" /> Xem Tất Cả
            </button>
          </div>
        ) : null;
      })()}



      {/* Dual Dropdown & Search Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-amber-600" /> Bộ Lọc & Tìm Kiếm Feedback Thực Tế:
          </span>
          <div className="flex items-center gap-2">
            {isAdmin && onAddFeedback && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] font-black text-[11px] shadow-sm transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Feedback Ảnh Mới
              </button>
            )}
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              Hiển thị {filteredFeedbacks.length} Feedback
            </span>
          </div>
        </div>

        {/* Real-time Keyword Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên khách hàng, tên dịch vụ, bác sĩ phụ trách hoặc nhận xét..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-9 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs transition placeholder:font-medium placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-700 bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center font-bold"
              title="Xóa từ khóa"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Dropdown 1: Category Filter */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-slate-600">1. Chọn Chuyên Khoa Thẩm Mỹ:</label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3.5 pr-8 py-2.5 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-amber-500 appearance-none shadow-xs cursor-pointer hover:border-amber-400 transition"
              >
                <option value="ALL">✨ Tất cả chuyên khoa thẩm mỹ</option>
                <option value="phau-thuat">🔪 Phẫu Thuật Thẩm Mỹ</option>
                <option value="da-lieu">🧪 Trị Liệu Da Chuyên Sâu</option>
                <option value="tre-hoa">👑 Trẻ Hóa Nội Khoa</option>
                <option value="voc-dang">💃 Hút Mỡ & Vóc Dáng</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Dropdown 2: Specific Service Filter */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-slate-600">2. Chọn Dịch Vụ Cụ Thể:</label>
            <div className="relative">
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-amber-400 rounded-xl pl-3.5 pr-8 py-2.5 text-xs font-black text-amber-900 focus:outline-none focus:border-amber-600 appearance-none shadow-xs cursor-pointer"
              >
                <option value="ALL">✨ Tất cả dịch vụ thuộc chuyên khoa ({categoryServices.length} Dịch vụ)</option>
                {categoryServices.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} ({srv.categoryName})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-amber-600 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Vertical List of 10 Feedbacks (From Top to Bottom) */}
      <div className="space-y-6">
        {displayedFeedbacks.length > 0 ? (
          displayedFeedbacks.map((fb, idx) => (
            <FeedbackCardItem
              key={fb.id}
              feedback={fb}
              index={(currentPage - 1) * ITEMS_PER_PAGE + idx}
              onBookAppointment={onBookAppointment}
              onOpenEdit={handleOpenEdit}
              onDeleteFeedback={onDeleteFeedback}
              isAdmin={isAdmin}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs font-medium space-y-3 shadow-xs">
            <p>Chưa tìm thấy feedback hình ảnh trước sau phù hợp với bộ lọc.</p>
            {isAdmin && onAddFeedback && (
              <button
                onClick={handleOpenAdd}
                className="bg-amber-500 text-[#0B192C] px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
              >
                + Thêm Feedback Mới
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Bar (10 Feedbacks per page) */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
          <div className="text-slate-600 font-bold">
            Hiển thị <span className="text-amber-800 font-extrabold">{displayedFeedbacks.length}</span> trên tổng số <span className="text-amber-800 font-extrabold">{filteredFeedbacks.length}</span> Feedback
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl font-black text-xs transition ${
                    isCurrent
                      ? "bg-amber-500 text-[#0B192C] shadow-md scale-105"
                      : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL FORM THÊM / SỬA FEEDBACK ẢNH TRƯỚC SẠU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-500" />
                {editingFeedback ? "Chỉnh Sửa Feedback Ảnh Trước/Sau" : "Thêm Feedback Ảnh Mới"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs font-medium">
              {/* Searchable Service Selector */}
              <div className="relative">
                <label className="block text-slate-700 font-bold mb-1">Áp Dụng Cho Dịch Vụ Thẩm Mỹ:</label>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-amber-600 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm tên dịch vụ..."
                    value={serviceSearch}
                    onChange={(e) => {
                      setServiceSearch(e.target.value);
                      setShowServiceList(true);
                    }}
                    onFocus={() => setShowServiceList(true)}
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-300 hover:border-amber-400 focus:border-amber-500 rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition placeholder:font-medium placeholder:text-slate-400"
                  />
                  {serviceSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setServiceSearch("");
                        setShowServiceList(true);
                      }}
                      className="absolute right-2.5 top-2.5 w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 text-white flex items-center justify-center text-[9px] font-extrabold cursor-pointer"
                    >✕</button>
                  )}
                </div>

                {/* Dropdown Result List */}
                {showServiceList && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-amber-300 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                    {(() => {
                      const keyword = serviceSearch.toLowerCase();
                      const filtered = services.filter(
                        (s) =>
                          !keyword ||
                          s.name.toLowerCase().includes(keyword) ||
                          (s.categoryName || "").toLowerCase().includes(keyword)
                      );
                      if (!filtered.length) {
                        return (
                          <div className="px-4 py-3 text-[11px] text-slate-400 font-medium text-center">
                            Không tìm thấy dịch vụ phù hợp
                          </div>
                        );
                      }
                      return filtered.map((srv) => (
                        <button
                          key={srv.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFbFormData({
                              ...fbFormData,
                              serviceId: srv.id,
                              treatmentDetails: srv.beforeAfter?.treatmentDetails || srv.name,
                              recoveryDays: srv.recoveryTime || "3 - 5 ngày"
                            });
                            setServiceSearch(`${srv.name} (${srv.categoryName})`);
                            setShowServiceList(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between gap-2 hover:bg-amber-50 cursor-pointer ${
                            fbFormData.serviceId === srv.id
                              ? "bg-amber-100 text-amber-900 font-extrabold"
                              : "text-slate-800 font-semibold"
                          }`}
                        >
                          <span>{srv.name}</span>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                            {srv.categoryName}
                          </span>
                        </button>
                      ));
                    })()}
                  </div>
                )}

                {/* Overlay to close list on outside click */}
                {showServiceList && (
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowServiceList(false)}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tên Khách Hàng:</label>
                  <input
                    type="text"
                    required
                    value={fbFormData.customerName || ""}
                    onChange={(e) => setFbFormData({ ...fbFormData, customerName: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Thanh Vân..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tuổi & Địa Chỉ:</label>
                  <input
                    type="text"
                    value={fbFormData.customerAge || ""}
                    onChange={(e) => setFbFormData({ ...fbFormData, customerAge: e.target.value })}
                    placeholder="Ví dụ: Nữ 29 tuổi (Hà Nội)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bác Sĩ Phụ Trách:</label>
                  <input
                    type="text"
                    value={fbFormData.doctorName || ""}
                    onChange={(e) => setFbFormData({ ...fbFormData, doctorName: e.target.value })}
                    placeholder="Ví dụ: Bs. CKII Nguyễn Văn Hùng..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Đánh Giá (1 - 5 Sao):</label>
                  <select
                    value={fbFormData.rating || 5}
                    onChange={(e) => setFbFormData({ ...fbFormData, rating: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-amber-700 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ 5.0 Tuyệt Vời</option>
                    <option value={4}>⭐⭐⭐⭐ 4.0 Rất Tốt</option>
                    <option value={3}>⭐⭐⭐ 3.0 Khá Tốt</option>
                  </select>
                </div>
              </div>

              {/* Recovery Days (Trường Phục Hồi) & Treatment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                    <span>Thời Gian Phục Hồi (Trường Phục Hồi):</span>
                    <span className="text-[10px] text-amber-700 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Bắt buộc
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fbFormData.recoveryDays || ""}
                    onChange={(e) => setFbFormData({ ...fbFormData, recoveryDays: e.target.value })}
                    placeholder="Ví dụ: 3 - 5 ngày, 5 - 7 ngày, Không nghỉ dưỡng..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-medium">Gợi ý nhanh:</span>
                    {["3 - 5 ngày", "5 - 7 ngày", "7 - 10 ngày", "Không nghỉ dưỡng"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFbFormData({ ...fbFormData, recoveryDays: preset })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          fbFormData.recoveryDays === preset
                            ? "bg-amber-500 text-[#0B192C] border-amber-600 font-extrabold"
                            : "bg-slate-100 hover:bg-amber-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gói Phẫu Thuật / Kỹ Thuật:</label>
                  <input
                    type="text"
                    value={fbFormData.treatmentDetails || ""}
                    onChange={(e) => setFbFormData({ ...fbFormData, treatmentDetails: e.target.value })}
                    placeholder="Ví dụ: Nâng ngực Ergonomix 315cc, giấu sẹo 99%..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Unified Multi-Image Upload Section for Customer Before & After Photos (Max 5 Images) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold">
                    Upload Ảnh Trước Sau Khách Hàng (Upload Từ Máy - Tối Đa 5 Ảnh):
                  </label>
                  <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {uploadedImages.length} / 5 Ảnh đã chọn
                  </span>
                </div>

                {/* Thumbnails Grid Preview */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {uploadedImages.map((imgUrl, imgIdx) => (
                      <div key={imgIdx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-amber-400 group bg-slate-100 shadow-xs">
                        <img src={imgUrl} alt={`Customer image ${imgIdx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-[#0B192C]/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                          {imgIdx === 0 ? "Ảnh #1 (Trước)" : imgIdx === 1 ? "Ảnh #2 (Sau)" : `Ảnh #${imgIdx + 1}`}
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== imgIdx))}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-md transition cursor-pointer"
                          title="Xóa ảnh này"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Single / Multi Dropzone File Upload Input */}
                {uploadedImages.length < 5 && (
                  <label className="cursor-pointer bg-slate-50 hover:bg-amber-50/50 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-4 text-center transition flex flex-col items-center justify-center group">
                    <Upload className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition" />
                    <span className="text-xs font-extrabold text-slate-800">
                      Chọn file ảnh trước/sau từ máy (Chọn tối đa {5 - uploadedImages.length} ảnh nữa)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Hỗ trợ JPG, PNG, WEBP — Chọn cùng lúc hoặc từng ảnh</span>

                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []) as File[];
                        if (!files.length) return;
                        const remainingSlots = 5 - uploadedImages.length;
                        const filesToProcess = files.slice(0, remainingSlots);

                        const readPromises = filesToProcess.map((file) => {
                          return new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") resolve(reader.result);
                            };
                            reader.readAsDataURL(file);
                          });
                        });

                        Promise.all(readPromises).then((newImgs) => {
                          setUploadedImages((prev) => [...prev, ...newImgs].slice(0, 5));
                        });
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cảm Nhận Thực Tế Từ Khách Hàng (Testimonial):</label>
                <textarea
                  rows={2}
                  value={fbFormData.reviewText || ""}
                  onChange={(e) => setFbFormData({ ...fbFormData, reviewText: e.target.value })}
                  placeholder="Nhập nhận xét chi tiết của khách hàng sau khi phẫu thuật..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-[#0B192C] font-black rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingFeedback ? "Lưu Cập Nhật" : "Tạo Feedback Mới"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
