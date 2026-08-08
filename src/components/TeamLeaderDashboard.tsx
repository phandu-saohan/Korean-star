import React, { useState } from "react";
import {
  Users,
  Star,
  TrendingUp,
  Coins,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Award,
  Target,
  ArrowRight,
  Search,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Crown,
  Pencil
} from "lucide-react";
import { saveTransferRequestToSupabase, updateTeamLeaderInSupabase } from "../lib/supabase";
import { CTVUser, ReferralLead, TeamRevenueTransfer } from "../types";

interface TeamLeaderDashboardProps {
  ctvUser: CTVUser;
  leads: ReferralLead[];
  allRegisteredUsers?: any[]; // All users from localStorage
  onTransferAccept?: (transfer: TeamRevenueTransfer) => void;
  onTransferReject?: (transfer: TeamRevenueTransfer) => void;
}

// Lấy danh sách CTV đã đăng ký từ localStorage
function getRegisteredCTVs(leaderCode: string): any[] {
  try {
    const raw = localStorage.getItem("saohan_registered_users");
    if (!raw) return [];
    const all = JSON.parse(raw) as any[];
    return all.filter(
      (u) =>
        u.role === "ctv" &&
        u.teamLeaderId === leaderCode &&
        u.ctvCode !== leaderCode
    );
  } catch {
    return [];
  }
}

// Lấy danh sách yêu cầu chuyển doanh số từ localStorage
function getTransferRequests(leaderCode: string): TeamRevenueTransfer[] {
  try {
    const raw = localStorage.getItem("saohan_team_transfers");
    if (!raw) return [];
    const all = JSON.parse(raw) as TeamRevenueTransfer[];
    return all.filter((t) => t.toLeaderCode === leaderCode);
  } catch {
    return [];
  }
}

function saveTransferRequests(transfers: TeamRevenueTransfer[]) {
  localStorage.setItem("saohan_team_transfers", JSON.stringify(transfers));
}

