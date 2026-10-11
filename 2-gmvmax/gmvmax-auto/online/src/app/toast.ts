// Shared toast bus: any save/write call-site dispatches, Shell renders.
// toast("Saved.", "ok") / toast("Save failed: ...", "err")
export type ToastKind = "ok" | "err";

export function toast(message: string, kind: ToastKind = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, kind } }));
}
