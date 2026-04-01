"use server";

import { loginAdmin, logoutAdmin } from "@/lib/data";

export async function loginAction(formData: FormData) {
  return loginAdmin(formData);
}

export async function logoutAction() {
  return logoutAdmin();
}
