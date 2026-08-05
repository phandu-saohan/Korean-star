import React, { useState } from "react";
import { PostOpCheckin } from "../types";
import { 
  HeartPulse, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Camera, 
  Thermometer, 
  Activity, 
  Clock,
  ChevronRight,
  FileCheck
} from "lucide-react";

const CARE_TIMELINE = [
  {
    day: "Ngày 1 - 2",
    title: "Vệ Sinh & Giảm Đau Cấp Tính",
    tasks: [
      "Vệ sinh nếp khâu bằng gạc vô trùng & dung dịch Betadine y tế 2 lần/ngày",
      "Uống đúng liều lượng kháng sinh & giảm đau theo đơn chỉ định Bác sĩ Saohan",
      "Đeo áo định hình Vòng 1 / Băng nẹp định hình mũi 24/24",
      "Nghỉ ngơi hoàn toàn, kê cao đầu khi nằm ngủ (góc 30 độ)"
    ],
    status: "Hoàn thành"
  },
  {
    day: "Ngày 3 - 5",
    title: "Giảm Sưng Tăng Cường & Vận Động Nhẹ",
    tasks: [
      "Chườm ấm xung quanh vùng phẫu thuật (tránh chườm trực tiếp lên nếp khâu)",
      "Đi lại nhẹ nhàng trong nhà giúp lưu thông khí huyết",
      "Kiêng thực phẩm gây lồi sẹo (rau muống, đồ nếp, hải sản, thịt gà)"
    ],
    status: "Hiện tại"
  },
  {
    day: "Ngày 7",
    title: "Cắt Chỉ Phẫu Thuật & Tái Khám Trực Tiếp",
    tasks: [
      "Đến phòng khám KOREAN STAR cắt chỉ vi phẫu không đau",
      "Bác sĩ Trưởng Khoa trực tiếp khám lâm sàng & chiếu tia Plasma bù độ ẩm",
      "Đánh giá nếp gấp & độ cân đối"
    ],
    status: "Sắp tới"
  },
  {
    day: "Ngày 14 - 30",
    title: "Dưỡng Sẹo Phục Hồi & Định Hình Form Phẫu Thuật",
    tasks: [
      "Bắt đầu thoa gel mờ sẹo silicone cao cấp Dermatix 2 lần/ngày",
      "Massage ngực nhẹ nhàng theo hướng dẫn video (dành cho nâng ngực)",
      "Khám định kỳ 1 tháng kiểm tra form dáng hoàn thiện 95%"
    ],
    status: "Sắp tới"
  }
];

