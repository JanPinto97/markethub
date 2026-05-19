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
  DestroyRef
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription, forkJoin, of, timer } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SmartMarketService } from '../services/smart-market.service';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationService } from '../../../core/services/notification.service';
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
  private readonly smartMarket = inject(SmartMarketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  private readonly finnhubKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  private readonly coinGeckoApiKey = 'CG-T7BjzNAbWJhwFMvvbj4sM8Mp';

  readonly containerId = 'tv_charts_workspace';

  private tvWidget: any = null;
  private searchSub: Subscription | null = null;
  private searchSubject = new Subject<string>();
  private clockTimerSub: Subscription | null = null;

  showIndicatorsMenu = false;
  showScreenshotMenu = false;
  activeStudies: string[] = [];

  readonly indicatorsList = [
    { group: 'Trend and Moving Averages', items: [
      { id: 'MAExp@tv-basicstudies', label: 'Exponential Moving Average (EMA)' },
      { id: 'MASimple@tv-basicstudies', label: 'Moving Average (SMA)' },
      { id: 'StochasticRSI@tv-basicstudies', label: 'Stochastic RSI' },
      { id: 'BollingerBands@tv-basicstudies', label: 'Bollinger Bands' }
    ]},
    { group: 'Oscillators and Momentum', items: [
      { id: 'RSI@tv-basicstudies', label: 'Relative Strength Index (RSI)' },
      { id: 'MACD@tv-basicstudies', label: 'MACD' },
      { id: 'Stochastic@tv-basicstudies', label: 'Stochastic' }
    ]},
    { group: 'Volume', items: [
      { id: 'Volume@tv-basicstudies', label: 'Volume' }
    ]}
  ];

  currentTvSymbol = 'BINANCE:BTCUSD';
  displaySymbol = 'BTC / USD';
  searchQuery = '';
  searchResults: any[] = [];
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
    { id: '30', label: '30m' },
    { id: '60', label: '1h' },
    { id: '240', label: '4h' },
    { id: 'D', label: 'D' },
    { id: 'W', label: 'W' },
    { id: '1M', label: '1M' },
    { id: '3M', label: '3M' },
    { id: '12M', label: '12M' },
  ];

  readonly chartStyles: { id: string; label: string; icon: string }[] = [
    { id: '1', label: 'Candlestick', icon: 'candlestick_chart' },
    { id: '2', label: 'Line', icon: 'show_chart' },
    { id: '0', label: 'Bar', icon: 'bar_chart' },
    { id: '3', label: 'Area', icon: 'area_chart' },
  ];

  readonly timezones: { id: string; label: string }[] = [
    { id: 'Etc/UTC', label: 'UTC' },
    { id: 'Europe/Madrid', label: 'Madrid' },
    { id: 'Europe/London', label: 'London' },
    { id: 'America/New_York', label: 'New York' },
    { id: 'America/Los_Angeles', label: 'Los Angeles' },
    { id: 'Asia/Tokyo', label: 'Tokyo' },
  ];

  watchlistGroups: WatchlistGroup[] = [];
  
  ngOnInit(): void {
    // Forzar scroll al top al montar el componente de gráficos
    window.scrollTo(0, 0);

    this.watchlistGroups = [
      {
        id: 'indices',
        label: 'Indices',
        rows: [
          { tvSymbol: 'AMEX:SPY', label: 'SPY', quoteSymbol: 'SPY', last: null, chgPct: null },
          { tvSymbol: 'NASDAQ:QQQ', label: 'QQQ', quoteSymbol: 'QQQ', last: null, chgPct: null },
          { tvSymbol: 'AMEX:DIA', label: 'DIA', quoteSymbol: 'DIA', last: null, chgPct: null },
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
        label: 'Futures / Metals',
        rows: [
          { tvSymbol: 'TVC:USOIL', label: 'USOIL', quoteSymbol: 'USO', last: null, chgPct: null },
          { tvSymbol: 'OANDA:XAUUSD', label: 'GOLD', quoteSymbol: 'XAU/USD', last: null, chgPct: null },
        ],
      },
      {
        id: 'forex',
        label: 'Forex',
        rows: [
          { tvSymbol: 'FX:EURUSD', label: 'EURUSD', quoteSymbol: 'EUR/USD', last: null, chgPct: null },
          { tvSymbol: 'FX:GBPUSD', label: 'GBPUSD', quoteSymbol: 'GBP/USD', last: null, chgPct: null },
          { tvSymbol: 'FX:USDJPY', label: 'USDJPY', quoteSymbol: 'USD/JPY', last: null, chgPct: null },
        ],
      },
      {
        id: 'crypto',
        label: 'Crypto',
        rows: [
          { tvSymbol: 'BINANCE:BTCUSD', label: 'BTCUSD', quoteSymbol: 'bitcoin', last: null, chgPct: null },
          { tvSymbol: 'BINANCE:ETHUSD', label: 'ETHUSD', quoteSymbol: 'ethereum', last: null, chgPct: null },
          { tvSymbol: 'BINANCE:SOLUSD', label: 'SOLUSD', quoteSymbol: 'solana', last: null, chgPct: null },
        ],
      },
    ];

    // Hidratar Watchlist desde LocalStorage (Zero-Layout-Shift)
    this.watchlistGroups.forEach(group => {
      group.rows.forEach(row => {
        if (row.quoteSymbol) {
          const cached = this.smartMarket.getCachedPrice(row.quoteSymbol);
          if (cached && cached.c > 0) {
            row.last = cached.c;
            row.chgPct = cached.dp;
          }
        }
      });
    });

    this.searchSub = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((q) => this.runSearch(q));

    // Load saved studies and chart preferences from localStorage
    try {
      const saved = localStorage.getItem('markethub_charts_config');
      if (saved) {
        const config = JSON.parse(saved);
        this.activeStudies = config.studies || [];
        this.selectedInterval = config.interval || 'D';
        this.selectedChartStyle = config.chartStyle || '1';
        this.selectedTimezone = config.timezone || 'Etc/UTC';
      }
    } catch (e) {
      console.warn('Error loading chart config:', e);
    }

    // Sincronizar de forma reactiva con el activo activo global (Overview)
    this.smartMarket.selectedAsset$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(asset => {
      if (asset && asset.symbol && this.currentTvSymbol !== asset.symbol) {
        this.currentTvSymbol = asset.symbol;
        this.displaySymbol = asset.displaySymbol;
        this.pushSymbolToChart();
      }
    });

    this.initWatchlistStreams();
    this.clockTimerSub = timer(0, 1000).subscribe(() => this.tickClock());
  }

  private initWatchlistStreams(): void {
    // 1. Forex and Metals (Master TwelveData)
    this.smartMarket.getForexPricesBatch([])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        if (!data) return;
        this.updateRowsFromBatch(data, ['forex', 'futures']);
      });

    // 2. Indices and Stocks (Master Finnhub)
    this.smartMarket.getStocksPricesBatch()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        if (!data) return;
        this.updateRowsFromBatch(data, ['indices', 'stocks', 'futures']); // 'futures' contains USO which is handled by Finnhub now
      });

    // 3. Crypto (Master CoinGecko)
    this.smartMarket.getCryptoPrices([])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        if (!data) return;
        const cryptoGroup = this.watchlistGroups.find(g => g.id === 'crypto');
        if (cryptoGroup) {
          cryptoGroup.rows.forEach(row => {
            const info = data[row.quoteSymbol!];
            if (info) {
              row.last = info.usd;
              row.chgPct = info.usd_24h_change;
            }
          });
          this.cdr.detectChanges();
        }
      });
  }

  private updateRowsFromBatch(data: any, groupIds: string[]): void {
    this.watchlistGroups.forEach(group => {
      if (groupIds.includes(group.id)) {
        group.rows.forEach(row => {
          const quote = data[row.quoteSymbol!] || data;
          if (quote && quote.close) {
             row.last = parseFloat(quote.close);
             row.chgPct = parseFloat(quote.percent_change || 0);
          }
        });
      }
    });
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    this.mountTradingView();
  }

  ngOnDestroy(): void {
    this.destroyTradingView();
    this.searchSub?.unsubscribe();
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

    // Close indicators menu when clicking outside
    const indBtn = document.querySelector('.charts-indicators-btn');
    const indMenu = document.querySelector('.charts-indicators-dropdown');
    if (this.showIndicatorsMenu && indBtn && indMenu && !indBtn.contains(ev.target as Node) && !indMenu.contains(ev.target as Node)) {
      this.showIndicatorsMenu = false;
      this.cdr.markForCheck();
    }

    // Close screenshot menu when clicking outside
    const camBtn = document.querySelector('.charts-screenshot-btn');
    const camMenu = document.querySelector('.charts-screenshot-dropdown');
    if (this.showScreenshotMenu && camBtn && camMenu && !camBtn.contains(ev.target as Node) && !camMenu.contains(ev.target as Node)) {
      this.showScreenshotMenu = false;
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
    // Use price data from localStorage (shared with markets component) instead of making new API calls
    try {
      const saved = localStorage.getItem('markethub_state');
      if (!saved) return;

      const state = JSON.parse(saved);
      const tickerPrices = state.tickerPrices || {};

      for (const g of this.watchlistGroups) {
        for (const r of g.rows) {
          // Búsqueda multi-clave ULTRA-AGRESIVA para evitar el "-"
          const cleanTvSymbol = r.tvSymbol.split(':').pop() || '';
          const labelPart = r.label.includes('/') ? r.label : r.label.match(/[A-Z]+/g)?.join('/') || r.label;
          
          const priceData = 
            tickerPrices[r.tvSymbol] || 
            tickerPrices[r.quoteSymbol || ''] || 
            tickerPrices[r.label] ||
            tickerPrices[cleanTvSymbol] ||
            tickerPrices[labelPart] ||
            tickerPrices[r.label.replace('/', '')] ||
            tickerPrices[r.label.replace(' / ', '/')];

          if (priceData && priceData.price > 0) {
            r.last = priceData.price;
            r.chgPct = priceData.change || 0;
          }
        }
      }

      this.cdr.markForCheck();
    } catch (e) {
      console.error('Error loading watchlist prices from localStorage:', e);
    }
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
    // Trigger TradingView's native symbol search dialog
    if (this.tvWidget && typeof this.tvWidget.showSymbolSearchDialog === 'function') {
      try {
        this.tvWidget.showSymbolSearchDialog();
        return;
      } catch {
        /* fallback to custom modal */
      }
    }
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
    const blacklist = ['BINANCE:DXYUSD', 'CBOE:VIX', 'TVC:DXY', 'DXY', 'VIX'];
    searchMarketsSymbols(this.http, query, this.coinGeckoApiKey).subscribe((res) => {
      this.searchResults = res.filter(r => !blacklist.includes(r.symbol) && !blacklist.includes(r.apiSymbol));
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
    
    // Sincronizar con el estado global (Header)
    let source = 'finnhub';
    let cgId = '';
    if (r.symbol.includes('BINANCE') || r.symbol.includes('CRYPTO') || r.type?.toLowerCase() === 'crypto') {
      source = 'coingecko';
      cgId = r.apiSymbol?.toLowerCase() || ''; 
    }
    this.smartMarket.setActiveAsset({
      symbol: r.symbol,
      apiSymbol: r.apiSymbol || r.symbol,
      displaySymbol: this.displaySymbol,
      source: source,
      coingeckoId: cgId
    });

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
    
    // Sincronizar con el estado global (Header)
    let source = 'finnhub';
    let cgId = '';
    if (['BTCUSD', 'ETHUSD', 'SOLUSD'].includes(row.label)) {
      source = 'coingecko';
      cgId = row.quoteSymbol!;
    } else if (['EURUSD', 'GBPUSD', 'USDJPY', 'GOLD'].includes(row.label)) {
      source = 'twelvedata';
    }

    this.smartMarket.setActiveAsset({
      symbol: row.tvSymbol,
      apiSymbol: row.quoteSymbol || row.label,
      displaySymbol: row.label,
      source: source,
      coingeckoId: cgId
    });

    this.cdr.markForCheck();
  }

  setInterval(iv: string): void {
    this.selectedInterval = iv;
    this.saveChartConfig();
    this.pushSymbolToChart();
  }

  setChartStyle(id: string): void {
    if (this.selectedChartStyle === id) return;
    this.selectedChartStyle = id;
    this.saveChartConfig();
    this.mountTradingView();
  }

  onTimezoneChange(tz: string): void {
    this.selectedTimezone = tz;
    this.saveChartConfig();
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
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      hide_top_toolbar: true,
      hide_side_toolbar: false,
      hide_legend: false,
      details: false,
      calendar: false,
      hotlist: false,
      withdateranges: true,
      disabled_features: [
        "header_symbol_search",
        "header_indicators",
        "header_screenshot",
        "header_compare",
        "header_saveload",
        "header_chart_type",
        "header_interval_dialog_button",
        "header_undo_redo",
        "header_settings",
        "header_fullscreen_button",
        "volume_force_overlay",
        "create_volume_indicator_by_default",
        "header_widget"
      ],
      studies: this.activeStudies.length > 0 ? this.activeStudies : [], 
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
      loading_screen: { backgroundColor: '#ffffff', foregroundColor: '#006c49' },
    });
  }

  dismissAssetError(): void {
    this.assetNotSupported = false;
    this.cdr.markForCheck();
  }

  onTradeClick(): void {
    this.toast.show('Broker order execution is not integrated in MarketHub.', 'info');
  }

  openIndicators(): void {
    this.showIndicatorsMenu = !this.showIndicatorsMenu;
    this.cdr.markForCheck();
  }

  addIndicator(studyId: string): void {
    if (this.tvWidget) {
      try {
        // Guardamos el estudio único
        this.activeStudies = [studyId]; 
        this.saveChartConfig();
        
        // Destrucción y creación síncrona con limpieza forzada
        this.destroyTradingView();
        
        // El re-montaje síncrono suele ser más estable si el contenedor está en el DOM
        this.mountTradingView();
        
        const studyName = studyId.split('@')[0];
        this.toast.show(`Indicator applied: ${studyName}`, 'success');
        this.notificationService.addNotification(
          'Indicator Applied 📊',
          `Successfully applied the ${studyName} indicator on the ${this.displaySymbol} chart.`
        );
      } catch (e) {
        console.error('Error applying indicator:', e);
        this.mountTradingView();
      }
    }
    this.showIndicatorsMenu = false;
    this.cdr.markForCheck();
  }

  chgClass(v: number | null): string {
    if (v === null || Number.isNaN(v)) return 'chg-neutral';
    if (v > 0) return 'chg-up';
    if (v < 0) return 'chg-down';
    return 'chg-neutral';
  }

  private saveChartConfig(): void {
    localStorage.setItem('markethub_charts_config', JSON.stringify({
      studies: this.activeStudies,
      interval: this.selectedInterval,
      chartStyle: this.selectedChartStyle,
      timezone: this.selectedTimezone
    }));
  }
}
