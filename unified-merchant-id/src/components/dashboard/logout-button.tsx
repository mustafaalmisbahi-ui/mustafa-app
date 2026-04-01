"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
    >
      <LogOut className="h-4 w-4" />
      {pending ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
    </Button>
  );
}
