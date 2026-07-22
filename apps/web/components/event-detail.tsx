"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Event, getEvent, registerForEvent } from "../lib/forum";
import { refreshSession } from "../lib/auth";

/* ── formatting helpers ── */

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
function fmtTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function fmtShort(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(new Date(value));
}

function statusLabel(s: Event["status"]) {
  const map: Record<string, string> = { published: "开放报名", cancelled: "已取消", completed: "已结束", draft: "草稿" };
  return map[s] ?? "";
}

/* ── personal-info fields always required for registration ── */

const PERSONAL_FIELDS = [
  { key: "name",         label: "姓名",     required: true,  placeholder: "你的真实姓名" },
  { key: "phone",        label: "手机号",   required: true,  placeholder: "11 位手机号" },
  { key: "email",        label: "邮箱",     required: false, placeholder: "name@example.com" },
  { key: "company",      label: "公司/机构", required: false, placeholder: "所在公司或机构" },
  { key: "jobTitle",     label: "职位",     required: false, placeholder: "你的职务" },
] as const;

/* ── component ── */

export function EventDetail({ id }: { id: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    getEvent(id).then(setEvent).catch((e) => setMessage(e instanceof Error ? e.message : "活动加载失败"));
  }, [id]);

  async function register() {
    try {
      await refreshSession();
      await registerForEvent(id, data);
      setMessage("报名已提交，审核结果会通过站内通知告知你。");
    } catch (error) {
      if (error instanceof Error && error.message.includes("登录")) router.push("/auth");
      else setMessage(error instanceof Error ? error.message : "报名失败");
    }
  }

  if (!event) return <main className="event-detail-v2"><p className="content-state">{message || "正在读取活动…"}</p></main>;

  const badge = statusLabel(event.status);
  const badgeSlug = (() => { const m: Record<string,string>={published:"",cancelled:"cancelled",completed:"completed"}; return m[event.status]??"draft"; })();

  return (
    <main className="event-detail-v2">

      {/* ═══ Hero ═══ */}
      <header className="event-detail-hero">
        <div className="event-detail-accent" />
        <p className="eyebrow">COMMUNITY GATHERING</p>
        <h1>{event.title}</h1>
        <div className="event-detail-meta-row">
          <div className="event-detail-meta-item"><span className="meta-icon">📅</span><div><strong>{fmtDate(event.startsAt)}</strong><small>— {fmtTime(event.endsAt)} 结束</small></div></div>
          <div className="event-detail-meta-item"><span className="meta-icon">📍</span><div><strong>{event.locationName}</strong><small>{event.locationAddress || "报名后另行通知"}</small></div></div>
          <div className="event-detail-meta-item"><span className="meta-icon">👥</span><div><strong>{event.registrationCount}{event.capacity ? ` / ${event.capacity}` : ""} 人</strong><small>已报名</small></div></div>
          {badge && <span className={`event-detail-status ${badgeSlug}`}>{badge}</span>}
        </div>
      </header>

      {/* ═══ Body — two columns ═══ */}
      <div className="event-detail-layout">

        {/* ── Left: content sections ── */}
        <section className="event-detail-body">

          {/* 活动简介 */}
          <div className="ev-section">
            <h2 className="ev-section-title">活动简介</h2>
            <div className="ev-section-body">
              {event.description.split("\n").map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>

          {/* 活动要点 */}
          <div className="ev-section">
            <h2 className="ev-section-title">活动要点</h2>
            <div className="ev-highlights">
              <div className="ev-hl-item">
                <span className="ev-hl-icon">🕐</span>
                <div>
                  <strong>活动时间</strong>
                  <p>{fmtShort(event.startsAt)}　{fmtTime(event.startsAt)} — {fmtTime(event.endsAt)}</p>
                </div>
              </div>
              <div className="ev-hl-item">
                <span className="ev-hl-icon">📍</span>
                <div>
                  <strong>活动地点</strong>
                  <p>{event.locationName}{event.locationAddress ? ` · ${event.locationAddress}` : ""}</p>
                </div>
              </div>
              <div className="ev-hl-item">
                <span className="ev-hl-icon">👤</span>
                <div>
                  <strong>主办方</strong>
                  <p>{event.organizer.displayName}</p>
                </div>
              </div>
              {event.capacity && (
                <div className="ev-hl-item">
                  <span className="ev-hl-icon">🎯</span>
                  <div><strong>名额限制</strong><p>{event.capacity} 人</p></div>
                </div>
              )}
              {event.registrationDeadline && (
                <div className="ev-hl-item">
                  <span className="ev-hl-icon">⏳</span>
                  <div><strong>报名截止</strong><p>{fmtDate(event.registrationDeadline)}</p></div>
                </div>
              )}
            </div>
          </div>

          {/* 联系方式 */}
          <div className="ev-section">
            <h2 className="ev-section-title">联系方式</h2>
            <div className="ev-contact-card">
              <div className="ev-contact-row">
                <span>主办方</span>
                <strong>{event.organizer.displayName}</strong>
              </div>
              <div className="ev-contact-row">
                <span>活动地点</span>
                <strong>{event.locationAddress || event.locationName}</strong>
              </div>
              <p className="ev-contact-note">如有疑问，可在报名时备注留言，主办方会与你取得联系。</p>
            </div>
          </div>

          {/* 封面图 */}
          {event.coverUrl && (
            <figure className="event-detail-cover-wrap">
              <img src={event.coverUrl} alt={event.title} className="event-detail-cover" />
            </figure>
          )}
        </section>

        {/* ── Right: registration card ── */}
        <aside className="event-reg-card">
          <div className="reg-card-header">
            <span className="reg-card-accent" />
            <p className="reg-card-eyebrow">REGISTRATION</p>
            <h2>报名参加</h2>
          </div>
          <div className="reg-card-body">
            <div className="reg-card-stat">
              <span className="reg-stat-number">{event.registrationCount}</span>
              <span className="reg-stat-label">人已报名{event.capacity ? `（限额 ${event.capacity} 人）` : ""}</span>
            </div>

            {/* personal info fields */}
            {PERSONAL_FIELDS.map((f) => (
              <label key={f.key}>
                <span>{f.label}{f.required && <b className="reg-required"> *</b>}</span>
                <input
                  required={f.required}
                  value={data[f.key] ?? ""}
                  onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  type={f.key === "email" ? "email" : f.key === "phone" ? "tel" : "text"}
                />
              </label>
            ))}

            {/* event-specific custom fields */}
            {event.registrationFields.map((f) => (
              <label key={f.key}>
                <span>{f.label}{f.required && <b className="reg-required"> *</b>}</span>
                <input
                  required={f.required}
                  value={data[f.key] ?? ""}
                  onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                  placeholder={f.label}
                />
              </label>
            ))}

            <button disabled={!event.isRegistrationOpen} onClick={() => void register()}>
              {event.isRegistrationOpen ? "提交报名" : "报名已结束"}
            </button>

            {message && (
              <p className={`reg-message${message.includes("提交") ? " success" : ""}`}>{message}</p>
            )}
          </div>
        </aside>

      </div>
    </main>
  );
}
