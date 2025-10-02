"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession as useNextAuthSession } from "next-auth/react";
import { SessionActivityTracker, formatTimeRemaining } from "@/lib/session";

interface UseSessionReturn {
  session: ReturnType<typeof useNextAuthSession>["data"];
  status: ReturnType<typeof useNextAuthSession>["status"];
  timeRemaining: number;
  timeRemainingFormatted: string;
  showWarning: boolean;
  extendSession: () => void;
}

export function useSession(): UseSessionReturn {
  const { data: session, status } = useNextAuthSession();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [tracker, setTracker] = useState<SessionActivityTracker | null>(null);

  // Initialize activity tracker
  useEffect(() => {
    if (status === "authenticated" && !tracker) {
      const newTracker = new SessionActivityTracker(
        () => setShowWarning(true),
        () => setShowWarning(false)
      );
      setTracker(newTracker);

      return () => {
        newTracker.destroy();
        setTracker(null);
      };
    }
  }, [status, tracker]);

  // Update time remaining periodically
  useEffect(() => {
    if (!tracker) return;

    const interval = setInterval(() => {
      const remaining = tracker.getTimeRemaining();
      setTimeRemaining(remaining);

      // Auto-hide warning if session is extended
      if (remaining > 5 * 60 * 1000 && showWarning) {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tracker, showWarning]);

  const extendSession = useCallback(() => {
    tracker?.extendSession();
    setShowWarning(false);
  }, [tracker]);

  return {
    session,
    status,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    showWarning,
    extendSession,
  };
}