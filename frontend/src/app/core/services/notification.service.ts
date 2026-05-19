import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  link?: string;
  type?: string;
  /** when true the notification lives only in localStorage (e.g. calendar alerts) */
  local?: boolean;
}

export interface CalendarAlert {
  id: string;
  eventId: string;
  eventTitle: string;
  triggerTime: Date;
  offsetMinutes: number;
  triggered: boolean;
}

interface ServerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

const LOCAL_KEY = 'markethub_notifications_local';
const ALERTS_KEY = 'markethub_calendar_alerts';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/notifications`;

  /** server-side notifications (community + auth required) */
  private serverNotifications = signal<NotificationItem[]>([]);
  /** local-only notifications (calendar alerts, markets) */
  private localNotifications = signal<NotificationItem[]>([]);

  readonly notifications = computed<NotificationItem[]>(() => {
    const merged = [...this.serverNotifications(), ...this.localNotifications()];
    merged.sort((a, b) => b.time.getTime() - a.time.getTime());
    return merged;
  });

  readonly unreadCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  readonly activeAlerts = signal<CalendarAlert[]>([]);

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadLocal();
    this.loadAlerts();

    setInterval(() => this.checkCalendarAlerts(), 10000);

    // Reload from server when auth state changes
    let lastAuth: boolean | null = null;
    setInterval(() => {
      const authed = this.auth.isAuthenticated();
      if (authed !== lastAuth) {
        lastAuth = authed;
        if (authed) {
          this.refreshFromServer();
          this.startPolling();
        } else {
          this.serverNotifications.set([]);
          this.stopPolling();
        }
      }
    }, 1000);
  }

  private startPolling() {
    this.stopPolling();
    this.pollHandle = setInterval(() => this.refreshFromServer(), 30_000);
  }

  private stopPolling() {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  refreshFromServer() {
    if (!this.auth.isAuthenticated()) return;
    this.http.get<{ success: boolean; notifications: ServerNotification[] }>(this.apiUrl).subscribe({
      next: res => {
        const prevUnreadIds = new Set(
          this.serverNotifications().filter(n => !n.read).map(n => n.id)
        );
        const mapped: NotificationItem[] = (res.notifications || []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: new Date(n.createdAt),
          read: n.read,
          link: n.link,
          type: n.type,
        }));
        const newUnread = mapped.some(n => !n.read && !prevUnreadIds.has(n.id));
        this.serverNotifications.set(mapped);
        if (newUnread && this.serverNotifications().length > 0) this.playSound();
      },
      error: err => console.warn('Failed to load notifications:', err?.message),
    });
  }

  private loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        this.localNotifications.set(list.map((n: any) => ({ ...n, time: new Date(n.time), local: true })));
      }
    } catch (e) {
      console.warn('Error reading local notifications', e);
    }
  }

  private persistLocal() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(this.localNotifications()));
  }

  /** Add a local-only notification (used by markets/calendar). */
  addNotification(title: string, message: string, link?: string) {
    const newNotif: NotificationItem = {
      id: 'local-' + Math.random().toString(36).slice(2, 11),
      title,
      message,
      time: new Date(),
      read: false,
      link,
      local: true,
    };
    this.localNotifications.update(list => [newNotif, ...list]);
    this.persistLocal();
    this.playSound();
  }

  private playSound() {
    try {
      const audio = new Audio('assets/audio/sound.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {}
  }

  addCalendarAlert(eventId: string, eventTitle: string, eventTime: Date, offsetMinutes: number) {
    const triggerTime = new Date(eventTime.getTime() - offsetMinutes * 60000);
    const current = this.activeAlerts();
    if (current.some(a => a.eventId === eventId && a.offsetMinutes === offsetMinutes)) return;

    const newAlert: CalendarAlert = {
      id: Math.random().toString(36).slice(2, 11),
      eventId,
      eventTitle,
      triggerTime,
      offsetMinutes,
      triggered: false,
    };
    this.activeAlerts.update(list => {
      const updated = [...list, newAlert];
      localStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  removeCalendarAlert(eventId: string) {
    this.activeAlerts.update(list => {
      const updated = list.filter(a => a.eventId !== eventId);
      localStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  private loadAlerts() {
    try {
      const saved = localStorage.getItem(ALERTS_KEY);
      if (saved) {
        const list = JSON.parse(saved);
        this.activeAlerts.set(list.map((a: any) => ({ ...a, triggerTime: new Date(a.triggerTime) })));
      }
    } catch (e) {
      console.warn('Error reading alerts', e);
    }
  }

  private checkCalendarAlerts() {
    const now = new Date();
    let changed = false;
    this.activeAlerts.update(list => {
      return list.map(alert => {
        if (!alert.triggered && now >= alert.triggerTime) {
          const message = alert.offsetMinutes === 0
            ? `The event "${alert.eventTitle}" is happening now!`
            : `The event "${alert.eventTitle}" starts in ${alert.offsetMinutes} minutes!`;
          this.addNotification('Calendar Alert 📅', message);
          changed = true;
          return { ...alert, triggered: true };
        }
        return alert;
      }).filter(a => !a.triggered);
    });
    if (changed) localStorage.setItem(ALERTS_KEY, JSON.stringify(this.activeAlerts()));
  }

  markAllAsRead() {
    let localChanged = false;
    this.localNotifications.update(list => list.map(n => {
      if (!n.read) { localChanged = true; return { ...n, read: true }; }
      return n;
    }));
    if (localChanged) this.persistLocal();

    if (this.serverNotifications().some(n => !n.read) && this.auth.isAuthenticated()) {
      this.http.post(`${this.apiUrl}/read-all`, {}).subscribe({
        next: () => {
          this.serverNotifications.update(list => list.map(n => ({ ...n, read: true })));
        },
        error: () => {},
      });
    }
  }

  markOneAsRead(id: string) {
    const local = this.localNotifications().find(n => n.id === id);
    if (local) {
      if (!local.read) {
        this.localNotifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
        this.persistLocal();
      }
      return;
    }
    if (!this.auth.isAuthenticated()) return;
    const target = this.serverNotifications().find(n => n.id === id);
    if (!target || target.read) return;
    this.http.post(`${this.apiUrl}/${id}/read`, {}).subscribe({
      next: () => {
        this.serverNotifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
      },
      error: () => {},
    });
  }

  clearAll() {
    this.localNotifications.set([]);
    this.persistLocal();
    if (this.auth.isAuthenticated()) {
      this.http.delete(this.apiUrl).subscribe({
        next: () => this.serverNotifications.set([]),
        error: () => {},
      });
    } else {
      this.serverNotifications.set([]);
    }
  }
}
