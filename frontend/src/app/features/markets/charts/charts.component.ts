import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription, forkJoin, of, timer } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';
import {
  searchMarketsSymbols,
  getShorthandSymbol,
  type MarketsSymbolResult,
} from '../symbol-search.helper';

declare const TradingView: any;

export interface WatchRow {
  tvSymbol: string;
  label: string;
  quoteSymbol?: string;
  last: number | null;
  chgPct: number | null;
}

export interface WatchlistGroup {
  id: string;
  label: string;
  rows: WatchRow[];
}

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.css'],
})
export class ChartsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('searchWrap') searchWrap!: ElementRef<HTMLElement>;

  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private readonly finnhubKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  private readonly coinGeckoApiKey = 'CG-T7BjzNAbWJhwFMvvbj4sM8Mp';

  readonly containerId = 'tv_charts_workspace';

  private tvWidget: any = null;
  private searchSub: Subscription | null = null;
  private searchSubject = new Subject<string>();
  private watchlistTimerSub: Subscription | null = null;
  private clockTimerSub: Subscription | null = null;

  currentTvSymbol = 'BINANCE:BTCUSD';
  displaySymbol = 'BTC / USD';
  searchQuery = '';
  searchResults: MarketsSymbolResult[] = [];
  showSearchModal = false;
  assetNotSupported = false;

  selectedInterval = '240';
  selectedTimezone = 'Etc/UTC';
  selectedChartStyle = '1';

  nowLabel = '';
  marketOpen = false;

  readonly intervals: { id: string; label: string }[] = [
    { id: '1', label: '1m' },
    { id: '5', label: '5m' },
    { id: '15', label: '15m' },
    { id: '60', label: '1h' },
    { id: '240', label: '4h' },
    { id: 'D', label: 'D' },
    { id: 'W', label: 'S' },
  ];

  readonly chartStyles: { id: string; label: string; icon: string }[] = [
    { id: '1', label: 'Velas', icon: 'candlestick_chart' },
    { id: '2', label: 'Línea', icon: 'show_chart' },
    { id: '0', label: 'Barras', icon: 'bar_chart' },
    { id: '3', label: 'Área', icon: 'area_chart' },
  ];

  readonly timezones: { id: string; label: string }[] = [
    { id: 'Etc/UTC', label: 'UTC' },
    { id: 'Europe/Madrid', label: 'Madrid' },
    { id: 'Europe/London', label: 'Londres' },
    { id: 'America/New_York', label: 'Nueva York' },
    { id: 'America/Los_Angeles', label: 'Los Ángeles' },
    { id: 'Asia/Tokyo', label: 'Tokio' },
  ];

  watchlistGroups: WatchlistGroup[] = [];

  ngOnInit(): void {
    this.watchlistGroups = [
      {
        id: 'indices',
        label: 'Índices',
        rows: [
          { tvSymbol: 'SP:SPX', label: 'SPX', quoteSymbol: '^GSPC', last: null, chgPct: null },
          { tvSymbol: 'NASDAQ:NDX', label: 'NDX', quoteSymbol: '^IXIC', last: null, chgPct: null },
          { tvSymbol: 'DJ:DJI', label: 'DJI', quoteSymbol: '^DJI', last: null, chgPct: null },
          { tvSymbol: 'CBOE:VIX', label: 'VIX', quoteSymbol: '^VIX', last: null, chgPct: null },
          { tvSymbol: 'TVC:DXY', label: 'DXY', quoteSymbol: 'DXY', last: null, chgPct: null },
        ],
      },
      {
        id: 'stocks',
        label: 'Stocks',
        rows: [
          { tvSymbol: 'NASDAQ:AAPL', label: 'AAPL', quoteSymbol: 'AAPL', last: null, chgPct: null },
          { tvSymbol: 'NASDAQ:TSLA', label: 'TSLA', quoteSymbol: 'TSLA', last: null, chgPct: null },
          { tvSymbol: 'NASDAQ:NFLX', label: 'NFLX', quoteSymbol: 'NFLX', last: null, chgPct: null },
        ],
      },
      {
        id: 'futures',
        label: 'Futuros / Metales',
        rows: [
          { tvSymbol: 'TVC:USOIL', label: 'USOIL', quoteSymbol: 'CL', last: null, chgPct: null },
          { tvSymbol: 'OANDA:XAUUSD', label: 'GOLD', quoteSymbol: 'OANDA:XAU_USD', last: null, chgPct: null },
          { tvSymbol: 'OANDA:XAGUSD', label: 'SILVER', quoteSymbol: 'OANDA:XAG_USD', last: null, chgPct: null },
        ],
      },
      {
        id: 'forex',
        label: 'Forex',
        rows: [
          { tvSymbol: 'FX:EURUSD', label: 'EURUSD', quoteSymbol: 'OANDA:EUR_USD', last: null, chgPct: null },
          { tvSymbol: 'FX:GBPUSD', label: 'GBPUSD', quoteSymbol: 'OANDA:GBP_USD', last: null, chgPct: null },
          { tvSymbol: 'FX:USDJPY', label: 'USDJPY', quoteSymbol: 'OANDA:USD_JPY', last: null, chgPct: null },
        ],
      },
      {
        id: 'crypto',
        label: 'Cripto',
        rows: [
          { tvSymbol: 'BINANCE:BTCUSD', label: 'BTCUSD', quoteSymbol: 'BINANCE:BTCUSDT', last: null, chgPct: null },
          { tvSymbol: 'BINANCE:ETHUSD', label: 'ETHUSD', quoteSymbol: 'BINANCE:ETHUSDT', last: null, chgPct: null },
          { tvSymbol: 'BINANCE:SOLUSD', label: 'SOLUSD', quoteSymbol: 'BINANCE:SOLUSDT', last: null, chgPct: null },
        ],
      },
    ];

    this.searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((q) => this.runSearch(q));

    this.watchlistTimerSub = timer(0, 45_000).subscribe(() => this.refreshWatchlistPrices());
    this.clockTimerSub = timer(0, 1000).subscribe(() => this.tickClock());
  }

  ngAfterViewInit(): void {
    this.mountTradingView();
  }

  ngOnDestroy(): void {
    this.destroyTradingView();
    this.searchSub?.unsubscribe();
    this.watchlistTimerSub?.unsubscribe();
    this.clockTimerSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: Event): void {
    if (
      this.showSearchModal &&
      this.searchWrap &&
      !this.searchWrap.nativeElement.contains(ev.target as Node)
    ) {
      this.showSearchModal = false;
      this.cdr.markForCheck();
    }
  }

  isRowActive(row: WatchRow): boolean {
    if (row.tvSymbol === this.currentTvSymbol) return true;
    const strip = (s: string) =>
      s
        .toUpperCase()
        .replace(/^CRYPTO:/, '')
        .replace(/^BINANCE:/, '');
    return strip(row.tvSymbol) === strip(this.currentTvSymbol) && strip(row.tvSymbol).length > 0;
  }

  private tickClock(): void {
    const tz = this.selectedTimezone;
    try {
      this.nowLabel = new Intl.DateTimeFormat('es-ES', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());
    } catch {
      this.nowLabel = new Date().toLocaleTimeString('es-ES');
    }
    this.marketOpen = this.computeUsEquitySession();
    this.cdr.markForCheck();
  }

  private computeUsEquitySession(): boolean {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
    if (wd === 'Sat' || wd === 'Sun') return false;
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    const mins = h * 60 + m;
    const open = 9 * 60 + 30;
    const close = 16 * 60;
    return mins >= open && mins < close;
  }

  private refreshWatchlistPrices(): void {
    const targets: { sym: string; rows: WatchRow[] }[] = [];
    const map = new Map<string, WatchRow[]>();
    for (const g of this.watchlistGroups) {
      for (const r of g.rows) {
        if (!r.quoteSymbol) continue;
        const list = map.get(r.quoteSymbol) ?? [];
        list.push(r);
        map.set(r.quoteSymbol, list);
      }
    }
    for (const [sym, rows] of map) targets.push({ sym, rows });

    if (!targets.length) return;

    forkJoin(
      targets.map((t) =>
        this.http
          .get(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(t.sym)}&token=${this.finnhubKey}`)
          .pipe(catchError(() => of(null)))
      )
    ).subscribe((responses) => {
      responses.forEach((data, i) => {
        const rows = targets[i].rows;
        if (!data || typeof data !== 'object') {
          return;
        }
        const q = data as { c?: number; dp?: number; pc?: number };
        let dp = q.dp ?? 0;
        if (dp === 0 && q.pc && q.c) dp = ((q.c - q.pc) / q.pc) * 100;
        for (const r of rows) {
          r.last = typeof q.c === 'number' && q.c > 0 ? q.c : null;
          r.chgPct = typeof dp === 'number' ? dp : null;
        }
      });
      this.cdr.markForCheck();
    });
  }

  onSearchModelChange(raw: string): void {
    this.searchQuery = raw;
    if (raw.length < 1) {
      this.showPopular();
      return;
    }
    this.searchSubject.next(raw);
  }

  onSearchFocus(): void {
    this.showPopular();
  }

  submitSearch(): void {
    this.onEnterSearch(this.searchQuery);
    this.searchQuery = '';
  }

  private showPopular(): void {
    this.searchResults = this.watchlistGroups.flatMap((g) =>
      g.rows.map((r) => ({
        symbol: r.tvSymbol,
        apiSymbol: r.label,
        description: g.label,
        type: 'WATCH',
        source: 'watchlist',
      }))
    );
    this.showSearchModal = true;
    this.cdr.markForCheck();
  }

  private runSearch(query: string): void {
    searchMarketsSymbols(this.http, query, this.coinGeckoApiKey).subscribe((res) => {
      this.searchResults = res;
      this.showSearchModal = true;
      this.cdr.markForCheck();
    });
  }

  onEnterSearch(raw: string): void {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const quick = getShorthandSymbol(trimmed);
    if (quick) {
      this.applySearchResult(quick);
      return;
    }

    const q = trimmed.toUpperCase();
    const fromList = this.searchResults.find(
      (r) =>
        r.symbol?.toUpperCase().includes(q) ||
        r.description?.toUpperCase().includes(q) ||
        r.apiSymbol?.toUpperCase().includes(q)
    );
    if (fromList) {
      this.applySearchResult(fromList);
      return;
    }

    searchMarketsSymbols(this.http, trimmed, this.coinGeckoApiKey).subscribe((results) => {
      const fresh =
        results.find(
          (r) =>
            r.symbol?.toUpperCase().includes(q) ||
            r.description?.toUpperCase().includes(q) ||
            r.apiSymbol?.toUpperCase().includes(q)
        ) ?? results[0];

      if (fresh) this.applySearchResult(fresh);
      else {
        this.assetNotSupported = true;
        this.showSearchModal = false;
      }
      this.cdr.markForCheck();
    });
  }

  applySearchResult(r: MarketsSymbolResult): void {
    this.assetNotSupported = false;
    this.currentTvSymbol = r.symbol;
    this.displaySymbol = this.formatDisplaySymbol(r.symbol);
    this.showSearchModal = false;
    this.searchQuery = '';
    this.pushSymbolToChart();
    this.cdr.markForCheck();
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    this.cdr.markForCheck();
  }

  selectFromWatch(row: WatchRow): void {
    this.assetNotSupported = false;
    this.currentTvSymbol = row.tvSymbol;
    this.displaySymbol = row.label;
    this.pushSymbolToChart();
    this.cdr.markForCheck();
  }

  setInterval(iv: string): void {
    this.selectedInterval = iv;
    this.pushSymbolToChart();
  }

  setChartStyle(id: string): void {
    if (this.selectedChartStyle === id) return;
    this.selectedChartStyle = id;
    this.mountTradingView();
  }

  onTimezoneChange(tz: string): void {
    this.selectedTimezone = tz;
    this.mountTradingView();
  }

  private formatDisplaySymbol(symbol: string): string {
    if (symbol === 'SPY') return 'S&P 500 (SPY)';
    if (symbol === 'QQQ') return 'NASDAQ 100 (QQQ)';
    if (symbol.includes('BTC') || symbol.includes('ETH')) {
      return symbol
        .replace('BINANCE:', '')
        .replace('CRYPTO:', '')
        .replace('USDT', ' / USD')
        .replace('USD', ' / USD');
    }
    if (symbol.includes('FX:EURUSD')) return 'EUR / USD';
    if (symbol.includes('XAUUSD')) return 'GOLD (XAU)';
    if (symbol.includes('USOIL')) return 'CRUDE OIL (WTI)';
    return symbol.split(':').pop() || symbol;
  }

  private pushSymbolToChart(): void {
    if (this.tvWidget && typeof this.tvWidget.setSymbol === 'function') {
      try {
        this.tvWidget.setSymbol(this.currentTvSymbol, this.selectedInterval, () => undefined);
        return;
      } catch {
        /* fallthrough */
      }
    }
    this.mountTradingView();
  }

  private destroyTradingView(): void {
    if (this.tvWidget && typeof this.tvWidget.remove === 'function') {
      try {
        this.tvWidget.remove();
      } catch {
        /* ignore */
      }
    }
    this.tvWidget = null;
    const host = document.getElementById(this.containerId);
    if (host) host.innerHTML = '';
  }

  private mountTradingView(): void {
    if (typeof TradingView === 'undefined') {
      return;
    }
    this.destroyTradingView();

    this.tvWidget = new TradingView.widget({
      container_id: this.containerId,
      autosize: true,
      symbol: this.currentTvSymbol,
      interval: this.selectedInterval,
      timezone: this.selectedTimezone,
      theme: 'light',
      style: this.selectedChartStyle,
      locale: 'es',
      enable_publishing: false,
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      hide_legend: false,
      save_image: true,
      calendar: true,
      details: true,
      hotlist: false,
      withdateranges: true,
      header_widget_buttons: true,
      studies_overrides: {},
      overrides: {
        'mainSeriesProperties.candleStyle.upColor': '#006c49',
        'mainSeriesProperties.candleStyle.downColor': '#e11d48',
        'mainSeriesProperties.candleStyle.borderUpColor': '#006c49',
        'mainSeriesProperties.candleStyle.borderDownColor': '#e11d48',
        'mainSeriesProperties.candleStyle.wickUpColor': '#006c49',
        'mainSeriesProperties.candleStyle.wickDownColor': '#e11d48',
      },
      toolbar_bg: '#ffffff',
      loading_screen: { backgroundColor: '#f7f9fb' },
    });
  }

  dismissAssetError(): void {
    this.assetNotSupported = false;
    this.cdr.markForCheck();
  }

  onTradeClick(): void {
    this.toast.show('La ejecución de órdenes con bróker no está integrada en MarketHub.', 'info');
  }

  onPublishClick(): void {
    this.toast.show('Lleva tu gráfico al foro: publica en Comunidad cuando quieras compartir el análisis.', 'info');
    void this.router.navigate(['/community']);
  }

  chgClass(v: number | null): string {
    if (v === null || Number.isNaN(v)) return 'chg-neutral';
    if (v > 0) return 'chg-up';
    if (v < 0) return 'chg-down';
    return 'chg-neutral';
  }
}
