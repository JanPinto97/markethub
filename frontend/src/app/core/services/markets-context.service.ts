import { Injectable, signal } from '@angular/core';

export interface CalendarSnapshotEvent {
  event: string;
  country: string;
  time: string;
  impact: string;
  actual?: any;
  estimate?: any;
  prev?: any;
  unit?: string;
}

export interface NewsSnapshotItem {
  headline: string;
  summary: string;
  source: string;
  time: number;
  url: string;
  category?: string;
}

export interface MarketsSnapshot {
  calendar?: { items: CalendarSnapshotEvent[]; capturedAt: number };
  news?: { items: NewsSnapshotItem[]; capturedAt: number };
}

@Injectable({ providedIn: 'root' })
export class MarketsContextService {
  readonly calendar = signal<{ items: CalendarSnapshotEvent[]; capturedAt: number } | null>(null);
  readonly news = signal<{ items: NewsSnapshotItem[]; capturedAt: number } | null>(null);

  setCalendar(events: any[]) {
    if (!Array.isArray(events) || events.length === 0) return;
    const items: CalendarSnapshotEvent[] = events.slice(0, 80).map((e) => ({
      event: e.event,
      country: e.country,
      time: e.time,
      impact: e.impact,
      actual: e.actual,
      estimate: e.estimate ?? e.forecast,
      prev: e.prev,
      unit: e.unit,
    }));
    this.calendar.set({ items, capturedAt: Date.now() });
  }

  setNews(news: any[]) {
    if (!Array.isArray(news) || news.length === 0) return;
    const items: NewsSnapshotItem[] = news.slice(0, 30).map((n) => ({
      headline: n.title || n.headline,
      summary: (n.snippet || n.summary || '').slice(0, 400),
      source: n.source,
      time: n.time,
      url: n.url,
      category: n.category,
    }));
    this.news.set({ items, capturedAt: Date.now() });
  }

  snapshot(): MarketsSnapshot {
    const out: MarketsSnapshot = {};
    const c = this.calendar();
    const n = this.news();
    if (c) out.calendar = c;
    if (n) out.news = n;
    return out;
  }

  hasAny(): boolean {
    return !!this.calendar() || !!this.news();
  }
}