export const TeamLeaderDashboard: React.FC<TeamLeaderDashboardProps> = ({
  ctvUser,
  leads,
  onTransferAccept,
  onTransferReject
}) => {
  const leaderCode = ctvUser.code;
  const teamMembers = getRegisteredCTVs(leaderCode);
  const [transfers, setTransfers] = useState<TeamRevenueTransfer[]>(() =>
    getTransferRequests(leaderCode)
  );

  // Modal thêm thành viên nhóm
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [memberCodeInput, setMemberCodeInput] = useState("");
  const [memberError, setMemberError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "transfers">("overview");

  // Tab tổng quan nhóm
  const totalTeamRevenue = teamMembers.reduce((s, m) => s + (m.totalRevenue || 0), 0);
  const totalTeamCommission = teamMembers.reduce((s, m) => s + (m.totalCommission || 0), 0);
  const totalTeamLeads = leads.filter((l) =>
    teamMembers.some((m) => m.ctvCode === l.ctvCode)
  ).length;
  const pendingTransfers = transfers.filter((t) => t.status === "pending");

  // Xử lý thêm thành viên nhóm theo mã CTV
  const handleAddMember = () => {
    setMemberError("");
    const code = memberCodeInput.trim().toUpperCase();
    if (!code) { setMemberError("Vui lòng nhập Mã CTV"); return; }

    try {
      const raw = localStorage.getItem("saohan_registered_users");
      const all: any[] = raw ? JSON.parse(raw) : [];
      const target = all.find((u) => u.ctvCode === code || u.ctvCode?.toUpperCase() === code);
      if (!target) { setMemberError(`Không tìm thấy CTV có mã "${code}"`); return; }
      if (target.teamLeaderId && target.teamLeaderId !== leaderCode) {
        setMemberError(`CTV "${code}" đã thuộc nhóm khác rồi`); return;
      }
      if (target.ctvCode === leaderCode) { setMemberError("Không thể thêm chính mình vào nhóm"); return; }

      // Gán teamLeaderId cho CTV thành viên
      target.teamLeaderId = leaderCode;
      target.teamName = ctvUser.teamName || `Nhóm ${ctvUser.name}`;
      const updatedAll = all.map((u) => (u.ctvCode === target.ctvCode ? target : u));
      localStorage.setItem("saohan_registered_users", JSON.stringify(updatedAll));

      setMemberCodeInput("");
      setAddMemberModal(false);
      window.location.reload(); // Reload để cập nhật danh sách thành viên
    } catch {
      setMemberError("Đã xảy ra lỗi. Vui lòng thử lại.");
    }
  };

  // Xử lý chấp nhận chuyển doanh số
  const handleAccept = (transfer: TeamRevenueTransfer) => {
    const updated = transfers.map((t) =>
      t.id === transfer.id ? { ...t, status: "accepted" as const } : t
    );
    setTransfers(updated);
    saveTransferRequests(updated);
    onTransferAccept?.(transfer);
  };

  // Xử lý từ chối chuyển doanh số
  const handleReject = (transfer: TeamRevenueTransfer) => {
    const updated = transfers.map((t) =>
      t.id === transfer.id ? { ...t, status: "rejected" as const } : t
    );
    setTransfers(updated);
    saveTransferRequests(updated);
    onTransferReject?.(transfer);
  };

  const tierColor = {
    "Bạc": "text-slate-400",
    "Vàng": "text-amber-400",
    "Bạch Kim": "text-blue-300",
    "Kim Cương": "text-purple-400"
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-5 font-sans">
      {/* Header Banner Trưởng nhóm */}
      <div className="bg-gradient-to-r from-[#0B192C] via-blue-950 to-[#0B192C] rounded-3xl p-5 text-white border border-blue-900 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl border-2 border-amber-400 overflow-hidden bg-slate-700 flex items-center justify-center shadow-lg">
              {ctvUser.avatar ? (
                <img src={ctvUser.avatar} alt={ctvUser.name} className="w-full h-full object-cover" />
              ) : (
                <Crown className="w-8 h-8 text-amber-400" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-[#0B192C] text-[9px] font-black px-1.5 py-0.5 rounded-full">
              TL
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-lg text-white">{ctvUser.name}</h1>
              <span className="text-[10px] font-black text-amber-400 bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 rounded-full">
                TRƯỞNG NHÓM CTV
              </span>
              <span className={`text-[11px] font-extrabold ${tierColor[ctvUser.tier] || "text-amber-400"}`}>
                ⭐ {ctvUser.tier}
              </span>
            </div>
            <p className="font-mono text-xs text-blue-300 font-bold">{ctvUser.code}</p>
            <p className="text-[11px] text-slate-300 font-medium">
              Quản lý nhóm: <strong className="text-amber-400">{ctvUser.teamName || `Nhóm ${ctvUser.name}`}</strong>
              {" · "}
              <strong className="text-white">{teamMembers.length} thành viên</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 text-right w-full sm:w-auto">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Ví khả dụng</div>
              <div className="font-mono font-black text-amber-400 text-sm">
                {ctvUser.availableBalance.toLocaleString("vi-VN")} đ
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Hoa hồng nhóm</div>
              <div className="font-mono font-black text-emerald-400 text-sm">
                {totalTeamCommission.toLocaleString("vi-VN")} đ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs điều hướng */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1 flex gap-1 shadow-sm">
        {([
          { key: "overview", label: "Tổng quan nhóm", icon: TrendingUp },
          { key: "members", label: `Thành viên (${teamMembers.length})`, icon: Users },
          { key: "transfers", label: `Chuyển doanh số${pendingTransfers.length > 0 ? ` (${pendingTransfers.length})` : ""}`, icon: ArrowUpRight }
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              activeTab === key
                ? "bg-[#0B192C] text-amber-400 shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* ===================== TAB 1: TỔNG QUAN ===================== */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Thành viên nhóm", value: teamMembers.length, unit: "người", icon: Users, color: "bg-blue-50 border-blue-200 text-blue-900" },
              { label: "Tổng doanh số nhóm", value: totalTeamRevenue.toLocaleString("vi-VN"), unit: "đ", icon: TrendingUp, color: "bg-emerald-50 border-emerald-200 text-emerald-900" },
              { label: "Hoa hồng nhóm", value: totalTeamCommission.toLocaleString("vi-VN"), unit: "đ", icon: Coins, color: "bg-amber-50 border-amber-200 text-amber-900" },
              { label: "Khách giới thiệu nhóm", value: totalTeamLeads, unit: "khách", icon: UserCheck, color: "bg-purple-50 border-purple-200 text-purple-900" }
            ].map(({ label, value, unit, icon: Icon, color }) => (
              <div key={label} className={`p-3.5 rounded-2xl border space-y-1 ${color}`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase opacity-70">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </div>
                <div className="font-black text-sm font-mono">{value} <span className="text-[10px] font-bold">{unit}</span></div>
              </div>
            ))}
          </div>

          {/* Top Thành viên theo doanh số */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="bg-[#0B192C] text-white px-5 py-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="font-black text-xs uppercase tracking-wide">Bảng xếp hạng thành viên nhóm</span>
            </div>
            <div className="divide-y divide-slate-100">
              {teamMembers.length > 0 ? (
                teamMembers
                  .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
                  .slice(0, 5)
                  .map((member, idx) => (
                    <div key={member.ctvCode} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                        idx === 0 ? "bg-amber-400 text-[#0B192C]" :
                        idx === 1 ? "bg-slate-300 text-slate-800" :
                        idx === 2 ? "bg-orange-300 text-orange-900" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center border border-slate-300 shrink-0">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-black text-slate-600 text-[11px]">{member.fullName?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-xs text-slate-900 truncate">{member.fullName}</div>
                        <div className="font-mono text-[10px] text-blue-700">{member.ctvCode}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-emerald-700 text-xs">
                          {(member.totalRevenue || 0).toLocaleString("vi-VN")} đ
                        </div>
                        <div className="text-[10px] text-slate-500">Doanh số</div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs font-medium">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p>Chưa có thành viên nào trong nhóm.</p>
                  <button
                    onClick={() => { setActiveTab("members"); setAddMemberModal(true); }}
                    className="mt-2 text-blue-600 font-bold hover:underline"
                  >
                    + Thêm thành viên đầu tiên
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: THÀNH VIÊN ===================== */}
      {activeTab === "members" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Thành viên nhóm ({teamMembers.length})
            </h2>
            <button
              onClick={() => setAddMemberModal(true)}
              className="bg-[#0B192C] hover:bg-slate-800 text-amber-400 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm thành viên
            </button>
          </div>

          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamMembers.map((member) => {
                const memberLeads = leads.filter((l) => l.ctvCode === member.ctvCode);
                return (
                  <div key={member.ctvCode} className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm hover:border-blue-300 transition">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-black text-slate-600 text-sm">{member.fullName?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm text-slate-900 truncate">{member.fullName}</div>
                        <div className="font-mono text-[11px] text-blue-700 font-bold">{member.ctvCode}</div>
                        <div className="text-[10px] text-slate-500">{member.phone}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                        <div className="font-black text-emerald-700 text-[11px] font-mono">
                          {(member.totalRevenue || 0).toLocaleString("vi-VN")}đ
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">Doanh số</div>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                        <div className="font-black text-amber-700 text-[11px] font-mono">
                          {(member.totalCommission || 0).toLocaleString("vi-VN")}đ
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">Hoa hồng</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
                        <div className="font-black text-blue-700 text-[11px]">
                          {memberLeads.length}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">Khách GT</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-sm">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <p className="font-bold text-slate-700">Nhóm của bạn chưa có thành viên</p>
                <p className="text-xs text-slate-500 mt-1">Nhập Mã CTV để thêm cộng tác viên vào nhóm của bạn.</p>
              </div>
              <button
                onClick={() => setAddMemberModal(true)}
                className="bg-[#0B192C] text-amber-400 font-black px-5 py-2.5 rounded-2xl text-xs hover:bg-slate-800 transition"
              >
                + Thêm thành viên đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: CHUYỂN DOANH SỐ ===================== */}
      {activeTab === "transfers" && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-blue-900 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-black block">Cách hoạt động:</strong>
              Khi CTV thành viên chuyển doanh số, yêu cầu sẽ hiển thị tại đây.
              Trưởng nhóm chấp nhận để hợp nhất doanh số và hoa hồng vào ví nhóm.
            </div>
          </div>

          {transfers.length > 0 ? (
            <div className="space-y-2">
              {transfers.map((t) => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="text-xs font-black text-slate-900">
                      Từ CTV: <span className="text-blue-700">{t.fromCtvName}</span> ({t.fromCtvCode})
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      t.status === "pending" ? "bg-amber-100 text-amber-900 border-amber-300" :
                      t.status === "accepted" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                      "bg-rose-100 text-rose-900 border-rose-300"
                    }`}>
                      {t.status === "pending" ? "⏳ Chờ duyệt" : t.status === "accepted" ? "✓ Đã chấp nhận" : "✗ Đã từ chối"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold block">Dịch vụ:</span>
                      <span className="font-black text-slate-900">{t.serviceName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Doanh số:</span>
                      <span className="font-mono font-black text-emerald-700">{t.amount.toLocaleString("vi-VN")} đ</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Hoa hồng:</span>
                      <span className="font-mono font-black text-amber-700">{t.commission.toLocaleString("vi-VN")} đ</span>
                    </div>
                  </div>

                  {t.note && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                      Ghi chú: "{t.note}"
                    </p>
                  )}

                  {t.status === "pending" && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAccept(t)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 rounded-xl text-xs transition flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Chấp nhận
                      </button>
                      <button
                        onClick={() => handleReject(t)}
                        className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-sm">
              <ArrowUpRight className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">Chưa có yêu cầu chuyển doanh số</p>
              <p className="text-xs text-slate-500">Khi CTV trong nhóm gửi yêu cầu chuyển doanh số, sẽ hiển thị tại đây.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal thêm thành viên */}
      {addMemberModal && (
        <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" /> Thêm thành viên vào nhóm
              </h3>
              <button onClick={() => { setAddMemberModal(false); setMemberError(""); }} className="p-1 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-extrabold mb-1">Mã CTV cần thêm vào nhóm (*):</label>
                <input
                  type="text"
                  placeholder="VD: SAOHAN-NGUYENVANA0912"
                  value={memberCodeInput}
                  onChange={(e) => { setMemberCodeInput(e.target.value); setMemberError(""); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  CTV phải đã đăng ký tài khoản trên hệ thống và chưa thuộc nhóm nào.
                </p>
              </div>

              {memberError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{memberError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setAddMemberModal(false); setMemberError(""); }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="flex-1 py-2.5 bg-[#0B192C] text-amber-400 font-black rounded-xl hover:bg-slate-800 transition shadow-sm"
                >
                  Xác nhận thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// Component nhỏ cho CTV: Gửi yêu cầu chuyển doanh số lên Trưởng nhóm
// =====================================================
interface SendTransferProps {
  ctvUser: CTVUser;
  onClose: () => void;
}

export const SendTransferModal: React.FC<SendTransferProps> = ({ ctvUser, onClose }) => {
  const getInitialLeaderCode = () => {
    if (ctvUser.teamLeaderId) return ctvUser.teamLeaderId;
    try {
      const codeUpper = (ctvUser.code || "").trim().toUpperCase();
      const rawReg = localStorage.getItem("saohan_registered_users");
      if (rawReg) {
        const regList: any[] = JSON.parse(rawReg);
        const match = regList.find((u) => (u.ctvCode || u.code || "").trim().toUpperCase() === codeUpper);
        if (match?.teamLeaderId) return match.teamLeaderId;
      }
      const rawAuth = localStorage.getItem("saohan_auth_user");
      if (rawAuth) {
        const authObj = JSON.parse(rawAuth);
        if (authObj.teamLeaderId) return authObj.teamLeaderId;
      }
    } catch (e) {}
    return "";
  };

  const [targetLeaderCode, setTargetLeaderCode] = useState(getInitialLeaderCode());
  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const leaderCode = targetLeaderCode.trim().toUpperCase();

  // Tính Doanh số khả dụng = Doanh số tổng - Doanh số đã rút hoa hồng
  const totalRevenue = ctvUser.totalRevenue || 0;
  const totalCommission = ctvUser.totalCommission || 0;
  const availableBalance = ctvUser.availableBalance || 0;
  const pendingBalance = ctvUser.pendingBalance || 0;
  
  // Hoa hồng đã rút = Tổng hoa hồng - (Hoa hồng khả dụng + Hoa hồng chờ duyệt)
  const withdrawnCommission = Math.max(0, totalCommission - availableBalance - pendingBalance);
  // Doanh số tương ứng với hoa hồng đã rút (hoặc tính quy đổi)
  const withdrawnRevenue = withdrawnCommission > 0 ? withdrawnCommission * 10 : 0;
  const availableRevenue = Math.max(0, totalRevenue - withdrawnRevenue);

  const handleSend = async () => {
    setError("");
    if (!leaderCode) {
      setError("Vui lòng nhập Mã Trưởng nhóm nhận doanh số.");
      return;
    }

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Vui lòng nhập doanh số hợp lệ (lớn hơn 0)");
      return;
    }

    if (numAmount > availableRevenue) {
      setError(`Số tiền chuyển (${numAmount.toLocaleString("vi-VN")}đ) vượt quá Doanh số khả dụng (${availableRevenue.toLocaleString("vi-VN")}đ)`);
      return;
    }

    const transfer: TeamRevenueTransfer = {
      id: `transfer-${Date.now()}`,
      fromCtvCode: ctvUser.code,
      fromCtvName: ctvUser.name,
      toLeaderCode: leaderCode,
      toLeaderName: ctvUser.teamName || "",
      amount: numAmount,
      commission: Number(commission) || 0,
      serviceName: "Chuyển doanh số CTV",
      note: note.trim() || undefined,
      transferredAt: new Date().toLocaleString("vi-VN"),
      status: "pending"
    };

    try {
      const raw = localStorage.getItem("saohan_team_transfers");
      const all: TeamRevenueTransfer[] = raw ? JSON.parse(raw) : [];
      all.push(transfer);
      localStorage.setItem("saohan_team_transfers", JSON.stringify(all));

      // Tự động gán nhóm cho CTV nếu chưa có
      updateTeamLeaderInSupabase(ctvUser.code, leaderCode, ctvUser.teamName || `Nhóm ${leaderCode}`).catch(console.error);

      // Lưu trực tiếp lên CSDL Supabase table team_revenue_transfers
      saveTransferRequestToSupabase(transfer).catch(console.error);

      setSuccess(true);
    } catch {
      setError("Lỗi khi gửi yêu cầu. Vui lòng thử lại.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B192C]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-black text-sm flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
            Chuyển Doanh Số Lên Trưởng Nhóm
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
            <p className="font-black text-emerald-800">Đã gửi yêu cầu thành công!</p>
            <p className="text-xs text-slate-500">Trưởng nhóm <strong>{leaderCode}</strong> sẽ xem xét và phê duyệt doanh số của bạn.</p>
            <button onClick={onClose} className="w-full bg-emerald-600 text-white font-black py-2.5 rounded-2xl text-xs hover:bg-emerald-700 transition cursor-pointer">
              Đóng
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-xs font-medium">
            {/* Hiển thị / Cho phép nhập Mã Trưởng nhóm nhận */}
            <div>
              <label className="block font-extrabold mb-1 text-slate-700">Mã Trưởng nhóm nhận doanh số (*):</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="VD: SAOHAN-TRUONGNHOM16789"
                  value={targetLeaderCode}
                  onChange={(e) => setTargetLeaderCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
                />
                <UserCheck className="w-4 h-4 text-blue-600 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Khối Thống Kê Doanh Số Khả Dụng */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-bold">Doanh số tổng:</span>
                <span className="font-mono font-bold text-slate-800">{totalRevenue.toLocaleString("vi-VN")} đ</span>
              </div>
              {withdrawnRevenue > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold">Đã rút hoa hồng:</span>
                  <span className="font-mono font-bold text-rose-600">-{withdrawnRevenue.toLocaleString("vi-VN")} đ</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-amber-200/80">
                <span className="text-amber-800 font-extrabold">Doanh số khả dụng:</span>
                <span className="font-mono font-black text-amber-900 text-sm">{availableRevenue.toLocaleString("vi-VN")} đ</span>
              </div>
            </div>

            {/* Nhập Doanh Số & Hoa Hồng */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-extrabold mb-1 text-slate-700">Doanh số chuyển (đ) (*):</label>
                <input
                  type="number"
                  placeholder="VD: 10000000"
                  value={amount}
                  max={availableRevenue}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-extrabold mb-1 text-slate-700">Hoa hồng (đ):</label>
                <input
                  type="number"
                  placeholder="VD: 1500000"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-extrabold mb-1 text-slate-700">Ghi chú (tùy chọn):</label>
              <textarea
                rows={2}
                placeholder="Thêm ghi chú gửi Trưởng nhóm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer">
                Hủy
              </button>
              <button onClick={handleSend} className="flex-1 py-2.5 bg-[#0B192C] text-amber-400 font-black rounded-xl hover:bg-slate-800 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
                <ArrowUpRight className="w-4 h-4" />
                Gửi yêu cầu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
