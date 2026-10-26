import { sendTelegram } from "./telegram";

// Fail-open cron failure alert (Stage 4): silent success, one Telegram ping
// per failed run. Never throws — must not mask the route's own error path.
export async function alertCronFailure(job: string, detail: string): Promise<void> {
  try {
    await sendTelegram(`cron ${job} FAILED: ${detail.slice(0, 300)}`);
  } catch {
    // alert is best-effort only
  }
}
