import React, { useState } from "react";
import { SkinAnalysisResult } from "../types";
import { 
  Sparkles, 
  Camera, 
  Upload, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  FileText, 
  X,
  UserCheck
} from "lucide-react";

interface SkinAnalysisModalProps {
  onBookAppointment: (serviceName: string, notes: string) => void;
}

const SAMPLE_SKIN_PHOTOS = [
  {
    title: "Mẫu Da 1: Tàn Nhang & Thâm Sắc Tố",
    url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80",
    note: "Da hỗn hợp, có vết tàn nhang nhẹ vùng gò má"
  },
  {
    title: "Mẫu Da 2: Nếp Nhăn & Thiếu Độ Ẩm",
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
    note: "Da khô, sụp mí nhẹ, thiếu hụt collagen tầng sâu"
  },
  {
    title: "Mẫu Da 3: Lỗ Chân Lông & Mụn Đầu Đen",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    note: "Da dầu chữ T, bít tắc lỗ chân lông nhẹ"
  }
];

export const SkinAnalysisModal: React.FC<SkinAnalysisModalProps> = ({ onBookAppointment }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_SKIN_PHOTOS[0].url);
  const [skinNotes, setSkinNotes] = useState("");
  const [skinTypeInput, setSkinTypeInput] = useState("Hỗn hợp thiên dầu");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SkinAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File upload reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger Gemini AI Skin Analysis API
  const runAnalysis = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/skin-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedImage,
          skinNotes,
          skinTypeInput
        })
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setResult(data.analysis);
      } else {
        setErrorMsg(data.error || "Không thể phân tích dữ liệu da. Vui lòng thử lại.");
      }
    } catch (err: any) {
      setErrorMsg("Lỗi kết nối máy chủ phân tích da AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0B192C] border border-[#0B192C] rounded-2xl p-4 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4" /> AI SMART SKIN DERMATOLOGY ANALYZER
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-tight">
            Phân Tích Da AI Thông Minh & Đề Xuất Phác Đồ Chuyên Biệt
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Sử dụng Gemini AI để phân tích 6 chỉ số sức khỏe da: Lỗ chân lông, sắc tố, độ ẩm, nếp nhăn, độ đàn hồi & mụn.
          </p>
        </div>

        {result && (
          <button
            onClick={() =>
              onBookAppointment(
                "Điều Trị Da Theo Phác Đồ AI KOREAN STAR",
                `Phác đồ AI đề xuất cho loại da: ${result.skinType}. Điểm da: ${result.overallScore}/100.`
              )
            }
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-[#0B192C] font-bold px-4 py-2.5 sm:py-3 rounded-xl transition flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-amber-500/20 text-xs sm:text-sm"
          >
            <Calendar className="w-4 h-4" /> Đặt Lịch Theo Phác Đồ Này
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Input Column */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Camera className="w-4 h-4 text-amber-600" /> Tải Ảnh Hoặc Chọn Mẫu Da Phân Tích
            </h3>

            {/* Main Preview Image */}
            <div className="relative aspect-video bg-slate-100 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center group">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Skin analysis preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Chưa chọn ảnh da
                </div>
              )}

              {/* Upload Overlay Button */}
              <label className="absolute bottom-3 right-3 bg-[#0B192C]/90 border border-amber-500/30 text-amber-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-md">
                <Upload className="w-3.5 h-3.5" /> Tải Ảnh Mới
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Sample Photos Selector */}
            <div>
              <span className="text-xs text-slate-500 font-medium block mb-2">Hoặc chọn mẫu ảnh da sẵn có:</span>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_SKIN_PHOTOS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedImage(sample.url);
                      setSkinNotes(sample.note);
                    }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition relative ${
                      selectedImage === sample.url
                        ? "border-amber-500 ring-2 ring-amber-500/30"
                        : "border-slate-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={sample.url} alt={sample.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Inputs */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs text-slate-700 font-semibold mb-1">Loại da khách hàng tự nhận biết:</label>
                <select
                  value={skinTypeInput}
                  onChange={(e) => setSkinTypeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium"
                >
                  <option value="Hỗn hợp thiên dầu">Hỗn hợp thiên dầu</option>
                  <option value="Da khô thiếu nước">Da khô thiếu nước</option>
                  <option value="Da dầu mụn bít tắc">Da dầu mụn bít tắc</option>
                  <option value="Da nhạy cảm tàn nhang">Da nhạy cảm tàn nhang</option>
                  <option value="Da lão hóa nếp nhăn">Da lão hóa nếp nhăn</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-700 font-semibold mb-1">Ghi chú vấn đề da cần tư vấn thêm:</label>
                <textarea
                  rows={2}
                  value={skinNotes}
                  onChange={(e) => setSkinNotes(e.target.value)}
                  placeholder="Ví dụ: Da mụn ẩn vùng trán, tàn nhang quanh mắt, hay bị đỏ rát khi đi nắng..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium"
                />
              </div>

              <button
                onClick={runAnalysis}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white font-bold py-3 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" /> Gemini AI Đang Quét Vi Cấu Trúc Da...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" /> Bắt Đầu Phân Tích Da AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Column: AI Report Breakdown */}
        <div className="lg:col-span-7 space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-800 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              {errorMsg}
            </div>
          )}

          {!result && !loading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-sm">
              <Sparkles className="w-12 h-12 text-amber-500/60 mx-auto" />
              <h4 className="text-slate-900 font-bold text-base">Chưa có kết quả phân tích</h4>
              <p className="text-xs max-w-md mx-auto font-medium">
                Nhấn nút "Bắt Đầu Phân Tích Da AI" ở bảng bên trái để khởi chạy thuật toán quét da thông minh từ chuyên gia KOREAN STAR.
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-white border border-amber-300 rounded-2xl p-12 text-center text-slate-600 space-y-4 shadow-sm">
              <RotateCw className="w-10 h-10 text-amber-600 animate-spin mx-auto" style={{ animationDuration: "1.5s" }} />
              <div className="text-sm font-bold text-amber-800">Gemini AI Đang Tính Toán Chỉ Số Da...</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                Đang đo lường mật độ melanin, kích thước lỗ chân lông, mức độ lão hóa tầng nông & nếp nhăn vi điểm.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Score Header Card */}
              <div className="bg-[#0B192C] border border-[#0B192C] rounded-2xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#0B192C] flex flex-col items-center justify-center font-bold shadow-lg shadow-amber-500/20">
                    <span className="text-2xl font-black">{result.overallScore}</span>
                    <span className="text-[10px] tracking-widest uppercase">/100 Điểm</span>
                  </div>
                  <div>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                      Loại Da Chẩn Đoán
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{result.skinType}</h3>
                    <p className="text-xs text-slate-300 mt-1">{result.summary}</p>
                  </div>
                </div>
              </div>

              {/* 6 Metrics Grid Bar Chart */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 space-y-4 shadow-sm">
                <h4 className="font-bold text-xs text-amber-700 uppercase tracking-wider">
                  Chỉ Số Sức Khỏe Da Vi Điểm (6 Tầng)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Độ mịn lỗ chân lông", score: result.scores.pore },
                    { label: "Đồng đều màu da", score: result.scores.pigmentation },
                    { label: "Cấp ẩm tầng sâu", score: result.scores.moisture },
                    { label: "Độ trẻ hóa (Nếp nhăn)", score: result.scores.wrinkle },
                    { label: "Săn chắc Elastin", score: result.scores.elasticity },
                    { label: "Mức độ sạch mụn", score: result.scores.acne }
                  ].map((m, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600 text-[11px]">{m.label}</span>
                        <span className="font-bold text-amber-700">{m.score}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${m.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Concerns & Treatment Regimen */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 space-y-4 shadow-sm">
                <h4 className="font-bold text-xs text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Phác Đồ Trị Liệu Đề Xuất Tại KOREAN STAR
                </h4>

                {/* Key Concerns */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-600 font-semibold block mb-1">Vấn đề cốt lõi cần giải quyết:</span>
                  <div className="flex flex-wrap gap-2">
                    {result.keyConcerns.map((concern, i) => (
                      <span key={i} className="bg-rose-100 border border-rose-200 text-rose-800 font-semibold px-2.5 py-1 rounded-lg">
                        • {concern}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Step Treatment Table */}
                <div className="space-y-3">
                  {result.treatmentPlan.map((step) => (
                    <div
                      key={step.step}
                      className="bg-slate-50 border border-slate-200 hover:border-amber-300 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-3 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#0B192C] text-amber-400 font-bold text-xs flex items-center justify-center">
                            {step.step}
                          </span>
                          <h5 className="font-bold text-slate-900 text-xs">{step.name}</h5>
                        </div>
                        <p className="text-slate-600 text-[11px] font-medium">{step.purpose}</p>
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block font-semibold">
                          Tần suất: {step.frequency}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500 block font-medium">Chi phí dự kiến:</span>
                        <span className="text-sm font-bold text-amber-700 font-mono">{step.estimatedCost}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Homecare Routine */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Routine Chăm Sóc Tại Nhà (Homecare Daily):
                  </span>
                  <ul className="list-disc list-inside text-slate-700 text-[11px] space-y-1 font-medium">
                    {result.homecareRoutine.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
