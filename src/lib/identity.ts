import { v4 as uuidv4 } from "uuid";

const VIEWER_KEY = "mnm_viewer_id";

export function getViewerId(): string {
  let id = localStorage.getItem(VIEWER_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(VIEWER_KEY, id);
  }
  return id;
}

export interface LocalIdentity {
  partnerId: string;
  role: "A" | "B";
}

function key(sessionId: string): string {
  return `mnm_session_${sessionId}`;
}

export function getLocalIdentity(sessionId: string): LocalIdentity | null {
  const raw = localStorage.getItem(key(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalIdentity;
  } catch {
    return null;
  }
}

export function setLocalIdentity(sessionId: string, identity: LocalIdentity): void {
  localStorage.setItem(key(sessionId), JSON.stringify(identity));
}
