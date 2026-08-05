// src/hooks/useZaloBot.ts
import { useState } from 'react';
import { sendZaloMessage, SendMessagePayload, ZaloApiResponse } from '../services/zaloService';

export function useZaloBot(botToken?: string) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ZaloApiResponse | null>(null);

  const sendMessage = async (payload: SendMessagePayload): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // 1. Lấy token từ param ➔ localStorage settings ➔ biến môi trường env
      let storedToken = "";
      const savedSettings = localStorage.getItem("saohan_cms_settings");
      if (savedSettings) {
        try {
          storedToken = JSON.parse(savedSettings).zaloBotToken || "";
        } catch (e) {}
      }

      const token =
        botToken ||
        storedToken ||
        (import.meta as any).env?.VITE_ZALO_BOT_TOKEN ||
        (process as any).env?.REACT_APP_ZALO_BOT_TOKEN ||
        '';

      if (!token) {
        throw new Error('Chưa cấu hình Zalo Bot Token trong Cài Đặt Hệ Thống hoặc file .env');
      }

      const res = await sendZaloMessage(payload, token);
      setLastResponse(res);

      if (!res.ok) {
        throw new Error(res.description || 'Gửi tin nhắn Zalo thất bại. Vui lòng kiểm tra Chat ID hoặc Token bot.');
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi gửi tin nhắn qua Zalo Bot API');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendMessage,
    loading,
    error,
    lastResponse,
  };
}
