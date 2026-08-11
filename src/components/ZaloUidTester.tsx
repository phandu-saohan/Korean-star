import React, { useState } from "react";
import { fetchZaloUserProfileByUid, linkZaloUidToCtvProfile, fetchZaloOaFollowers } from "../services/zaloService";
import { Search, UserCheck, RefreshCw, AlertCircle, CheckCircle2, Terminal, User, Phone, ShieldCheck, Sparkles, MessageSquare, Users } from "lucide-react";

interface ZaloUidTesterProps {
  accessToken?: string;
  onToast?: (msg: string) => void;
}

export const ZaloUidTester: React.FC<ZaloUidTesterProps> = ({ accessToken, onToast }) => {
  const [searchUid, setSearchUid] = useState<string>("2715919749071666693");
  const [ctvCodeOrPhone, setCtvCodeOrPhone] = useState<string>("0901888999");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    ok: boolean;
    description: string;
    profile?: any;
    followers?: Array<{ user_id: string }>;
    total?: number;
    raw?: any;
  } | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(true);

  const handleFetchProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchUid.trim()) {
      alert("Vui lòng nhập Zalo User ID (UID)!");
      return;
    }

    setLoading(true);
    setResult(null);

    const res = await fetchZaloUserProfileByUid(searchUid.trim(), accessToken);
    setResult(res);
    setLoading(false);

    if (res.ok && onToast) {
      onToast("✨ Tra cứu thông tin Zalo UID từ Zalo OA API thành công!");
    }
  };

  const handleScanFollowers = async () => {
    setLoading(true);
    setResult(null);

    const res = await fetchZaloOaFollowers({
      offset: 0,
      count: 50,
      accessTokenInput: accessToken
    });
    setResult(res);
    setLoading(false);

    if (res.ok && res.followers && res.followers.length > 0) {
      setSearchUid(res.followers[0].user_id);
    }

    if (res.ok && onToast) {
      onToast(res.description);
    }
  };

  const handleLinkToCtv = async () => {
    if (!searchUid.trim()) {
      alert("Vui lòng nhập Zalo User ID (UID)!");
      return;
    }
    setLoading(true);
    const linkRes = await linkZaloUidToCtvProfile({
      phone: ctvCodeOrPhone.trim(),
      ctvCode: ctvCodeOrPhone.trim().toUpperCase(),
      zaloChatId: searchUid.trim()
    });
    setLoading(false);

    if (onToast) onToast(linkRes.description);
    alert(linkRes.description);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/10 via-blue-900/10 to-slate-900/10 border border-blue-200/80 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>Kiểm Thử Tra Cứu & Lấy Zalo UID CTV</span>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-300">
                API v2.0 & v3.0
              </span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Kiểm tra khả năng truy vấn thông tin Zalo UID trực tiếp từ Zalo OA API & liên kết hồ sơ CTV
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs font-bold text-slate-600 hover:text-blue-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{showDebug ? "Ẩn Debug Logs" : "Hiện Debug Logs"}</span>
        </button>
      </div>

      {/* Input controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. Zalo UID Input */}
        <div>
          <label className="block text-slate-700 font-extrabold text-[11px] mb-1.5 flex items-center justify-between">
            <span>1. Mã Zalo User ID (UID):</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSearchUid("2715919749071666693")}
                className="text-[10px] text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition cursor-pointer"
              >
                Mẫu OA ID
              </button>
              <button
                type="button"
                onClick={() => setSearchUid("7540234525828588815")}
                className="text-[10px] text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition cursor-pointer"
              >
                Mẫu User ID
              </button>
            </div>
          </label>
          <div className="relative">
            <MessageSquare className="w-4 h-4 text-blue-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              placeholder="Nhập Zalo User ID (ví dụ: 2715919749071666693)"
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-xs shadow-xs"
            />
          </div>
        </div>

        {/* 2. Phone / CTV Code */}
        <div>
          <label className="block text-slate-700 font-extrabold text-[11px] mb-1.5">
            2. Số Điện Thoại hoặc Mã CTV (Đồng bộ CSDL):
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
            <input
              type="text"
              value={ctvCodeOrPhone}
              onChange={(e) => setCtvCodeOrPhone(e.target.value)}
              placeholder="Ví dụ: 0901888999 hoặc SAOHAN-ADMIN"
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-xs shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={loading}
          onClick={handleScanFollowers}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Users className="w-4 h-4" />
          )}
          <span>📋 Quét Danh Sách Người Quan Tâm (getfollowers)</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleFetchProfile}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>🔍 Tra Cứu Profile UID (getprofile)</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleLinkToCtv}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
        >
          <UserCheck className="w-4 h-4" />
          <span>⚡ Liên Kết Zalo UID Với Hồ Sơ CTV</span>
        </button>
      </div>

      {/* Result Card */}
      {result && (
        <div
          className={`p-4 rounded-2xl border text-xs space-y-3 ${
            result.ok
              ? "bg-emerald-50/90 border-emerald-300 text-emerald-900"
              : "bg-rose-50/90 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2 font-extrabold text-sm">
            {result.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{result.description}</span>
          </div>

          {/* Render List of Followers if present */}
          {result.ok && result.followers && result.followers.length > 0 && (
            <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-xs space-y-2">
              <div className="font-extrabold text-indigo-950 text-xs flex items-center justify-between">
                <span>📋 Danh Sách UID Quan Tâm ({result.followers.length}/{result.total || result.followers.length}):</span>
                <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                  Bấm UID để chọn tra cứu nhanh
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                {result.followers.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchUid(item.user_id);
                      if (onToast) onToast(`Đã chọn Zalo UID: ${item.user_id}`);
                    }}
                    className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      searchUid === item.user_id
                        ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300"
                    }`}
                  >
                    #{idx + 1}: {item.user_id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.ok && result.profile && (
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs flex items-center gap-3">
              <img
                src={
                  result.profile.avatar ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                }
                alt="Zalo Avatar"
                className="w-12 h-12 rounded-full border-2 border-emerald-400 object-cover shadow-xs"
              />
              <div className="space-y-0.5">
                <div className="font-extrabold text-slate-900 text-sm">
                  {result.profile.display_name || "Người Dùng Zalo"}
                </div>
                <div className="font-mono text-slate-600 text-[11px] font-bold">
                  User ID: {result.profile.user_id || searchUid}
                </div>
                {result.profile.shared_info?.phone && (
                  <div className="text-emerald-700 font-bold text-[11px]">
                    SĐT Liên Hệ Zalo: {result.profile.shared_info.phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raw JSON Debug Viewer */}
          {showDebug && result.raw && (
            <div className="bg-slate-950 text-slate-100 p-3 rounded-xl overflow-x-auto font-mono text-[11px] border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 border-b border-slate-800 pb-1">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Raw Response JSON (Zalo OpenAPI v2.0 /oa/getprofile):</span>
              </div>
              <pre>{JSON.stringify(result.raw, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
