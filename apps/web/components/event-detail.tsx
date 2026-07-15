"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Event, getEvent, registerForEvent } from "../lib/forum";
import { refreshSession } from "../lib/auth";

export function EventDetail({ id }: { id: string }) {
  const router = useRouter(); const [event, setEvent] = useState<Event | null>(null); const [data, setData] = useState<Record<string, string>>({}); const [message, setMessage] = useState("");
  useEffect(() => { getEvent(id).then(setEvent).catch((error) => setMessage(error instanceof Error ? error.message : "活动加载失败")); }, [id]);
  async function register() { try { await refreshSession(); await registerForEvent(id, data); setMessage("报名已提交，审核结果会通过站内通知告知你。"); } catch (error) { if (error instanceof Error && error.message.includes("登录")) router.push("/auth"); else setMessage(error instanceof Error ? error.message : "报名失败"); } }
  if (!event) return <main className="events-page"><p className="content-state">{message || "正在读取活动…"}</p></main>;
  return <main className="event-detail"><section><p className="eyebrow">COMMUNITY GATHERING</p><h1>{event.title}</h1><p className="event-time">{new Date(event.startsAt).toLocaleString("zh-CN")} — {new Date(event.endsAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p><div className="event-description">{event.description.split("\n").map((line, index) => <p key={index}>{line}</p>)}</div></section><aside className="registration-panel"><p>地点</p><h2>{event.locationName}</h2><small>{event.locationAddress || "报名后另行通知"}</small><hr /><p>{event.registrationCount}{event.capacity ? ` / ${event.capacity}` : ""} 人已报名</p>{event.registrationFields.map((field) => <label key={field.key}>{field.label}{field.required ? " *" : ""}<input required={field.required} value={data[field.key] ?? ""} onChange={(e) => setData({ ...data, [field.key]: e.target.value })} /></label>)}<button disabled={!event.isRegistrationOpen} onClick={() => void register()}>{event.isRegistrationOpen ? "提交报名" : "报名已结束"}</button>{message && <p className="form-message">{message}</p>}</aside></main>;
}
