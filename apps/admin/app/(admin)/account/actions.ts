"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toStringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function accountUrl(params: { success?: string; error?: string }): string {
  const qs = new URLSearchParams();
  if (params.success) qs.set("success", params.success);
  if (params.error) qs.set("error", params.error);
  const suffix = qs.toString();
  return suffix ? `/account?${suffix}` : "/account";
}

export async function updateAccountNameAction(formData: FormData) {
  const fullName = toStringValue(formData.get("full_name"));

  if (fullName.length < 2) {
    redirect(
      accountUrl({
        error: "Name must be at least 2 characters.",
      })
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? { ...user.user_metadata }
      : {};

  const { error } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      full_name: fullName,
      name: fullName,
    },
  });

  if (error) {
    redirect(accountUrl({ error: error.message }));
  }

  revalidatePath("/account");
  redirect(accountUrl({ success: "profile-updated" }));
}

export async function updateAccountPasswordAction(formData: FormData) {
  const password = toStringValue(formData.get("password"));
  const confirmPassword = toStringValue(formData.get("confirm_password"));

  if (password.length < 8) {
    redirect(
      accountUrl({
        error: "Password must be at least 8 characters.",
      })
    );
  }

  if (password !== confirmPassword) {
    redirect(
      accountUrl({
        error: "Password confirmation does not match.",
      })
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(accountUrl({ error: error.message }));
  }

  revalidatePath("/account");
  redirect(accountUrl({ success: "password-updated" }));
}
