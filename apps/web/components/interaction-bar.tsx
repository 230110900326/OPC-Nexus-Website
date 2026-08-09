"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "../lib/auth";
import { InteractionState, addInteraction, getInteractionState, removeInteraction } from "../lib/forum";

/** 通用互动栏：点赞（赞同）/收藏 + 计数，供文章、视频详情页复用。 */
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
      <button className={state.isLiked ? "active" : ""} onClick={() => toggle("likes", state.isLiked)}>👍 赞同 {state.likes || ""}</button>
      <button className={state.isFavorited ? "active" : ""} onClick={() => toggle("favorites", state.isFavorited)}>⭐ 收藏 {state.favorites || ""}</button>
      <span className="interaction-count">💬 评论 {state.comments || ""}</span>
      {error && <small className="inline-message">{error}</small>}
    </div>
  );
}
