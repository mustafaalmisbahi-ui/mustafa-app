export const AUTH_COOKIE_NAME = "umi_session";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

export const BRANCH_UPDATE_THRESHOLD_DAYS = 30;
export const MERCHANT_CODE_PREFIX = "M";

export const DEFAULT_ADMIN_USERNAME = "admin";
export const DEFAULT_ADMIN_PASSWORD = "admin123";

export const MERCHANT_STATUSES = [
  "active",
  "inactive",
  "pending_update",
  "draft",
] as const;

export const BRANCH_STATUSES = ["active", "inactive", "pending_update"] as const;

export const WALLET_STATUSES = ["active", "inactive", "temporary"] as const;
