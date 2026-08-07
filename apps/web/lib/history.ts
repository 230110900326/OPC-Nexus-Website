type HistoryItem = { title: string; url: string; time: string };
const HISTORY_KEY = "opc_browsing_history";
const MAX_ITEMS = 50;

function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

export function recordBrowsingHistory(title: string, url: string) {
  if (typeof window === "undefined") return;
  try {
    const items = getHistory();
    const filtered = items.filter((item) => item.url !== url);
    filtered.unshift({ title, url, time: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch { /* ignore */ }
}
