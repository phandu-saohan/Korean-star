import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, ArrowDown, Sparkles, CheckCircle2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);

  const PULL_THRESHOLD = 75; // Distance in px required to trigger refresh

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull-to-refresh when at the top of page
      if (window.scrollY <= 5 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;

      currentYRef.current = e.touches[0].clientY;
      const deltaY = currentYRef.current - startYRef.current;

      // Only pull down when deltaY is positive and user is at top of page
      if (deltaY > 0 && window.scrollY <= 5) {
        // Resistance effect: distance scales sub-linearly
        const distance = Math.min(Math.pow(deltaY, 0.85) * 2.2, 110);
        setPullDistance(distance);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);

        try {
          await onRefresh();
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            setIsRefreshing(false);
            setPullDistance(0);
          }, 800);
        } catch (error) {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const isReady = pullDistance >= PULL_THRESHOLD;

  return (
    <div className="relative min-h-screen">
      {/* Pull Indicator Container */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 transition-all duration-150 pointer-events-none flex flex-col items-center justify-center"
          style={{
            transform: `translate(-50%, ${Math.min(pullDistance, PULL_THRESHOLD) * 0.6}px)`,
            opacity: Math.max(progress, isRefreshing ? 1 : 0)
          }}
        >
          <div
            className={`px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-2.5 border transition-all text-xs font-bold ${
              isSuccess
                ? "bg-emerald-600 text-white border-emerald-400"
                : isRefreshing
                ? "bg-[#0B192C] text-amber-400 border-amber-500/50 ring-4 ring-amber-500/20"
                : isReady
                ? "bg-amber-500 text-[#0B192C] border-amber-300 scale-105"
                : "bg-[#0B192C]/90 text-white border-slate-700"
            }`}
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                <span>Đã cập nhật dữ liệu mới nhất!</span>
              </>
            ) : isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Đang đồng bộ dữ liệu Supabase...</span>
              </>
            ) : (
              <>
                <div
                  className="transition-transform duration-200"
                  style={{ transform: `rotate(${progress * 180}deg)` }}
                >
                  <ArrowDown className={`w-4 h-4 ${isReady ? "text-[#0B192C]" : "text-amber-400"}`} />
                </div>
                <span>
                  {isReady ? "Thả tay để tải lại dữ liệu..." : "Kéo xuống để làm mới..."}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Page Content Wrapper with Spring Push */}
      <div
        style={{
          transform: isRefreshing || pullDistance > 0 ? `translateY(${pullDistance * 0.25}px)` : "none",
          transition: isPullingRef.current ? "none" : "transform 0.25s cubic-bezier(0.1, 0.9, 0.2, 1)"
        }}
      >
        {children}
      </div>
    </div>
  );
};
