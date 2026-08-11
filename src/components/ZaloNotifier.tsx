// src/components/ZaloNotifier.tsx
import React, { useState } from 'react';
import { useZaloBot } from '../hooks/useZaloBot';
import { Send, MessageSquare, CheckCircle2, AlertCircle, Sparkles, Terminal, User, FileText, Info } from 'lucide-react';

interface ZaloNotifierProps {
  defaultChatId?: string;
  defaultToken?: string;
}

export const ZaloNotifier: React.FC<ZaloNotifierProps> = ({ defaultChatId = '', defaultToken }) => {
  const [chatId, setChatId] = useState<string>(defaultChatId);
  const [message, setMessage] = useState<string>(
    'Xin chào! Bệnh viện Thẩm mỹ Quốc tế Korean Star gửi tin nhắn tư vấn tự động qua Zalo Official Account (OA) v3.0 API.'
  );
  const [parseMode, setParseMode] = useState<'markdown' | 'html'>('markdown');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(true);

  const { sendMessage, loading, error, lastResponse } = useZaloBot(defaultToken);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    if (!chatId.trim() || !message.trim()) return;

    const isSuccess = await sendMessage({
      chatId: chatId.trim(),
      text: message.trim(),
      parseMode,
    });

    if (isSuccess) {
      setSuccessMessage('Gửi tin nhắn Zalo OA v3.0 qua User ID thành công!');
    }
  };

  const applyTemplate = (text: string) => {
    setMessage(text);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              🧪 Gửi Thử Tin Nhắn Zalo OA Qua User ID (UID)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Gửi thử tin tư vấn dạng văn bản qua Zalo OpenAPI v3.0 (`/v3.0/oa/message/cs`)
            </p>
          </div>
        </div>
        <span className="bg-blue-100 text-blue-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-blue-200 shrink-0">
          ZALO OA v3.0
        </span>
      </div>

      <div className="space-y-4 text-xs">
        {/* User ID / Chat ID Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-800 font-extrabold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Zalo User ID (user_id) / Chat ID (*):</span>
            </label>
            <div className="flex items-center gap-1.5">
              {defaultChatId && (
                <button
                  type="button"
                  onClick={() => setChatId(defaultChatId)}
                  className="text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md font-bold transition cursor-pointer"
                >
                  Dùng ID Mặc Định ({defaultChatId.slice(0, 10)}...)
                </button>
              )}
              <button
                type="button"
                onClick={() => setChatId('2715919749071666693')}
                className="text-[10px] text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md font-bold transition cursor-pointer"
              >
                Sample OA ID
              </button>
            </div>
          </div>
          <input
            id="zalo_test_uid_input"
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="Ví dụ: 2715919749071666693 hoặc Zalo Chat ID"
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            `user_id` nhận từ Webhook Zalo OA hoặc API danh sách người dùng đã theo dõi OA.
          </span>
        </div>

        {/* Template Quick Actions */}
        <div>
          <label className="block text-slate-700 font-extrabold mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Chọn Mẫu Tin Nhắn Nhanh:</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyTemplate("💬 Xin chào! Bệnh viện Thẩm mỹ Quốc tế Korean Star gửi tin nhắn tư vấn tự động qua Zalo Official Account (OA) v3.0 API.")}
              className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg transition border border-slate-200 cursor-pointer"
            >
              💬 Tin Tư Vấn Mẫu
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("📅 THÔNG BÁO LỊCH HẸN: Lịch tư vấn chăm sóc da 3D của bạn đã được xác nhận vào lúc 09:30 AM ngày mai tại Korean Star!")}
              className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg transition border border-slate-200 cursor-pointer"
            >
              📅 Lịch Hẹn Mẫu
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("🎉 UY TIN & ĐẦU TƯ: Cảm ơn bạn đã quan tâm dịch vụ thẩm mỹ tại Bệnh viện Thẩm mỹ Quốc tế Korean Star. Bác sĩ sẵn sàng tư vấn miễn phí!")}
              className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg transition border border-slate-200 cursor-pointer"
            >
              🎉 Ưu Đãi Mẫu
            </button>
          </div>
        </div>

        {/* Message Content Area */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-800 font-extrabold">
              Nội Dung Tin Nhắn (Tối đa 2.000 ký tự) (*):
            </label>
            <span className={`text-[10px] font-bold ${message.length > 2000 ? 'text-rose-600' : 'text-slate-400'}`}>
              {message.length} / 2000 ký tự
            </span>
          </div>
          <textarea
            id="zalo_test_message_textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nhập nội dung tin nhắn tư vấn gửi từ Zalo Official Account (OA)..."
            rows={4}
            maxLength={2000}
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs transition"
          />
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !chatId.trim() || !message.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-extrabold py-3 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang Gửi Tin Nhắn v3.0 Đến Zalo OA...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>🚀 Gửi Thử Qua Zalo OA (API v3.0)</span>
            </>
          )}
        </button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-extrabold">{successMessage}</p>
            <p className="text-[11px] text-emerald-700 font-normal">
              Zalo OA đã ghi nhận và phát tin nhắn thành công tới User ID: <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">{chatId}</code>
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-extrabold">Gửi tin nhắn Zalo OA thất bại</p>
            <p className="text-[11px] text-rose-700 font-medium mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Debug Response JSON Panel */}
      {lastResponse && (
        <div className="border border-slate-200 rounded-2xl bg-slate-900 text-slate-100 p-3.5 text-xs font-mono space-y-2 overflow-hidden">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Kết quả phản hồi Zalo OA API v3.0 Response
            </span>
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="hover:text-white transition cursor-pointer"
            >
              {showDebug ? 'Ẩn Log' : 'Hiện Log'}
            </button>
          </div>
          {showDebug && (
            <pre className="text-[11px] leading-relaxed text-blue-300 overflow-x-auto p-2 bg-slate-950 rounded-xl">
              {JSON.stringify(lastResponse, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Zalo OA v3.0 Guidance Note */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 text-[11px] text-blue-900 space-y-1">
        <div className="font-extrabold flex items-center gap-1.5 text-blue-800">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Lưu ý kỹ thuật Zalo OA v3.0 (Tin tư vấn `cs`):</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-blue-950 font-medium pl-1">
          <li>API Endpoint: <code className="font-mono bg-blue-100 px-1 rounded">POST https://openapi.zalo.me/v3.0/oa/message/cs</code></li>
          <li>Người nhận (<code className="font-mono bg-blue-100 px-1 rounded">user_id</code>) phải là người dùng <b>đã quan tâm OA</b> hoặc <b>đã nhắn tin cho OA trong vòng 7 ngày</b>.</li>
          <li>Cần có Access Token còn hạn (24h) và scope <code className="font-mono bg-blue-100 px-1 rounded">oa.message</code> từ Zalo Developer Platform.</li>
        </ul>
      </div>
    </div>
  );
};
