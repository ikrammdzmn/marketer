const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// Minimal Telegram sender. Values live in Vercel Env only (BotFather).
// HTML callers must escape names. Rich pipe (Bot API 10.1+) first with the
// spec-confirmed {html} shorthand, legacy sendMessage fallback (option A).
export async function sendTelegram(text: string, html = false): Promise<boolean> {
  return (await sendTelegramFull(text, html)).ok;
}

export interface SendResult {
  ok: boolean;
  mode: "rich-blocks" | "rich-html" | "legacy" | "failed" | "none";
  error?: string;
}

async function postBot(
  token: string,
  method: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; description?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    return { ok: body.ok === true, description: body.description };
  } catch {
    return { ok: false, description: "network error" };
  }
}

export async function sendTelegramFull(
  text: string,
  html = false,
  blocks?: unknown[],
  coverUrl?: string
): Promise<SendResult> {
  const token = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
  // Accepts "-100xxx_30" glued form or plain id; thread split out automatically.
  const rawChat = cleanEnv(process.env.TELEGRAM_CHAT_ID);
  const envThread = cleanEnv(process.env.TELEGRAM_THREAD_ID);
  let chatId = rawChat;
  let thread = envThread;
  const m = rawChat.match(/^(-\d+)[_:](\d+)$/);
  if (m) {
    chatId = m[1];
    if (!thread) thread = m[2];
  }
  if (!token || !chatId) {
    console.log("[telegram] skipped (no TELEGRAM_BOT_TOKEN/CHAT_ID env)");
    return { ok: false, mode: "none" };
  }
  const target: Record<string, unknown> = { chat_id: chatId };
  if (thread) target.message_thread_id = Number(thread);
  // Cover first as its own photo message (fail-open): a bad image must never
  // nuke the tables — blocks send stays photo-free.
  if (coverUrl) {
    await postBot(token, "sendPhoto", { ...target, photo: coverUrl });
  }
  if (blocks) {
    const table = await postBot(token, "sendRichMessage", {
      ...target,
      rich_message: { blocks },
    });
    if (table.ok) return { ok: true, mode: "rich-blocks" };
    console.error("[telegram] rich blocks failed, falling back:", table.description);
  }
  if (html) {
    // Rich HTML collapses raw newlines — convert to <br/> for that pipe only.
    const rich = await postBot(token, "sendRichMessage", {
      ...target,
      rich_message: { html: text.replace(/\n/g, "<br/>") },
    });
    if (rich.ok) return { ok: true, mode: "rich-html" };
    console.error("[telegram] rich failed, falling back:", rich.description);
  }
  const legacy = await postBot(token, "sendMessage", {
    ...target,
    text,
    ...(html ? { parse_mode: "HTML" as const } : {}),
  });
  if (legacy.ok) return { ok: true, mode: "legacy" };
  return { ok: false, mode: "failed", error: legacy.description };
}

// Answer a callback-query tap (removes client spinner). Token from env.
export async function answerCallback(queryId: string, text?: string): Promise<boolean> {
  const token = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) return false;
  return (await postBot(token, "answerCallbackQuery", {
    callback_query_id: queryId,
    ...(text ? { text } : {}),
  })).ok;
}

// Post a photo (by public URL) into an explicit chat/thread. Token from env.
export async function sendPhotoDirect(
  chatId: string | number,
  threadId: number | null,
  photoUrl: string,
  caption?: string
): Promise<boolean> {
  const token = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) return false;
  const payload: Record<string, unknown> = { chat_id: chatId, photo: photoUrl };
  if (threadId) payload.message_thread_id = threadId;
  if (caption) payload.caption = caption;
  return (await postBot(token, "sendPhoto", payload)).ok;
}

// Direct send to an explicit chat/thread (webhook replies). Token from env.
export async function sendDirect(
  chatId: string | number,
  threadId: number | null,
  text: string
): Promise<boolean> {
  const token = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) return false;
  const payload: Record<string, unknown> = { chat_id: chatId, text };
  if (threadId) payload.message_thread_id = threadId;
  return (await postBot(token, "sendMessage", payload)).ok;
}
