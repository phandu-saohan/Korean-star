import React, { useState } from "react";
import { VideoGuide } from "../types";
import { 
  GraduationCap, 
  Video, 
  Play, 
  ChevronRight, 
  ArrowRight, 
  Sparkles, 
  BookOpen,
  Plus,
  Edit,
  Trash2,
  X,
  Save
} from "lucide-react";

interface MedicalKnowledgeProps {
  videoGuides: VideoGuide[];
  onBookAppointment: (serviceName: string, notes: string) => void;
  onAddVideo?: (newVid: VideoGuide) => void;
  onUpdateVideo?: (updatedVid: VideoGuide) => void;
  onDeleteVideo?: (vidId: string) => void;
}

export const MedicalKnowledge: React.FC<MedicalKnowledgeProps> = ({
  videoGuides,
  onBookAppointment,
  onAddVideo,
  onUpdateVideo,
  onDeleteVideo
}) => {
  const [expandedArticle, setExpandedArticle] = useState<number | null>(0);

  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoGuide | null>(null);
  const [formData, setFormData] = useState<Partial<VideoGuide>>({
    title: "",
    category: "Phẫu Thuật Thẩm Mỹ",
    duration: "03:45",
    thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600",
    targetAudience: "Khách hàng muốn tìm hiểu phẫu thuật",
    scriptHighlights: ["Điểm nổi bật 1", "Điểm nổi bật 2"]
  });

  const handleOpenAdd = () => {
    setEditingVideo(null);
    setFormData({
      title: "Cẩm Nang Y Khoa Thẩm Mỹ Chuẩn Bệnh Viện",
      category: "Phẫu Thuật Thẩm Mỹ",
      duration: "04:15",
      thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600",
      targetAudience: "Tất cả khách hàng & CTV tư vấn",
      scriptHighlights: ["Đảm bảo an toàn vô trùng", "Kỹ thuật mổ không đau"]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vid: VideoGuide) => {
    setEditingVideo(vid);
    setFormData({ ...vid });
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    if (editingVideo && onUpdateVideo) {
      onUpdateVideo({
        ...editingVideo,
        ...formData,
        title: formData.title || editingVideo.title,
        category: formData.category || editingVideo.category,
        duration: formData.duration || editingVideo.duration,
        thumbnail: formData.thumbnail || editingVideo.thumbnail,
        targetAudience: formData.targetAudience || editingVideo.targetAudience,
        scriptHighlights: formData.scriptHighlights || editingVideo.scriptHighlights
      });
    } else if (onAddVideo) {
      onAddVideo({
        id: `vid-${Date.now()}`,
        title: formData.title,
        category: formData.category || "Kiến Thức Thẩm Mỹ",
        duration: formData.duration || "03:30",
        thumbnail: formData.thumbnail || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600",
        targetAudience: formData.targetAudience || "Khách hàng & CTV",
        scriptHighlights: formData.scriptHighlights || ["Chuẩn y khoa Bệnh viện"]
      });
    }

    setIsModalOpen(false);
  };

  // Medical Knowledge Articles Data
  const medicalArticles = [
    {
      id: 1,
      title: "Chuẩn Y Khoa Trong Phẫu Thuật Nâng Ngực Ergonomix 3D Nano Chip",
      author: "BS. CKI Nguyễn Văn Saohan",
      category: "Phẫu Thuật Vóc Dáng",
      readTime: "5 phút đọc",
      summary: "Ứng dụng túi ngực Motiva Ergonomix Nano Chip giúp túi chuyển động tự nhiên theo tư thế đứng/nằm, bảo tồn hoàn toàn tuyến sữa & cảm giác quầng vú.",
      content: [
        "Phòng mổ vô trùng áp lực dương dòng khí một chiều (Laminar Flow) ngăn ngừa 99.99% vi khuẩn.",
        "Kỹ thuật mổ nội soi vô cảm qua đường nách/chân ngực hạn chế xâm lấn, không chảy máu, không cần đặt ống dẫn lưu.",
        "Bảo hành túi ngực chính hãng Motiva trọn đời trên toàn cầu đính kèm chip điện tử bảo mật thông tin."
      ]
    },
    {
      id: 2,
      title: "Phác Đồ Soi Da AI & Liệu Trình Trị Nám Picotech Chuẩn FDA",
      author: "BS. Chuyên Khoa Da Liễu KOREAN STAR",
      category: "Trị Liệu Da Chuyên Sâu",
      readTime: "4 phút đọc",
      summary: "Công nghệ Picotech với xung giây cực ngắn (Picosecond) phá vỡ hắc sắc tố Melanin thành các hạt siêu nhỏ mà không gây bỏng rát hay tăng sắc tố sau laser.",
      content: [
        "Soi da đa tầng với AI phát hiện tổn thương sắc tố sâu dưới lớp trung bì & thượng bì.",
        "Kích thích tăng sinh Collagen và Elastin giúp da căng bóng, thu nhỏ lỗ chân lông đồng thời làm mờ nám sạm.",
        "Thời gian nghỉ dưỡng 0 ngày, khách hàng sinh hoạt bình thường ngay sau khi hoàn thành liệu trình."
      ]
    },
    {
      id: 3,
      title: "Quy Trình Căng Da Mặt Bằng Chỉ Collagen Vàng 24K An Toàn",
      author: "Hội Đồng Y Khoa Bệnh Viện KOREAN STAR",
      category: "Trẻ Hóa & Thẩm Mỹ Nội Khoa",
      readTime: "6 phút đọc",
      summary: "Giải pháp nâng cơ trẻ hóa không phẫu thuật dành cho khách hàng bị chùng nhão da vùng má, rãnh cười sâu và nọng cằm.",
      content: [
        "Sử dụng sợi chỉ Collagen Vàng 24K sinh học tự tiêu đạt chứng nhận CE Âu Châu.",
        "Tạo mạng lưới nâng đỡ cơ mặt tự nhiên, tăng sinh mao mạch nuôi dưỡng làn da hồng hào tràn đầy sức sống.",
        "Hiệu quả duy trì từ 3 - 5 năm mà không để lại vết sẹo phẫu thuật."
      ]
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Module Banner Header */}
      <div className="bg-[#0B192C] text-white p-4 sm:p-6 rounded-3xl shadow-xl border border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-[#0B192C] flex items-center justify-center font-bold shadow-md shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-black uppercase tracking-wide text-white">Kiến Thức Y Khoa Thẩm Mỹ & Video</h2>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-400/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                CHUẨN BỆNH VIỆN
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1">Cẩm nang y khoa chính thống & video hướng dẫn kịch bản tư vấn từ chuyên gia</p>
          </div>
        </div>
      </div>

      {/* Video Advisory Guides Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 text-slate-900 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-amber-700 font-extrabold text-xs tracking-wider uppercase block flex items-center gap-1.5">
              <Video className="w-4 h-4 text-amber-600" /> KHO VIDEO TƯ VẤN CHUYÊN SÂU
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              Kho Video Kịch Bản Tư Vấn & Giải Đáp Thắc Mắc Khách Hàng
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {videoGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-slate-50 border border-slate-200 hover:border-amber-400 rounded-2xl overflow-hidden transition group space-y-3 p-3.5 flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-200">
                  <img
                    src={guide.thumbnail}
                    alt={guide.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                    {guide.duration}
                  </span>
                </div>

                <div>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">
                    {guide.category}
                  </span>
                  <h4 className="font-extrabold text-xs text-slate-900 mt-2 leading-snug">{guide.title}</h4>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700">
                  <span className="text-amber-700 font-bold block mb-1">Chân dung khách tiềm năng:</span>
                  <p className="text-slate-600 text-[11px] font-medium leading-relaxed">{guide.targetAudience}</p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-200 text-[11px] space-y-1">
                <span className="text-slate-700 font-bold block">Key scripts cốt lõi:</span>
                <ul className="text-slate-600 text-[10px] space-y-1 list-disc list-inside font-medium">
                  {guide.scriptHighlights.slice(0, 2).map((h, i) => (
                    <li key={i} className="truncate">{h}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical Articles Accordion Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 text-slate-900 space-y-5 shadow-sm">
        <div className="border-b border-slate-100 pb-3.5">
          <span className="text-amber-700 font-extrabold text-xs tracking-wider uppercase block flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-600" /> CẨM NANG BÀI VIẾT Y KHOA CHUYÊN CHỦ
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            Kiến Thức Chuyên Môn Y Khoa Thẩm Mỹ Bệnh Viện KOREAN STAR
          </h3>
        </div>

        <div className="space-y-3.5">
          {medicalArticles.map((article, idx) => (
            <div
              key={article.id}
              className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition"
            >
              <button
                onClick={() => setExpandedArticle(expandedArticle === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-amber-50/50 transition focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    {article.id}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {article.category}
                      </span>
                      <span className="text-slate-400 text-[10px]">{article.readTime}</span>
                    </div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1">{article.title}</h4>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedArticle === idx ? "rotate-90 text-amber-600" : ""}`} />
              </button>

              {expandedArticle === idx && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-200/80 space-y-3 text-xs text-slate-700 bg-white">
                  <p className="font-medium text-slate-800 italic bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                    "{article.summary}"
                  </p>
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-900 block">Các điểm y khoa cốt lõi:</span>
                    <ul className="space-y-1 list-disc list-inside font-medium text-slate-600">
                      {article.content.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 text-[11px] text-slate-400 font-medium border-t border-slate-100 flex justify-between items-center">
                    <span>Tác giả: <strong className="text-slate-700">{article.author}</strong></span>
                    <button
                      onClick={() => onBookAppointment("Tư vấn y khoa chuyên sâu", `Đăng ký từ bài viết: ${article.title}`)}
                      className="text-amber-700 font-bold hover:underline flex items-center gap-1"
                    >
                      Đặt Lịch Tư Vấn Trực Tiếp Bác Sĩ <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
