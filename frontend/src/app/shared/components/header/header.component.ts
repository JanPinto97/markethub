import { Component, DestroyRef, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { getUsernameColor, getInitial } from '../../utils/color.utils';

interface MarketSchedule {
  label: string;
  timeZone: string;
  openH: number;
  openM: number;
  closeH: number;
  closeM: number;
  preMinutes: number;
  tzAbbr: string;
}

export interface MarketBadge {
  label: string;
  state: 'open' | 'pre' | 'closed';
  tooltip: string;
  scheduleLabel: string;
}

const MARKETS: MarketSchedule[] = [
  { label: 'TYO', timeZone: 'Asia/Tokyo',       openH: 9,  openM: 0,  closeH: 15, closeM: 30, preMinutes: 30, tzAbbr: 'JST' },
  { label: 'LON', timeZone: 'Europe/London',     openH: 8,  openM: 0,  closeH: 16, closeM: 30, preMinutes: 30, tzAbbr: 'GMT/BST' },
  { label: 'NYC', timeZone: 'America/New_York',  openH: 9,  openM: 30, closeH: 16, closeM: 0,  preMinutes: 30, tzAbbr: 'ET' },
];

function getLocalTime(tz: string): { h: number; m: number; dayOfWeek: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short'
  }).formatToParts(now);

  let h = 0, m = 0, dayStr = '';
  for (const p of parts) {
    if (p.type === 'hour') h = parseInt(p.value, 10);
    if (p.type === 'minute') m = parseInt(p.value, 10);
    if (p.type === 'weekday') dayStr = p.value;
  }
  if (h === 24) h = 0;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { h, m, dayOfWeek: dayMap[dayStr] ?? 0 };
}

function toMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function formatDuration(mins: number): string {
  if (mins <= 0) return '< 1m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function localToUtc(h: number, m: number, tz: string): { h: number; m: number } {
  const now = new Date();
  const refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const localStr = refDate.toLocaleString('en-US', { timeZone: tz });
  const utcStr = refDate.toLocaleString('en-US', { timeZone: 'UTC' });
  const localRef = new Date(localStr);
  const utcRef = new Date(utcStr);
  const offsetMs = localRef.getTime() - utcRef.getTime();
  const totalMin = h * 60 + m - Math.round(offsetMs / 60000);
  const normalized = ((totalMin % 1440) + 1440) % 1440;
  return { h: Math.floor(normalized / 60), m: normalized % 60 };
}

function computeBadge(market: MarketSchedule): MarketBadge {
  const { h, m, dayOfWeek } = getLocalTime(market.timeZone);
  const now = toMinutes(h, m);
  const open = toMinutes(market.openH, market.openM);
  const close = toMinutes(market.closeH, market.closeM);
  const preOpen = open - market.preMinutes;
  const openUtc = localToUtc(market.openH, market.openM, market.timeZone);
  const closeUtc = localToUtc(market.closeH, market.closeM, market.timeZone);
  const scheduleLabel = `${padTime(openUtc.h, openUtc.m)} – ${padTime(closeUtc.h, closeUtc.m)} UTC`;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (!isWeekend && now >= open && now < close) {
    const remaining = close - now;
    return { label: market.label, state: 'open', tooltip: `Closes in ${formatDuration(remaining)}`, scheduleLabel };
  }

  if (!isWeekend && now >= preOpen && now < open) {
    const remaining = open - now;
    return { label: market.label, state: 'pre', tooltip: `Opens in ${formatDuration(remaining)}`, scheduleLabel };
  }

  let minsUntilOpen: number;
  if (!isWeekend && now < preOpen) {
    minsUntilOpen = open - now;
  } else {
    const minsLeftToday = 1440 - now;
    let daysUntilOpen: number;
    if (dayOfWeek === 6) daysUntilOpen = 2;
    else if (dayOfWeek === 0) daysUntilOpen = 1;
    else daysUntilOpen = (dayOfWeek === 5 && now >= close) ? 3 : 1;

    if (!isWeekend && now >= close && dayOfWeek < 5) {
      daysUntilOpen = 1;
    } else if (dayOfWeek === 5 && now >= close) {
      daysUntilOpen = 3;
    }

    minsUntilOpen = minsLeftToday + (daysUntilOpen - 1) * 1440 + open;
  }

  return { label: market.label, state: 'closed', tooltip: `Opens in ${formatDuration(minsUntilOpen)}`, scheduleLabel };
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MediaUrlPipe, DatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  auth = inject(AuthService);
  notifService = inject(NotificationService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  menuOpen = signal(false);
  mobileMenuOpen = signal(false);
  notifOpen = signal(false);
  
  marketBadges = signal<MarketBadge[]>([]);
  expandedBadge = signal<string | null>(null);

  getUsernameColor = getUsernameColor;
  getInitial = getInitial;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.refreshMarkets();
    this.intervalId = setInterval(() => this.refreshMarkets(), 60_000);
    this.destroyRef.onDestroy(() => {
      if (this.intervalId) clearInterval(this.intervalId);
    });
  }

  private refreshMarkets() {
    this.marketBadges.set(MARKETS.map(computeBadge));
  }

  initials(username?: string | null): string {
    if (!username) return '?';
    const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuOpen.update(v => !v);
    if (this.menuOpen()) {
      this.closeNotifications();
    }
  }

  toggleMobileMenu(event: Event) {
    event.stopPropagation();
    this.mobileMenuOpen.update(v => !v);
    if (!this.mobileMenuOpen()) this.expandedBadge.set(null);
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.notifOpen.update(v => !v);
    if (this.notifOpen()) {
      this.menuOpen.set(false);
    } else {
      // Mark as read when closing manually via toggle
      this.notifService.markAllAsRead();
    }
  }

  markAllAsRead(event: Event) {
    event.stopPropagation();
    this.notifService.markAllAsRead();
  }

  clearAll(event: Event) {
    event.stopPropagation();
    this.notifService.clearAll();
  }

  closeNotifications() {
    if (this.notifOpen()) {
      this.notifOpen.set(false);
      this.notifService.markAllAsRead();
    }
  }

  toggleBadge(label: string) {
    this.expandedBadge.update(v => v === label ? null : label);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node;
    
    // Check if clicked outside of header component entirely
    if (!this.host.nativeElement.contains(target)) {
      if (this.menuOpen()) this.menuOpen.set(false);
      if (this.mobileMenuOpen()) this.mobileMenuOpen.set(false);
      if (this.notifOpen()) this.closeNotifications();
      return;
    }

    // Inside header but outside notification wrap
    const notifWrap = this.host.nativeElement.querySelector('.notif-wrap');
    if (this.notifOpen() && notifWrap && !notifWrap.contains(target)) {
      this.closeNotifications();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.menuOpen.set(false);
    this.mobileMenuOpen.set(false);
    this.closeNotifications();
  }

  goToProfile() {
    const username = this.auth.currentUser()?.username;
    if (username) {
      this.router.navigate(['/profile', username]);
    }
    this.closeMenu();
  }

  logout() {
    this.closeMenu();
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/'])
    });
  }
}
