/**
 * KOREAN STAR PWA - App Badging API Utility
 * Supports Android Chrome & iOS 16.4+ Add-to-Home-Screen PWA
 */

/**
 * Check if the browser supports the Web App Badging API
 */
export const isAppBadgeSupported = (): boolean => {
  return (
    typeof navigator !== "undefined" &&
    "setAppBadge" in navigator &&
    "clearAppBadge" in navigator
  );
};

/**
 * Set the PWA application icon badge count
 * @param count Number of unread notifications to display on the app icon badge
 */
export const setBadge = async (count: number): Promise<boolean> => {
  if (!isAppBadgeSupported()) {
    console.debug("[PWA Badge] App Badging API is not supported on this device/browser.");
    return false;
  }

  try {
    const badgeNumber = Math.max(0, Math.floor(count));
    if (badgeNumber === 0) {
      await clearBadge();
    } else {
      await navigator.setAppBadge(badgeNumber);
      console.log(`[PWA Badge] App badge updated to: ${badgeNumber}`);
    }
    return true;
  } catch (error) {
    console.warn("[PWA Badge] Error setting app badge:", error);
    return false;
  }
};

/**
 * Clear the PWA application icon badge
 */
export const clearBadge = async (): Promise<boolean> => {
  if (!isAppBadgeSupported()) return false;

  try {
    await navigator.clearAppBadge();
    console.log("[PWA Badge] App badge cleared successfully.");
    return true;
  } catch (error) {
    console.warn("[PWA Badge] Error clearing app badge:", error);
    return false;
  }
};

/**
 * Automatically set or clear badge based on unread notification count
 * @param unreadCount Number of unread notifications
 */
export const updateAppBadgeFromUnread = async (unreadCount: number): Promise<boolean> => {
  if (unreadCount > 0) {
    return await setBadge(unreadCount);
  } else {
    return await clearBadge();
  }
};
