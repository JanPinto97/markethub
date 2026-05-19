import { Injectable, signal } from '@angular/core';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

export interface CalendarAlert {
  id: string;
  eventId: string;
  eventTitle: string;
  triggerTime: Date;
  offsetMinutes: number;
  triggered: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<NotificationItem[]>([
    { id: '1', title: 'Market Alert', message: 'NVIDIA (NVDA) is up over 5% today.', time: new Date(), read: false },
    { id: '2', title: 'Platform Update', message: 'Welcome to MarketHub 2.0. Check out the new real-time Charts.', time: new Date(Date.now() - 3600000), read: false }
  ]);
  
  readonly unreadCount = signal<number>(2);
  readonly activeAlerts = signal<CalendarAlert[]>([]);

  constructor() {
    try {
      const savedNotifs = localStorage.getItem('markethub_notifications');
      if (savedNotifs) {
        const list = JSON.parse(savedNotifs);
        this.notifications.set(list.map((n: any) => ({ ...n, time: new Date(n.time) })));
      } else {
        localStorage.setItem('markethub_notifications', JSON.stringify(this.notifications()));
      }
      this.updateUnreadCount();

      const savedAlerts = localStorage.getItem('markethub_calendar_alerts');
      if (savedAlerts) {
        const list = JSON.parse(savedAlerts);
        this.activeAlerts.set(list.map((a: any) => ({ ...a, triggerTime: new Date(a.triggerTime) })));
      }
    } catch (e) {
      console.warn('Error reading notifications/alerts from localStorage', e);
    }

    // Cronjob cada 10 segundos para verificar disparadores de alertas de calendario
    setInterval(() => {
      this.checkCalendarAlerts();
    }, 10000);
  }

  addNotification(title: string, message: string) {
    const newNotif: NotificationItem = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      time: new Date(),
      read: false
    };
    this.notifications.update(list => {
      const updated = [newNotif, ...list];
      localStorage.setItem('markethub_notifications', JSON.stringify(updated));
      return updated;
    });
    this.updateUnreadCount();
    this.playSound();
  }

  private playSound() {
    try {
      const audio = new Audio('assets/audio/sound.mp3');
      audio.volume = 0.4;
      audio.play().catch(e => {
        console.warn('Audio auto-play blocked or failed:', e);
      });
    } catch (e) {
      console.warn('Audio element initialization failed:', e);
    }
  }

  addCalendarAlert(eventId: string, eventTitle: string, eventTime: Date, offsetMinutes: number) {
    const triggerTime = new Date(eventTime.getTime() - offsetMinutes * 60000);
    
    // Evitar duplicados para el mismo evento con el mismo offset
    const current = this.activeAlerts();
    if (current.some(a => a.eventId === eventId && a.offsetMinutes === offsetMinutes)) {
      return;
    }

    const newAlert: CalendarAlert = {
      id: Math.random().toString(36).substr(2, 9),
      eventId,
      eventTitle,
      triggerTime,
      offsetMinutes,
      triggered: false
    };

    this.activeAlerts.update(list => {
      const updated = [...list, newAlert];
      localStorage.setItem('markethub_calendar_alerts', JSON.stringify(updated));
      return updated;
    });
  }

  removeCalendarAlert(eventId: string) {
    this.activeAlerts.update(list => {
      const updated = list.filter(a => a.eventId !== eventId);
      localStorage.setItem('markethub_calendar_alerts', JSON.stringify(updated));
      return updated;
    });
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
      }).filter(alert => !alert.triggered);
    });

    if (changed) {
      localStorage.setItem('markethub_calendar_alerts', JSON.stringify(this.activeAlerts()));
    }
  }

  markAllAsRead() {
    let changed = false;
    this.notifications.update(list => {
      return list.map(n => {
        if (!n.read) {
          changed = true;
          return { ...n, read: true };
        }
        return n;
      });
    });
    if (changed) {
      localStorage.setItem('markethub_notifications', JSON.stringify(this.notifications()));
      this.updateUnreadCount();
    }
  }

  clearAll() {
    this.notifications.set([]);
    this.updateUnreadCount();
    localStorage.setItem('markethub_notifications', JSON.stringify([]));
  }

  private updateUnreadCount() {
    const count = this.notifications().filter(n => !n.read).length;
    this.unreadCount.set(count);
  }
}
