/**
 * NotificationContext — native stub (no-op).
 *
 * OneSignal has been removed. This stub preserves the same interface so all
 * consumers (NotificationBell, notification-preferences, _layout) continue to
 * compile and run without changes.
 */

import React, { createContext, useContext, useCallback, ReactNode } from "react";

interface NotificationContextType {
  hasPermission: boolean;
  permissionDenied: boolean;
  loading: boolean;
  isWeb: boolean;
  requestPermission: () => Promise<boolean>;
  sendTag: (key: string, value: string) => void;
  deleteTag: (key: string) => void;
  lastNotification: Record<string, unknown> | null;
}

const NotificationContext = createContext<NotificationContextType>({
  hasPermission: false,
  permissionDenied: false,
  loading: false,
  isWeb: false,
  requestPermission: async () => false,
  sendTag: () => {},
  deleteTag: () => {},
  lastNotification: null,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    console.log("[Notifications] requestPermission called (no-op stub)");
    return false;
  }, []);

  const sendTag = useCallback((key: string, value: string) => {
    console.log("[Notifications] sendTag called (no-op stub):", key, "=", value);
  }, []);

  const deleteTag = useCallback((key: string) => {
    console.log("[Notifications] deleteTag called (no-op stub):", key);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        hasPermission: false,
        permissionDenied: false,
        loading: false,
        isWeb: false,
        requestPermission,
        sendTag,
        deleteTag,
        lastNotification: null,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
