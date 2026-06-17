import { useEffect, useRef } from "react";

const BASE_TITLE = "EduChamp";

/**
 * Updates the browser tab title to show unread notification count.
 * When unread > 0 and the tab is not focused, shows "(N) EduChamp".
 * Reverts to "EduChamp" when focused or when unread becomes 0.
 */
export function useTabNotification(unreadCount: number) {
  const isVisible = useRef(true);

  useEffect(() => {
    const handleVisibility = () => {
      isVisible.current = document.visibilityState === "visible";
      if (isVisible.current) {
        // When user returns to tab, reset title
        document.title = BASE_TITLE;
      } else if (unreadCount > 0) {
        document.title = `(${unreadCount > 99 ? "99+" : unreadCount}) ${BASE_TITLE}`;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [unreadCount]);

  useEffect(() => {
    if (!isVisible.current && unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? "99+" : unreadCount}) ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [unreadCount]);
}
