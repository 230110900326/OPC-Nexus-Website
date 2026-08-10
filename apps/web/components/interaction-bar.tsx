"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "../lib/auth";
import { InteractionState, addInteraction, getInteractionState, removeInteraction } from "../lib/forum";

export function InteractionBar({ targetType, targetId }: { targetType: string; targetId: string }) {
  const router = useRouter();
  const [state, setState] = useState<InteractionState>({ likes: 0, favorites: 0, comments: 0, isLiked: false, isFavorited: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { getInteractionState(targetType, targetId).then(setState).catch(() => {}); }, [targetType, targetId]);

  async function toggle(kind: "likes" | "favorites", active: boolean) {
    if (!getAccessToken()) { router.push("/auth"); return; }
    if (busy) return;
    setBusy(true); setError("");
    try {
      const value = active ? await removeInteraction(kind, targetType, targetId) : await addInteraction(kind, targetType, targetId);
      setState((current) => ({ ...current, likes: kind === "likes" ? value.count : current.likes, favorites: kind === "favorites" ? value.count : current.favorites, isLiked: kind === "likes" ? value.active : current.isLiked, isFavorited: kind === "favorites" ? value.active : current.isFavorited }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败"); }
    finally { setBusy(false); }
  }

  return (
    <div className="interaction-bar">
      <button className={state.isLiked ? "active" : ""} onClick={() => toggle("likes", state.isLiked)} disabled={busy}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span>赞同{state.likes > 0 ? ` ${state.likes}` : ""}</span>
      </button>
      <button className={state.isFavorited ? "active" : ""} onClick={() => toggle("favorites", state.isFavorited)} disabled={busy}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span>收藏{state.favorites > 0 ? ` ${state.favorites}` : ""}</span>
      </button>
      <span className="interaction-count">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>评论{state.comments > 0 ? ` ${state.comments}` : ""}</span>
      </span>
      {error && <small className="inline-message">{error}</small>}
    </div>
  );
}
