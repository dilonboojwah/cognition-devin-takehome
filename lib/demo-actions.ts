"use server";

import { revalidatePath } from "next/cache";
import { isDemoMode } from "@/lib/demo";
import { seedDatabase } from "@/lib/seed-data";

/** Restores the demo dataset. Refuses unless DEMO_MODE is on. */
export async function resetDemoDataAction(): Promise<string | void> {
  if (!isDemoMode()) return "Demo reset is not enabled on this deployment.";
  try {
    await seedDatabase();
  } catch {
    return "Could not reset the demo data.";
  }
  revalidatePath("/", "layout");
}
