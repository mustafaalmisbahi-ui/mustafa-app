import { format } from "date-fns";

export function formatDateArabic(value: Date) {
  return format(value, "yyyy/MM/dd HH:mm");
}

export function merchantStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "نشط";
    case "inactive":
      return "غير نشط";
    case "pending_update":
      return "بانتظار تحديث";
    case "draft":
      return "مسودة";
    default:
      return status;
  }
}

export function branchStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "نشط";
    case "inactive":
      return "غير نشط";
    case "pending_update":
      return "بانتظار تحديث";
    default:
      return status;
  }
}

export function walletStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "نشط";
    case "inactive":
      return "غير نشط";
    case "temporary":
      return "مؤقت";
    default:
      return status;
  }
}

export function formatDateTime(value: Date) {
  return formatDateArabic(value);
}
