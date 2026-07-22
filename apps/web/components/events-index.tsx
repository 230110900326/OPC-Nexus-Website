"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Event, getEvents } from "../lib/forum";

const ACCENTS = ["var(--copper)", "var(--teal)", "#8b5e3c", "#2d6a67", "#c17a4a"] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function EventCard({ event, index }: { event: Event; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];
  const eventDate = new Date(event.startsAt);
  const day = eventDate.getDate();
  const month = new Intl.DateTimeFormat("zh-CN", { month: "short" }).format(eventDate);
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(eventDate);

  return (
    <Link
      href={`/events/${event.id}`}
      className="event-highlight-card"
      style={{ "--event-accent": accent } as React.CSSProperties}
    >
      <div className="event-card-accent" />
      <div className="event-card-date-block">
        <span className="event-card-day">{day}</span>
        <span className="event-card-month">{month}</span>
        <span className="event-card-weekday">{weekday}</span>
      </div>
      <div className="event-card-body">
        <div className="event-card-header">
          <span className="event-card-location">{event.locationName}</span>
          {event.status === "published" && (
            <span className="event-card-badge">开放报名</span>
          )}
          {event.status === "cancelled" && (
            <span className="event-card-badge cancelled">已取消</span>
          )}
          {event.status === "completed" && (
            <span className="event-card-badge completed">已结束</span>
          )}
        </div>
        <h2>{event.title}</h2>
        <div className="event-card-meta">
          <span>{formatDate(event.startsAt)}</span>
          <span className="event-card-sep">·</span>
          <span>
            {event.registrationCount}
            {event.capacity ? ` / ${event.capacity}` : ""} 人已报名
          </span>
        </div>
        {event.description && (
          <p className="event-card-desc">
            {event.description.slice(0, 160)}
            {event.description.length > 160 ? "…" : ""}
          </p>
        )}
      </div>
      <div className="event-card-arrow">
        <span>查看详情</span>
        <i>→</i>
      </div>
    </Link>
  );
}

export function EventsIndex() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvents()
      .then((data) => setEvents(data.items))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "活动加载失败")
      );
  }, []);

  return (
    <main className="events-page-v2">
      <section className="events-hero-v2">
        <p className="eyebrow">OPC NEXUS / GATHERINGS</p>
        <h1>
          把值得讨论的事，
          <br />
          带到同一张桌子上。
        </h1>
        <p>
          面向金融与产业从业者的小型交流、闭门研讨和公开分享。
          每一场活动都是独立的对话空间——选择你感兴趣的，坐下来聊聊。
        </p>
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="event-highlight-list">
        {events.map((event, index) => (
          <EventCard event={event} index={index} key={event.id} />
        ))}
        {events.length === 0 && !error && (
          <p className="content-state">近期没有已发布活动，稍后再来看看。</p>
        )}
      </section>
    </main>
  );
}
