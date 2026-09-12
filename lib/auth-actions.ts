"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isSsoEnabled, signViewAsCookie, VIEW_AS_COOKIE_NAME } from "@/lib/auth";

/** Dev mode only: switch which seeded user the app sees, via a signed cookie. */
export async function setViewAsUser(userId: string): Promise<void> {
  if (isSsoEnabled()) throw new Error("The dev switcher is off in SSO mode");
  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE_NAME, signViewAsCookie(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}
