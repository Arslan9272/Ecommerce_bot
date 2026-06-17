// Client for the bot's session/turn API. The conversation logic lives server-side
// (app/service.py) — this just relays taps and free text and returns what to render.

const API_BASE: string =
  ((import.meta as any).env?.VITE_API_BASE as string) || "http://localhost:8000";
const MERCHANT = "demo";

export interface ApiSlot { name: string; value: unknown; }
export interface ApiReply { label: string; slot: ApiSlot | null; }
export interface ApiProduct {
  id: string; name: string; category: string; subtype: string; color: string; fabric: string;
  price: number; compare_at: number | null; sizes: string[]; sale: boolean; hot: boolean; tone: string;
}
export interface SessionResp { session_id: string; message: string; replies: ApiReply[]; step: string; }
export interface TurnResp {
  message: string; replies: ApiReply[]; products: ApiProduct[]; step: string; done: boolean;
  slots: Record<string, unknown>;
}

export async function startSession(): Promise<SessionResp> {
  const res = await fetch(`${API_BASE}/v1/session`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id: MERCHANT }),
  });
  if (!res.ok) throw new Error(`session ${res.status}`);
  return res.json();
}

export async function sendTurn(
  sessionId: string, body: { input?: string; slot?: ApiSlot },
): Promise<TurnResp> {
  const res = await fetch(`${API_BASE}/v1/turn`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, ...body }),
  });
  if (!res.ok) throw new Error(`turn ${res.status}`);
  return res.json();
}
