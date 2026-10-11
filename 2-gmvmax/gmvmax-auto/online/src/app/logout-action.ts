"use server";

import { signOut } from "../../auth";

export async function logOut(): Promise<void> {
  await signOut({ redirectTo: "/sign-in" });
}
