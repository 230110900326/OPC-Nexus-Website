"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, refreshSession } from "../lib/auth";
import { ContentComment, addContentComment, deleteContentComment, getContentComments, updateContentComment } from "../lib/forum";

function CommentAvatar({ user, className }: { user: { displayName: string; avatarUrl: string | null }; className: string }) {
  if (user.avatarUrl) return <span className={`${className} has-image`}><img src={user.avatarUrl} alt="" loading="lazy" /></span>;
  return <span className={className}>{user.displayName.slice(0, 1)}</span>;
}

function CommentNode({ comment, targetType, targetId, account, onChanged }: { comment: ContentComment; targetType: string; targetId: string; account: Account | null; onChanged: () => Promise<void> }) {
  const [replying, setReplying] = useState(false); const [reply, setReply] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); try { await addContentComment(targetType, targetId, reply, comment.id); setReply(""); setReplying(false); await onChanged(); } catch (reason) { setError(reason instanceof Error ? reason.message : "回复失败"); } }
  async function edit() { const value = window.prompt("修改评论", comment.body); if (!value || value === comment.body) return; try { await updateContentComment(comment.id, value); await onChanged(); } catch (reason) { setError(reason instanceof Error ? reason.message : "修改失败"); } }
  async function remove() { if (!window.confirm("确认删除这条评论？")) return; try { await deleteContentComment(comment.id); await onChanged(); } catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败"); } }
  return <div className={`comment-node ${comment.status !== "published" ? "muted" : ""}`}><div className="comment-head"><CommentAvatar user={comment.author} className="comment-avatar" /><div><strong>{comment.author.displayName}</strong><small>{comment.author.jobTitle || comment.author.industry || "社区成员"} · {new Date(comment.createdAt).toLocaleString("zh-CN")}</small></div></div><p>{comment.body}</p>{comment.status === "published" && <div className="comment-actions"><button onClick={() => account ? setReplying((value) => !value) : window.location.assign("/auth")}>回复</button>{account?.id === comment.author.id && <><button onClick={edit}>编辑</button><button onClick={remove}>删除</button></>}</div>}{replying && <form className="reply-form" onSubmit={submit}><textarea required maxLength={5000} rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`回复 ${comment.author.displayName}`} /><button>发布回复</button></form>}{error && <small className="inline-message">{error}</small>}{comment.children.length > 0 && <div className="comment-children">{comment.children.map((child) => <CommentNode comment={child} targetType={targetType} targetId={targetId} account={account} onChanged={onChanged} key={child.id} />)}</div>}</div>;
}

/** 通用评论区：文章/视频详情页复用，支持发布、回复、编辑、删除。 */
export function CommentSection({ targetType, targetId, placeholder = "补充你的观点…" }: { targetType: string; targetId: string; placeholder?: string }) {
  const router = useRouter();
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [count, setCount] = useState(0);
  const [account, setAccount] = useState<Account | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  async function load() { const value = await getContentComments(targetType, targetId); setComments(value.comments); setCount(value.count); }
  useEffect(() => { load().catch(() => {}); refreshSession().then(setAccount).catch(() => {}); }, [targetType, targetId]);
  async function submit(event: FormEvent) { event.preventDefault(); if (!account) { router.push("/auth"); return; } setError(""); try { await addContentComment(targetType, targetId, body); setBody(""); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "评论失败"); } }
  return <section className="comment-ledger"><header><div><p className="eyebrow">READER RESPONSES</p><h2>{count} 条评论</h2></div></header><form className="comment-compose" onSubmit={submit}><textarea required maxLength={5000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder={account ? placeholder : "登录后参与讨论"} /><button>{account ? "发布评论" : "登录后评论"}</button></form>{error && <p className="form-error" role="alert">{error}</p>}<div className="comment-tree">{comments.map((value) => <CommentNode comment={value} targetType={targetType} targetId={targetId} account={account} onChanged={load} key={value.id} />)}{!comments.length && <p className="content-state">还没有评论，来抢沙发。</p>}</div></section>;
}