export const PostOpCare: React.FC = () => {
  const [checkins, setCheckins] = useState<PostOpCheckin[]>([
    {
      id: "chk-1",
      date: "2026-07-30",
      dayPostOp: 3,
      serviceName: "Nâng Ngực Nội Soi Ergonomix Nano 6D",
      painLevel: 2,
      swellingLevel: "Nhẹ",
      temperature: 36.6,
      symptoms: ["Bình thường", "Sưng nhẹ nếp gấp"],
      aiHealthStatus: "An toàn",
      doctorNotes: "Tiến triển phục hồi rất tốt, tiếp tục chườm ấm & giữ vệ sinh."
    }
  ]);

  // Form State
  const [painLevel, setPainLevel] = useState(3);
  const [swellingLevel, setSwellingLevel] = useState<"Nhẹ" | "Vừa" | "Sưng nhiều">("Nhẹ");
  const [temperature, setTemperature] = useState(36.8);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(["Bình thường"]);
  const [checkinPhoto, setCheckinPhoto] = useState<string | null>(null);

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCheckinPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submitCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Evaluate risk level automatically
    let status: PostOpCheckin["aiHealthStatus"] = "An toàn";
    if (temperature >= 38.0 || selectedSymptoms.includes("Chảy dịch vết thương") || painLevel >= 8) {
      status = "Cảnh báo bác sĩ";
    } else if (temperature >= 37.5 || swellingLevel === "Sưng nhiều" || painLevel >= 6) {
      status = "Cần theo dõi";
    }

    const newCheckin: PostOpCheckin = {
      id: `chk-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      dayPostOp: 4,
      serviceName: "Nâng Ngực Nội Soi Ergonomix Nano 6D",
      painLevel,
      swellingLevel,
      temperature,
      photoUrl: checkinPhoto || undefined,
      symptoms: selectedSymptoms,
      aiHealthStatus: status,
      doctorNotes: status === "Cảnh báo bác sĩ" ? "⚠️ Bác sĩ Saohan đã nhận cảnh báo khẩn cấp và sẽ gọi lại trong 5 phút." : "Trạng thái ổn định."
    };

    setCheckins([newCheckin, ...checkins]);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#0B192C] border border-amber-500/30 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
            <HeartPulse className="w-4 h-4" /> HẬU PHẪU CHĂM SÓC TỰ ĐỘNG & KIỂM TRA SỨC KHỎE
          </div>
          <h2 className="text-xl font-bold font-serif text-white">
            Nhật Ký Tự Động Phục Hồi Hậu Phẫu KOREAN STAR Care
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Lộ trình chăm sóc tùy chỉnh theo ngày • Cảnh báo sức khỏe thông minh trực tiếp tới Bác sĩ phụ trách.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Timeline Schedule */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" /> Lộ Trình Hướng Dẫn Hậu Phẫu Theo Ngày
          </h3>

          <div className="space-y-4">
            {CARE_TIMELINE.map((step, idx) => (
              <div
                key={idx}
                className={`bg-[#0B192C] border rounded-2xl p-5 space-y-3 transition ${
                  step.status === "Hiện tại"
                    ? "border-amber-500/50 bg-[#0B192C] shadow-lg shadow-amber-500/10"
                    : "border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold text-xs font-mono">{step.day}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      step.status === "Hoàn thành"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : step.status === "Hiện tại"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-[#13253E] text-slate-300"
                    }`}
                  >
                    {step.status}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-white">{step.title}</h4>

                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {step.tasks.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Daily Health Check-in Form & Log */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Check-in Form */}
          <div className="bg-[#0B192C] border border-amber-500/30 rounded-2xl p-5 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Báo Cáo Sức Khỏe Hàng Ngày (Check-in)
              </h3>
              <span className="text-xs text-slate-400">Ngày 4 Hậu Phẫu</span>
            </div>

            <form onSubmit={submitCheckin} className="space-y-4 text-xs">
              
              {/* Pain slider */}
              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span className="text-slate-300">Mức độ đau rát (1 - 10):</span>
                  <span className="text-amber-400 font-bold font-mono">{painLevel} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="w-full h-2 bg-[#13253E] rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Temperature & Swelling */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nhiệt độ cơ thể (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full bg-[#13253E] border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mức độ sưng:</label>
                  <select
                    value={swellingLevel}
                    onChange={(e) => setSwellingLevel(e.target.value as any)}
                    className="w-full bg-[#13253E] border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="Nhẹ">Sưng nhẹ bình thường</option>
                    <option value="Vừa">Sưng vừa</option>
                    <option value="Sưng nhiều">Sưng nhiều nếp gấp</option>
                  </select>
                </div>
              </div>

              {/* Symptom checkboxes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Triệu chứng ghi nhận:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Bình thường",
                    "Nóng rát nhẹ",
                    "Chảy dịch vết thương",
                    "Dị ứng thuốc",
                    "Bầm tím nhẹ"
                  ].map((sym) => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => toggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] transition ${
                        selectedSymptoms.includes(sym)
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                          : "bg-[#13253E] border-slate-700 text-slate-300 hover:bg-[#1a3152]"
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tải ảnh vết thương (để Bác sĩ kiểm tra):</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full bg-[#13253E] border border-slate-700 rounded-xl p-2 text-slate-400 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg text-xs flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Gửi Báo Cáo Sức Khỏe Cho Bác Sĩ
              </button>
            </form>
          </div>

          {/* Past Check-ins History Log */}
          <div className="bg-[#0B192C] border border-slate-800 rounded-2xl p-5 text-white space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center justify-between border-b border-slate-800 pb-3">
              <span>Lịch Sử Kiểm Tra Trạng Thái Sức Khỏe</span>
              <span className="text-xs text-slate-400">{checkins.length} bản ghi</span>
            </h3>

            <div className="space-y-3">
              {checkins.map((chk) => (
                <div key={chk.id} className="bg-[#07111F] border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-400">Ngày {chk.dayPostOp} Hậu Phẫu ({chk.date})</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        chk.aiHealthStatus === "An toàn"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : chk.aiHealthStatus === "Cần theo dõi"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      }`}
                    >
                      {chk.aiHealthStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-slate-300 text-[11px] bg-slate-900 p-2 rounded-lg">
                    <div>Nhiệt độ: <span className="font-mono text-white">{chk.temperature}°C</span></div>
                    <div>Mức đau: <span className="font-mono text-white">{chk.painLevel}/10</span></div>
                    <div>Sưng: <span className="text-white">{chk.swellingLevel}</span></div>
                  </div>

                  {chk.doctorNotes && (
                    <div className="text-[11px] text-slate-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      <span className="text-amber-400 font-semibold block">Phản hồi Bác Sĩ Saohan:</span>
                      {chk.doctorNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
