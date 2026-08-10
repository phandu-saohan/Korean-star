// src/components/ZaloNotifier.tsx
import React, { useState } from 'react';
import { useZaloBot } from '../hooks/useZaloBot';
import { Send, MessageSquare, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

interface ZaloNotifierProps {
  defaultChatId?: string;
  defaultToken?: string;
}

export const ZaloNotifier: React.FC<ZaloNotifierProps> = ({ defaultChatId = '', defaultToken }) => {
  const [chatId, setChatId] = useState<string>(defaultChatId);
  const [message, setMessage] = useState<string>('');
  const [parseMode, setParseMode] = useState<'markdown' | 'html'>('markdown');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { sendMessage, loading, error } = useZaloBot(defaultToken);

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
      setSuccessMessage('Gửi tin nhắn Zalo thành công!');
      setMessage('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 max-w-xl text-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              Gửi Thông Báo Zalo Official Account (OA)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Gửi tin nhắn thông báo chăm sóc khách hàng & CTV từ Zalo Official Account (OA)
            </p>
          </div>
        </div>
        <span className="bg-blue-50 text-blue-700 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-blue-200">
          ZALO OA ACTIVE
        </span>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-700 font-extrabold mb-1">
            Chat ID / SĐT Nhận Tin (*):
          </label>
          <input id="chatid_62" name="chatid_62"
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="Ví dụ: 0901888999 hoặc OA Chat ID"
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
          />
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            ID cuộc trò chuyện hoặc số điện thoại Zalo người nhận thông báo
          </span>
        </div>

        <div>
          <label className="block text-slate-700 font-extrabold mb-1">
            Định Dạng Nội Dung Tin Nhắn:
          </label>
          <select id="parsemode_79" name="parsemode_79"
            value={parseMode}
            onChange={(e) => setParseMode(e.target.value as 'markdown' | 'html')}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="markdown">Markdown (**in đậm**, _in nghiêng_)</option>
            <option value="html">HTML (&lt;b&gt;in đậm&lt;/b&gt;, &lt;i&gt;in nghiêng&lt;/i&gt;)</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-700 font-extrabold mb-1">
            Nội Dung Tin Nhắn (*):
          </label>
          <textarea id="message_93" name="message_93"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nhập nội dung tin nhắn gửi từ Zalo Official Account (OA)..."
            rows={4}
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? 'Đang gửi tin nhắn Zalo OA...' : 'Gửi Qua Zalo OA Ngay'}</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Lỗi Zalo OA: {error}</span>
        </div>
      )}
    </div>
  );
};
