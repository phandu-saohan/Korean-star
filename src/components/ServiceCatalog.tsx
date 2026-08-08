import React, { useState } from "react";
import { ServiceItem } from "../types";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/formatters";
import { notifyServiceCatalogUpdated } from "../lib/onesignal";
import { 
  Search, 
  Check, 
  Percent, 
  Share2,
  Stethoscope,
  BookOpen,
  Filter,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Upload,
  ChevronLeft,
  ChevronRight,
  Images,
  Tag
} from "lucide-react";

interface ServiceCatalogProps {
  services: ServiceItem[];
  onBookAppointment: (serviceName: string, notes: string) => void;
  onGenerateServiceLink: (serviceName: string) => void;
  onViewBeforeAfter?: (serviceId: string, serviceName: string) => void;
  onAddService?: (newService: ServiceItem) => void;
  onUpdateService?: (updatedService: ServiceItem) => void;
  onDeleteService?: (serviceId: string) => void;
  isAdmin?: boolean;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  services,
  onBookAppointment,
  onGenerateServiceLink,
  onViewBeforeAfter,
  onAddService,
  onUpdateService,
  onDeleteService,
  isAdmin = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ServiceItem>>({
    name: "",
    category: "phau-thuat",
    categoryName: "Phẫu Thuật Thẩm Mỹ",
    price: 35000000,
    originalPrice: 45000000,
    commissionRate: 15,
    duration: "90 phút",
    recoveryTime: "7 - 10 ngày",
    description: "",
    image: "https://images.unsplash.com/photo-1512290900673-0edbb35a7206?auto=format&fit=crop&q=80&w=600",
    features: ["Bảo hành chính hãng 10 năm", "Phòng mổ Áp lực dương Vô trùng"],
    scriptHighlights: ["Bảo hành chính hãng 10 năm", "Phòng mổ Áp lực dương Vô trùng"]
  });

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: "",
      category: "phau-thuat",
      categoryName: "Phẫu Thuật Thẩm Mỹ",
      price: 35000000,
      originalPrice: 45000000,
      commissionRate: 15,
      duration: "90 phút",
      recoveryTime: "7 - 10 ngày",
      description: "Liệu trình thẩm mỹ cao cấp chuẩn y khoa",
      image: "https://images.unsplash.com/photo-1512290900673-0edbb35a7206?auto=format&fit=crop&q=80&w=600",
      features: ["Bảo hành chính hãng 10 năm", "Bác sĩ Chuyên khoa trực tiếp làm"],
      scriptHighlights: ["Bảo hành chính hãng 10 năm", "Bác sĩ Chuyên khoa trực tiếp làm"]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv: ServiceItem) => {
    setEditingService(srv);
    setFormData({ ...srv });
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    const price = Number(formData.price) || 0;
    const originalPrice = Number(formData.originalPrice) || price * 1.3;
    const commissionRate = Number(formData.commissionRate) || 15;
    const commissionAmount = Math.round((price * commissionRate) / 100);

    let categoryName = "Phẫu Thuật Thẩm Mỹ";
    if (formData.category === "da-lieu") categoryName = "Trị Liệu Da Chuyên Sâu";
    else if (formData.category === "tre-hoa") categoryName = "Trẻ Hóa Nội Khoa";
    else if (formData.category === "voc-dang") categoryName = "Hút Mỡ & Vóc Dáng";

    if (editingService && onUpdateService) {
      const updated: ServiceItem = {
        ...editingService,
        ...formData,
        name: formData.name || editingService.name,
        price,
        originalPrice,
        commissionRate,
        commissionAmount,
        categoryName,
        category: (formData.category as any) || editingService.category,
        description: formData.description || "",
        image: formData.image || editingService.image,
        features: formData.features || editingService.features,
        scriptHighlights: formData.features || editingService.features || []
      };
      onUpdateService(updated);
      notifyServiceCatalogUpdated(updated.name, "update");
    } else if (onAddService) {
      const newSrv: ServiceItem = {
        id: `srv-${Date.now()}`,
        name: formData.name,
        category: (formData.category as any) || "phau-thuat",
        categoryName,
        price,
        originalPrice,
        commissionRate,
        commissionAmount,
        duration: formData.duration || "90 phút",
        recoveryTime: formData.recoveryTime || "7 ngày",
        description: formData.description || "",
        image: formData.image || "https://images.unsplash.com/photo-1512290900673-0edbb35a7206?auto=format&fit=crop&q=80&w=600",
        beforeAfter: {
          before: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
          after: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
          customerAge: "Khách hàng 28 tuổi",
          treatmentDetails: "Kết quả phẫu thuật đẹp tự nhiên chuẩn y khoa"
        },
        features: formData.features || ["Bảo hành chính hãng"],
        isPopular: true
      };
      onAddService(newSrv);
      notifyServiceCatalogUpdated(newSrv.name, "add");
    }

    setIsModalOpen(false);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filtered services
  const filteredServices = services.filter((srv) => {
    const matchesCat = selectedCategory === "ALL" || srv.category === selectedCategory;
    const matchesSearch =
      srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE) || 1;
  const paginatedServices = filteredServices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      
      {/* Main Catalog Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 text-slate-900 space-y-6 shadow-sm">
        
        {/* Header Search & Dropdown Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-amber-700 font-extrabold text-xs tracking-wider uppercase block">
              DANH MỤC THẨM MỸ CAO CẤP
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              Bảng Giá Niêm Yết & Mức Hoa Hồng CTV
            </h3>
          </div>

          {/* Search & Dropdown Filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            {isAdmin && onAddService && (
              <button
                onClick={handleOpenAdd}
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-[#0B192C] text-xs font-black px-4 py-2 rounded-xl transition shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Dịch Vụ Mới</span>
              </button>
            )}
            
            {/* Category Dropdown Filter */}
            <div className="relative w-full sm:w-52">
              <Filter className="w-3.5 h-3.5 text-amber-600 absolute left-3 top-3 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-8 pr-8 py-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-amber-500 appearance-none shadow-xs cursor-pointer hover:bg-slate-100 transition"
              >
                <option value="ALL">✨ Tất cả chuyên khoa ({services.length})</option>
                <option value="phau-thuat">🔪 Phẫu Thuật Thẩm Mỹ</option>
                <option value="da-lieu">🧪 Trị Liệu Da Chuyên Sâu</option>
                <option value="tre-hoa">👑 Trẻ Hóa Nội Khoa</option>
                <option value="voc-dang">💃 Hút Mỡ & Vóc Dáng</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm tên dịch vụ thẩm mỹ..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium shadow-xs"
              />
            </div>

          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Empty State */}
          {services.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                <Tag className="w-10 h-10 text-amber-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-slate-800 text-lg">
                  {isAdmin ? "Chưa có dịch vụ nào được tạo" : "Bảng giá đang được cập nhật"}
                </h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  {isAdmin
                    ? "Nhấn nút \"+ Thêm Dịch Vụ\" ở trên để tạo dịch vụ niêm yết đầu tiên. Dữ liệu sẽ được lưu lên Supabase và hiển thị ngay cho tất cả CTV."
                    : "Ban quản trị đang cập nhật bảng giá dịch vụ. Vui lòng quay lại sau hoặc liên hệ Admin để được hỗ trợ."
                  }
                </p>
              </div>
              {isAdmin && onAddService && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold px-6 py-3 rounded-xl hover:from-amber-600 hover:to-orange-600 transition shadow flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tạo Dịch Vụ Đầu Tiên
                </button>
              )}
            </div>
          )}

          {/* Filter empty (có services nhưng search không khớp) */}
          {services.length > 0 && paginatedServices.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Search className="w-7 h-7 text-slate-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-700">Không tìm thấy dịch vụ</h3>
                <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc danh mục</p>
              </div>
            </div>
          )}

          {paginatedServices.map((service) => (
            <div
              key={service.id}
              className="bg-slate-50 border border-slate-200/90 hover:border-amber-400 rounded-2xl overflow-hidden transition flex flex-col justify-between group shadow-xs hover:shadow-md relative"
            >
              <div>
                {/* Image */}
                <div className="relative aspect-video overflow-hidden bg-slate-200">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-300 shadow-sm">
                    {service.categoryName}
                  </div>
                  
                  {/* Edit / Delete CRUD Action Overlay Buttons - Restricted to Admin & Editor */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      <button
                        onClick={() => handleOpenEdit(service)}
                        className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm border border-slate-200 hover:text-amber-700 transition"
                        title="Chỉnh sửa dịch vụ"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteService && (
                        <button
                          onClick={() => onDeleteService(service.id)}
                          className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition"
                          title="Xóa dịch vụ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 group-hover:text-amber-700 transition leading-snug whitespace-normal break-words">
                      {service.name}
                    </h3>
                    <p className="text-slate-600 text-xs mt-1 line-clamp-2 leading-relaxed font-medium">
                      {service.description}
                    </p>
                  </div>

                  {/* Pricing & CTV Commission Highlight */}
                  <div className="bg-white border border-amber-200 p-3 rounded-xl space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-500 font-medium">Giá ưu đãi khách:</span>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] line-through block">
                          {service.originalPrice.toLocaleString("vi-VN")} VNĐ
                        </span>
                        <span className="text-amber-700 font-black text-sm font-mono">
                          {service.price.toLocaleString("vi-VN")} VNĐ
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" /> Hoa hồng CTV ({service.commissionRate}%):
                      </span>
                      <span className="text-emerald-700 font-black font-mono">
                        +{service.commissionAmount.toLocaleString("vi-VN")} VNĐ
                      </span>
                    </div>
                  </div>

                  {/* Highlights list */}
                  <ul className="text-[11px] text-slate-600 space-y-1 font-medium">
                    {service.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Footer */}
              {isAdmin ? (
                <div className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(service)}
                    className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-amber-300 shadow-xs"
                  >
                    <Edit className="w-4 h-4 text-amber-800" /> Sửa
                  </button>
                  {onDeleteService && (
                    <button
                      onClick={() => onDeleteService(service.id)}
                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-rose-200 shadow-xs"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" /> Xóa
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
                  {/* Xem Ảnh Trước Sau + Đặt Lịch */}
                  {onViewBeforeAfter && (
                    <button
                      onClick={() => onViewBeforeAfter(service.id, service.name)}
                      className="flex-1 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-indigo-200 shadow-xs"
                    >
                      <Images className="w-3.5 h-3.5 text-purple-600" />
                      Xem Ảnh Trước Sau
                    </button>
                  )}
                  <button
                    onClick={() => onBookAppointment(service.name, `Đăng ký tư vấn trực tiếp từ bảng giá`)}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition shadow-md shrink-0"
                  >
                    Đặt Lịch
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="text-slate-500 font-medium">
              Hiển thị <span className="font-bold text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredServices.length)}</span> trên tổng số <span className="font-bold text-slate-900">{filteredServices.length}</span> dịch vụ
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-xl font-bold transition text-xs ${
                    currentPage === pg
                      ? "bg-amber-500 text-[#0B192C] font-black shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CRUD Modal for Add / Edit Service */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-slate-900 max-w-lg w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base uppercase text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-amber-600" />
                {editingService ? "Chỉnh Sửa Dịch Vụ Thẩm Mỹ" : "Thêm Dịch Vụ Thẩm Mỹ Mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tên Dịch Vụ Thẩm Mỹ:</label>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Nâng Ngực Ergonomix 3D..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Chuyên Khoa:</label>
                  <select
                    value={formData.category || "phau-thuat"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="phau-thuat">Phẫu Thuật Thẩm Mỹ</option>
                    <option value="da-lieu">Trị Liệu Da Chuyên Sâu</option>
                    <option value="tre-hoa">Trẻ Hóa Nội Khoa</option>
                    <option value="voc-dang">Hút Mỡ & Vóc Dáng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">% Hoa Hồng CTV:</label>
                  <input
                    type="number"
                    required
                    value={formData.commissionRate || 15}
                    onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Giá Ưu Đãi (VNĐ):</label>
                  <input
                    type="text"
                    required
                    value={formatCurrencyInput(formData.price || 0)}
                    onChange={(e) => setFormData({ ...formData, price: parseCurrencyInput(e.target.value) })}
                    placeholder="65.000.000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-700 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Giá Gốc Niêm Yết (VNĐ):</label>
                  <input
                    type="text"
                    value={formatCurrencyInput(formData.originalPrice || 0)}
                    onChange={(e) => setFormData({ ...formData, originalPrice: parseCurrencyInput(e.target.value) })}
                    placeholder="85.000.000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Mô Tả Dịch Vụ:</label>
                <textarea
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tải Ảnh Minh Họa Dịch Vụ (Upload Từ Máy):</label>
                <div className="flex items-center gap-3">
                  {formData.image && (
                    <img src={formData.image} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs" />
                  )}
                  <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-3 text-center transition flex flex-col items-center justify-center">
                    <Upload className="w-5 h-5 text-amber-600 mb-1" />
                    <span className="text-xs font-bold text-slate-800">Chọn file ảnh từ thiết bị</span>
                    <span className="text-[10px] text-slate-500 font-medium">JPG, PNG, WEBP, GIF</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === "string") {
                            setFormData({ ...formData, image: reader.result });
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* ===== ĐIỂM NỔI BẬT (scriptHighlights / features) ===== */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold">Điểm Nổi Bật Dịch Vụ (✓ Bullet):</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        features: [...(formData.features || []), ""]
                      })
                    }
                    className="flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm dòng
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(formData.features || []).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => {
                          const updated = [...(formData.features || [])];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, features: updated });
                        }}
                        placeholder={`Điểm nổi bật ${idx + 1}...`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (formData.features || []).filter((_, i) => i !== idx);
                          setFormData({ ...formData, features: updated });
                        }}
                        className="w-6 h-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 flex items-center justify-center transition cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(!formData.features || formData.features.length === 0) && (
                    <p className="text-[11px] text-slate-400 italic text-center py-2">Chưa có điểm nổi bật nào. Nhấn "+ Thêm dòng" để thêm.</p>
                  )}
                </div>
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
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl transition shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Lưu Dịch Vụ
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
