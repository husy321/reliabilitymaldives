import { getSession } from "next-auth/react";
import { signOut } from "next-auth/react";

export const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
export const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before logout warning

/**
 * Activity tracker for session management
 */
export class SessionActivityTracker {
  private lastActivity: number = Date.now();
  private timeoutId: NodeJS.Timeout | null = null;
  private warningId: NodeJS.Timeout | null = null;
  private onWarning?: () => void;
  private onTimeout?: () => void;

  constructor(onWarning?: () => void, onTimeout?: () => void) {
    this.onWarning = onWarning;
    this.onTimeout = onTimeout;
    this.startTracking();
  }

  /**
   * Start tracking user activity
   */
  private startTracking() {
    // Track various user activities
    const activities = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];

    activities.forEach(activity => {
      document.addEventListener(activity, this.updateActivity.bind(this), true);
    });

    this.resetTimer();
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity() {
    this.lastActivity = Date.now();
    this.resetTimer();
  }

  /**
   * Reset the inactivity timer
   */
  private resetTimer() {
    // Clear existing timers
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);

    // Set warning timer (5 minutes before timeout)
    this.warningId = setTimeout(() => {
      this.onWarning?.();
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timer
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, SESSION_TIMEOUT);
  }

  /**
   * Handle session timeout
   */
  private async handleTimeout() {
    this.onTimeout?.();
    await this.forceLogout();
  }

  /**
   * Force logout due to inactivity
   */
  public async forceLogout() {
    await signOut({ callbackUrl: "/login?reason=timeout" });
  }

  /**
   * Get time remaining until timeout
   */
  public getTimeRemaining(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, SESSION_TIMEOUT - elapsed);
  }

  /**
   * Extend session (reset activity)
   */
  public extendSession() {
    this.updateActivity();
  }

  /**
   * Stop tracking activity
   */
  public destroy() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningId) clearTimeout(this.warningId);

    const activities = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    activities.forEach(activity => {
      document.removeEventListener(activity, this.updateActivity.bind(this), true);
    });
  }
}

/**
 * Check if current session is valid
 */
export async function isSessionValid(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

/**
 * Get session expiry time
 */
export function getSessionExpiry(): Date | null {
  if (typeof window === "undefined") return null;

  const sessionCookie = document.cookie
    .split("; ")
    .find(row => row.startsWith("next-auth.session-token"));

  if (!sessionCookie) return null;

  // Calculate expiry based on 2-hour timeout
  return new Date(Date.now() + SESSION_TIMEOUT);
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Logout with proper cleanup
 */
export async function logout(callbackUrl: string = "/login"): Promise<void> {
  await signOut({
    callbackUrl,
    redirect: true
  });
}