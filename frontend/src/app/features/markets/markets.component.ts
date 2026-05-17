import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef, HostListener, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { MarketService } from '../../core/services/market.service';
import { SmartMarketService } from './services/smart-market.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, timeout } from 'rxjs/operators';
import { EconomicCalendarComponent } from './economic-calendar/economic-calendar.component';
import { MarketNewsComponent } from './market-news/market-news.component';
import { ChartsComponent } from './charts/charts.component';

declare const TradingView: any;

@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe, DatePipe, EconomicCalendarComponent, MarketNewsComponent, ChartsComponent],
  templateUrl: './markets.component.html',
  styleUrls: ['./markets.component.css']
})
export class MarketsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('symbolInput') symbolInput!: ElementRef;
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  // CONFIGURACIÓN (Servicios Centralizados)
  private smartMarket = inject(SmartMarketService);
  private destroyRef = inject(DestroyRef);
  private mainPriceSub?: Subscription;
  private stockRestSub?: Subscription; // Suscripción separada para el timer REST de Finnhub

  // Mapa de traducción: Cualquier forma de nombre cripto -> ID CoinGecko
  private readonly COINGECKO_ID_MAP: { [key: string]: string } = {
    'bitcoin': 'bitcoin', 'btc/usd': 'bitcoin', 'btcusd': 'bitcoin', 'btc': 'bitcoin',
    'ethereum': 'ethereum', 'eth/usd': 'ethereum', 'ethusd': 'ethereum', 'eth': 'ethereum',
    'solana': 'solana', 'sol/usd': 'solana', 'solusd': 'solana', 'sol': 'solana',
    'binancecoin': 'binancecoin', 'bnb/usd': 'binancecoin', 'bnbusd': 'binancecoin',
    'ripple': 'ripple', 'xrp/usd': 'ripple', 'xrpusd': 'ripple', 'xrp': 'ripple',
    'cardano': 'cardano', 'ada/usd': 'cardano', 'adausd': 'cardano', 'ada': 'cardano',
    'dogecoin': 'dogecoin', 'doge/usd': 'dogecoin', 'dogeusd': 'dogecoin', 'doge': 'dogecoin',
    'polkadot': 'polkadot', 'dot/usd': 'polkadot', 'dotusd': 'polkadot', 'dot': 'polkadot',
    'avalanche-2': 'avalanche-2', 'avax/usd': 'avalanche-2', 'avaxusd': 'avalanche-2',
    'chainlink': 'chainlink', 'link/usd': 'chainlink', 'linkusd': 'chainlink',
    'shiba-inu': 'shiba-inu', 'shib/usd': 'shiba-inu', 'shibusd': 'shiba-inu',
    'litecoin': 'litecoin', 'ltc/usd': 'litecoin', 'ltcusd': 'litecoin', 'ltc': 'litecoin',
  };

  private resolveCoingeckoId(rawId: string): string {
    return this.COINGECKO_ID_MAP[rawId.toLowerCase()] || rawId.toLowerCase();
  }

  // API Keys para Noticias, Calendario y Búsqueda
  private apiKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0'; 
  private newsDataKey = 'pub_51b0bb5e9a054ff19dbd2272f643fef5';
  private marketauxKey = 'TUzZlehn8kwZmGgBBbQW4Rmzds6ZRYLwwRdd8VO1';
  private tiingoApiKey = '07705bf17ddd89eb11ea83b95d01042a522162a9';
  private rapidApiKey = '1e856b26f1msh7ff07161e81308ep1bec53jsn7edd8d75b995';
  private rapidApiHost = 'yahoo-finance15.p.rapidapi.com';
  private coinGeckoApiKey = 'CG-T7BjzNAbWJhwFMvvbj4sM8Mp';
  
  widget: any;
  currentSymbol: string = 'BINANCE:BTCUSD';
  displaySymbol: string = 'BTC / USD';
  currentApiSymbol: string = 'BTC/USD';
  currentSource: string = 'coingecko';
  currentCoingeckoId: string = 'bitcoin';
  currentPriceData: any = { c: 0, dp: 0 };
  assetNotSupported: boolean = false;
  currentYear = new Date().getFullYear();
  selectedDate: Date = new Date();
  lastSentimentUpdate: string = '';
  private clockInterval: any;
  private refreshInterval: any;
  private searchSubject = new Subject<string>();
  
  // 1. SÍMBOLOS Y ETIQUETAS (Arquitectura Inteligente: Finnhub, TwelveData, Synthetic, CoinGecko)
  coins: any[] = [
    { symbol: 'BTC/USD', tech: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD', source: 'coingecko', coingeckoId: 'bitcoin', price: 0, change: 0 },
    { symbol: 'ETH/USD', tech: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD', source: 'coingecko', coingeckoId: 'ethereum', price: 0, change: 0 },
    { symbol: 'SOL/USD', tech: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD', source: 'coingecko', coingeckoId: 'solana', price: 0, change: 0 },
    { symbol: 'EUR/USD', tech: 'FX:EURUSD', apiSymbol: 'EUR/USD', source: 'twelvedata', price: 0, change: 0 }, 
    { symbol: 'GBP/USD', tech: 'FX:GBPUSD', apiSymbol: 'GBP/USD', source: 'twelvedata', price: 0, change: 0 },
    { symbol: 'USD/JPY', tech: 'FX:USDJPY', apiSymbol: 'USD/JPY', source: 'twelvedata', price: 0, change: 0 },
    { symbol: 'S&P 500 (SPY)', tech: 'AMEX:SPY', apiSymbol: 'SPY', source: 'finnhub', price: 0, change: 0 },       
    { symbol: 'NASDAQ 100 (QQQ)', tech: 'NASDAQ:QQQ', apiSymbol: 'QQQ', source: 'finnhub', price: 0, change: 0 },      
    { symbol: 'DOW JONES (DIA)', tech: 'AMEX:DIA', apiSymbol: 'DIA', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'GOLD (XAU)', tech: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD', source: 'twelvedata', price: 0, change: 0 }, 
    { symbol: 'AAPL', tech: 'NASDAQ:AAPL', apiSymbol: 'AAPL', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'NVDA', tech: 'NASDAQ:NVDA', apiSymbol: 'NVDA', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'TSLA', tech: 'NASDAQ:TSLA', apiSymbol: 'TSLA', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'NFLX', tech: 'NASDAQ:NFLX', apiSymbol: 'NFLX', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'CRUDE OIL (WTI)', tech: 'TVC:USOIL', apiSymbol: 'USO', source: 'finnhub_synthetic_wti', price: 0, change: 0 }
  ];

  searchResults: any[] = [];
  showSearchModal: boolean = false;
  searchQuery: string = '';
  
  economicEvents: any[] = [];
  filteredEvents: any[] = [];
  marketNews: any[] = [];
  sentimentData: any = { value: 0, value_classification: '...' };
  activeTab: 'overview' | 'calendar' | 'news' | 'charts' = 'overview';
  /** Se pasa una sola vez a News para abrir el detalle al venir desde Overview */
  pendingNewsArticle: {
    title: string;
    snippet: string;
    time: number;
    source: string;
    category: string;
    image: string | null;
    url: string;
    isPro: boolean;
  } | null = null;
  
  @ViewChild('newsSlider') newsSlider!: ElementRef;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private el: ElementRef) {}

  setActiveTab(tab: 'overview' | 'calendar' | 'news' | 'charts') {
    this.activeTab = tab;
    localStorage.setItem('markethub_active_tab', tab);
    this.cdr.detectChanges();
    // Forzar scroll al inicio de la página al cambiar de pestaña
    window.scrollTo(0, 0);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.showSearchModal && !this.searchContainer.nativeElement.contains(event.target)) {
      this.showSearchModal = false;
      this.cdr.detectChanges();
    }
  }

  // Variables eliminadas por refactorización a SmartMarketService

  checkPersistence() {
    try {
      const saved = localStorage.getItem('markethub_state');
      if (saved) {
        const { date, exhaustedMap, tickerPrices, lastPrice, lastCheck } = JSON.parse(saved);
          // 1. Hidratar Ticker (Escaneo profundo: busca por símbolo visual y por API)
          if (tickerPrices && this.coins) {
            this.coins.forEach(coin => {
              // Intenta recuperar por clave de símbolo o clave de API (para mayor robustez)
              const cached = tickerPrices[coin.symbol] || tickerPrices[coin.apiSymbol] || tickerPrices[coin.tech];
              if (cached && cached.price > 0) {
                coin.price = cached.price;
                coin.change = cached.change;
              }
            });
          }

          // 2. Hidratar Overview (Prioridad: Último visto -> Ticker -> Respaldo)
          const currentMatch = this.coins ? this.coins.find(c => c.apiSymbol === this.currentApiSymbol || c.tech === this.currentApiSymbol) : null;
          
          if (lastPrice && (lastPrice.symbol === this.currentApiSymbol || lastPrice.symbol === this.currentSymbol) && lastPrice.data.c > 0) {
            this.currentPriceData = lastPrice.data;
          } else if (currentMatch && currentMatch.price > 0) {
            this.currentPriceData = { c: currentMatch.price, dp: currentMatch.change };
          }

          // 3. Gestionar estados de API (Eliminado porque SmartMarketService se encarga)
          console.log("Memoria de Precios Hidratada al 100%.");
        }
      } catch (e: any) {
        console.error("Error en hidratación:", e);
      }
    }

  savePersistence() {
    try {
      const savedRaw = localStorage.getItem('markethub_state');
      const currentState = savedRaw ? JSON.parse(savedRaw) : {};
      
      // Mantenemos lo que ya había (Merge inteligente)
      const tickerPrices: any = currentState.tickerPrices || {};

      // Solo ACTUALIZAMOS si el precio es real (>0). Si es 0, mantenemos el antiguo.
      if (this.coins) {
        this.coins.forEach(c => {
          if (c.price > 0) {
            // Guardamos bajo múltiples claves para que la recuperación sea infalible en todo el sitio (Charts, News, etc.)
            tickerPrices[c.symbol] = { price: c.price, change: c.change };
            tickerPrices[c.apiSymbol] = { price: c.price, change: c.change };
            tickerPrices[c.tech] = { price: c.price, change: c.change }; // Clave definitiva para Charts
          }
        });
      }

      // Lo mismo para el precio de la cabecera (Overview)
      let lastPriceToSave = currentState.lastPrice;
      if (this.currentPriceData && this.currentPriceData.c > 0) {
        lastPriceToSave = { symbol: this.currentApiSymbol, data: this.currentPriceData };
      }

      localStorage.setItem('markethub_state', JSON.stringify({
        date: new Date().toDateString(),
        tickerPrices: tickerPrices,
        lastPrice: lastPriceToSave
      }));
    } catch (e: any) {}
  }

  ngOnInit() {
    const savedTab = localStorage.getItem('markethub_active_tab') as any;
    if (savedTab && ['overview', 'calendar', 'news', 'charts'].includes(savedTab)) {
      this.activeTab = savedTab;
    }

    this.checkPersistence();
    this.initDashboard();
    this.startLiveClock();

    // Sincronización global y Hydration visual instantánea
    this.smartMarket.selectedAsset$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(asset => {
      if (this.currentSource.startsWith('finnhub') && this.currentSymbol !== asset.symbol) {
        this.smartMarket.unsubscribeSymbol(this.currentSymbol);
      }
      
      this.currentSymbol = asset.symbol;
      this.currentApiSymbol = asset.apiSymbol;
      this.displaySymbol = asset.displaySymbol;
      this.currentSource = asset.source;
      // Resolvemos el ID correcto de CoinGecko antes de buscar en caché
      this.currentCoingeckoId = asset.source === 'coingecko'
        ? this.resolveCoingeckoId(asset.coingeckoId || asset.apiSymbol)
        : (asset.coingeckoId || '');

      // Leer caché instantánea de SmartMarketService
      const cacheKey = asset.source === 'coingecko' ? this.currentCoingeckoId : asset.apiSymbol;
      const cached = this.smartMarket.getCachedPrice(cacheKey);
      
      if (cached && cached.c > 0) {
        this.currentPriceData = { c: cached.c, dp: cached.dp, timestamp: cached.t };
      } else {
        // IMPORTANTE: Limpiar a cero, no dejar el precio del activo anterior
        this.currentPriceData = { c: 0, dp: 0 };
      }

      this.updateMainPriceStream();
      this.loadTradingViewWidget(this.currentSymbol);
      this.cdr.detectChanges();
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  openUrl(url: string) {
    if (url) window.open(url, '_blank');
  }

  startLiveClock() {
    const tick = () => {
      const now = new Date();
      this.lastSentimentUpdate = now.toLocaleString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
      this.cdr.detectChanges();
    };
    tick(); // ejecutar inmediatamente
    this.clockInterval = setInterval(tick, 1000);
  }

  // Funciones de WebSocket antiguas eliminadas en favor de SmartMarketService

  initDashboard() {
    this.selectedDate = new Date();
    this.showSearchModal = false;
    this.searchResults = [];
    this.assetNotSupported = false;
    
    this.loadNews();
    this.loadGlobalSentiment();
    this.fetchCalendarData();
  }

  onSearchFocus() {
    if (this.searchQuery.length < 1) {
      this.showPopularAssets();
    } else {
      this.showSearchModal = true;
    }
  }

  showPopularAssets() {
    this.searchResults = this.coins.map(c => ({
      symbol: c.tech,
      apiSymbol: c.apiSymbol,
      description: c.symbol,
      type: 'POPULAR',
      source: c.source
    }));
    this.showSearchModal = true;
    this.cdr.detectChanges();
  }

  onSearchInput(query: string) {
    this.searchQuery = query;
    if (query.length < 1) {
      this.showPopularAssets();
      return;
    }
    // Solo enviamos al subject para procesar con debounce
    this.searchSubject.next(query);
  }

  private performSearch(query: string) {
    // CAPA 1: Mapa de atajos locales — resuelve INSTANTÁNEAMENTE sin API.
    // Garantiza que BTC→BTCUSD, XAU→XAUUSD, EUR→EURUSD, OIL→TVC:USOIL, etc.
    const SHORTHAND_MAP: { [key: string]: any } = {
      'XAU':     { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  description: 'Gold Spot / US Dollar',       type: 'METAL',     source: 'twelvedata' },
      'GOLD':    { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  description: 'Gold Spot / US Dollar',       type: 'METAL',     source: 'twelvedata' },
      'XAUUSD':  { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  description: 'Gold Spot / US Dollar',       type: 'METAL',     source: 'twelvedata' },
      'XAG':     { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  description: 'Silver Spot / US Dollar',     type: 'METAL',     source: 'twelvedata' },
      'SILVER':  { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  description: 'Silver Spot / US Dollar',     type: 'METAL',     source: 'twelvedata' },
      'XAGUSD':  { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  description: 'Silver Spot / US Dollar',     type: 'METAL',     source: 'twelvedata' },
      'BTC':     { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD',  description: 'Bitcoin / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'BITCOIN': { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD',  description: 'Bitcoin / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'ETH':     { symbol: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'ETHEREUM':{ symbol: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'SOL':     { symbol: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD',  description: 'Solana / US Dollar',          type: 'CRYPTO',    source: 'twelvedata' },
      'SOLANA':  { symbol: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD',  description: 'Solana / US Dollar',          type: 'CRYPTO',    source: 'twelvedata' },
      'ADA':     { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD',  description: 'Cardano / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'CARDANO': { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD',  description: 'Cardano / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'DOT':     { symbol: 'BINANCE:DOTUSD', apiSymbol: 'DOT/USD',  description: 'Polkadot / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'POLKADOT':{ symbol: 'BINANCE:DOTUSD', apiSymbol: 'DOT/USD',  description: 'Polkadot / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'AVAX':    { symbol: 'BINANCE:AVAXUSD', apiSymbol: 'AVAX/USD',  description: 'Avalanche / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'AVALANCHE':{ symbol: 'BINANCE:AVAXUSD',apiSymbol: 'AVAX/USD',  description: 'Avalanche / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'XRP':     { symbol: 'BINANCE:XRPUSD', apiSymbol: 'XRP/USD',  description: 'XRP / US Dollar',             type: 'CRYPTO',    source: 'twelvedata' },
      'RIPPLE':  { symbol: 'BINANCE:XRPUSD', apiSymbol: 'XRP/USD',  description: 'XRP / US Dollar',             type: 'CRYPTO',    source: 'twelvedata' },
      'LINK':    { symbol: 'BINANCE:LINKUSD', apiSymbol: 'LINK/USD', description: 'Chainlink / US Dollar',      type: 'CRYPTO',    source: 'twelvedata' },
      'CHAINLINK':{ symbol: 'BINANCE:LINKUSD',apiSymbol: 'LINK/USD', description: 'Chainlink / US Dollar',      type: 'CRYPTO',    source: 'twelvedata' },
      'MATIC':   { symbol: 'BINANCE:MATICUSD',apiSymbol: 'MATIC/USD',description: 'Polygon / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'POLYGON': { symbol: 'BINANCE:MATICUSD',apiSymbol: 'MATIC/USD',description: 'Polygon / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'DOGE':    { symbol: 'BINANCE:DOGEUSD',apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'DOGECOIN':{ symbol: 'BINANCE:DOGEUSD',apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'SHIB':    { symbol: 'BINANCE:SHIBUSD',apiSymbol: 'SHIB/USD', description: 'Shiba Inu / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'LTC':     { symbol: 'BINANCE:LTCUSD', apiSymbol: 'LTC/USD',  description: 'Litecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'LITECOIN':{ symbol: 'BINANCE:LTCUSD', apiSymbol: 'LTC/USD',  description: 'Litecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'EUR':     { symbol: 'FX:EURUSD',     apiSymbol: 'EUR/USD',  description: 'Euro / US Dollar',            type: 'FOREX',     source: 'twelvedata' },
      'EURUSD':  { symbol: 'FX:EURUSD',     apiSymbol: 'EUR/USD',  description: 'Euro / US Dollar',            type: 'FOREX',     source: 'twelvedata' },
      'GBP':     { symbol: 'FX:GBPUSD',     apiSymbol: 'GBP/USD',  description: 'British Pound / US Dollar',  type: 'FOREX',     source: 'twelvedata' },
      'OIL':     { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      description: 'Crude Oil WTI',              type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
      'WTI':     { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      description: 'Crude Oil WTI',              type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
      'SPY':     { symbol: 'SPY',           apiSymbol: 'SPY',      description: 'S&P 500 ETF',                type: 'INDEX ETF', source: 'finnhub' },
      'SP500':   { symbol: 'SPY',           apiSymbol: 'SPY',      description: 'S&P 500 ETF',                type: 'INDEX ETF', source: 'finnhub' },
      'QQQ':     { symbol: 'QQQ',           apiSymbol: 'QQQ',      description: 'NASDAQ 100 ETF',             type: 'INDEX ETF', source: 'finnhub' },
      'NASDAQ':  { symbol: 'QQQ',           apiSymbol: 'QQQ',      description: 'NASDAQ 100 ETF',             type: 'INDEX ETF', source: 'finnhub' },
    };

    const shorthandMatch = SHORTHAND_MAP[query.trim().toUpperCase()];
    const pinnedResult = shorthandMatch ? [shorthandMatch] : [];

    // CAPA 2 & 3: Búsqueda Multi-API (Twelve Data para Stocks/Forex + CoinGecko para Cripto)
    const twelveDataObs = this.http.get(`https://api.twelvedata.com/symbol_search?symbol=${query}&outputsize=10`)
      .pipe(catchError(() => of({ data: [] })));
    
    const coinGeckoObs = this.http.get(`https://api.coingecko.com/api/v3/search?query=${query}&x_cg_demo_api_key=${this.coinGeckoApiKey}`)
      .pipe(catchError(() => of({ coins: [] })));

    forkJoin({
      tdRes: twelveDataObs,
      cgRes: coinGeckoObs
    }).subscribe(({ tdRes, cgRes }) => {
        const tdResults = (tdRes as any).data || [];
        const cgResults = (cgRes as any).coins || [];
        
        // Mapa de activos populares: sobreescribe el símbolo TV y la API para activos conocidos
        const POPULAR_ASSET_MAP: { [key: string]: { tvSymbol: string; apiSymbol: string; source: string; coingeckoId?: string } } = {
          'XAU/USD':  { tvSymbol: 'OANDA:XAUUSD',   apiSymbol: 'XAU/USD', source: 'twelvedata' },
          'XAG/USD':  { tvSymbol: 'OANDA:XAGUSD',   apiSymbol: 'XAG/USD', source: 'twelvedata' },
          'EUR/USD':  { tvSymbol: 'FX:EURUSD',       apiSymbol: 'EUR/USD', source: 'twelvedata' },
          'GBP/USD':  { tvSymbol: 'FX:GBPUSD',       apiSymbol: 'GBP/USD', source: 'twelvedata' },
          'USD/JPY':  { tvSymbol: 'FX:USDJPY',       apiSymbol: 'USD/JPY', source: 'twelvedata' },
          'AUD/USD':  { tvSymbol: 'FX:AUDUSD',       apiSymbol: 'AUD/USD', source: 'twelvedata' },
          'USD/CAD':  { tvSymbol: 'FX:USDCAD',       apiSymbol: 'USD/CAD', source: 'twelvedata' },
          'USD/CHF':  { tvSymbol: 'FX:USDCHF',       apiSymbol: 'USD/CHF', source: 'twelvedata' },
          'NZD/USD':  { tvSymbol: 'FX:NZDUSD',       apiSymbol: 'NZD/USD', source: 'twelvedata' },
          'BTC/USD':  { tvSymbol: 'CRYPTO:BTCUSD',   apiSymbol: 'BTC/USD', source: 'coingecko', coingeckoId: 'bitcoin' },
          'ETH/USD':  { tvSymbol: 'CRYPTO:ETHUSD',   apiSymbol: 'ETH/USD', source: 'coingecko', coingeckoId: 'ethereum' },
          'SOL/USD':  { tvSymbol: 'CRYPTO:SOLUSD',   apiSymbol: 'SOL/USD', source: 'coingecko', coingeckoId: 'solana' },
          'BNB/USD':  { tvSymbol: 'CRYPTO:BNBUSD',   apiSymbol: 'BNB/USD', source: 'coingecko', coingeckoId: 'binancecoin' },
          'XRP/USD':  { tvSymbol: 'CRYPTO:XRPUSD',   apiSymbol: 'XRP/USD', source: 'coingecko', coingeckoId: 'ripple' },
          'ADA/USD':  { tvSymbol: 'CRYPTO:ADAUSD',   apiSymbol: 'ADA/USD', source: 'coingecko', coingeckoId: 'cardano' },
          'DOGE/USD': { tvSymbol: 'CRYPTO:DOGEUSD',  apiSymbol: 'DOGE/USD', source: 'coingecko', coingeckoId: 'dogecoin' },
          'DOT/USD':  { tvSymbol: 'CRYPTO:DOTUSD',   apiSymbol: 'DOT/USD', source: 'coingecko', coingeckoId: 'polkadot' },
          'AVAX/USD': { tvSymbol: 'CRYPTO:AVAXUSD',  apiSymbol: 'AVAX/USD', source: 'coingecko', coingeckoId: 'avalanche-2' },
          'LINK/USD': { tvSymbol: 'CRYPTO:LINKUSD',  apiSymbol: 'LINK/USD', source: 'coingecko', coingeckoId: 'chainlink' },
          'MATIC/USD':{ tvSymbol: 'CRYPTO:MATICUSD', apiSymbol: 'MATIC/USD',source: 'coingecko', coingeckoId: 'polygon-ecosystem-token' },
          'SHIB/USD': { tvSymbol: 'CRYPTO:SHIBUSD',  apiSymbol: 'SHIB/USD', source: 'coingecko', coingeckoId: 'shiba-inu' },
          'LTC/USD':  { tvSymbol: 'CRYPTO:LTCUSD',   apiSymbol: 'LTC/USD', source: 'coingecko', coingeckoId: 'litecoin' },
          'TRX/USD':  { tvSymbol: 'CRYPTO:TRXUSD',   apiSymbol: 'TRX/USD', source: 'coingecko', coingeckoId: 'tron' },
          'UNI/USD':  { tvSymbol: 'CRYPTO:UNIUSD',   apiSymbol: 'UNI/USD', source: 'coingecko', coingeckoId: 'uniswap' },
          'ATOM/USD': { tvSymbol: 'CRYPTO:ATOMUSD',  apiSymbol: 'ATOM/USD', source: 'coingecko', coingeckoId: 'cosmos' },
          'NEAR/USD': { tvSymbol: 'CRYPTO:NEARUSD',  apiSymbol: 'NEAR/USD', source: 'coingecko', coingeckoId: 'near' },
          'XLM/USD':  { tvSymbol: 'CRYPTO:XLMUSD',   apiSymbol: 'XLM/USD', source: 'coingecko', coingeckoId: 'stellar' },
          'ICP/USD':  { tvSymbol: 'CRYPTO:ICPUSD',   apiSymbol: 'ICP/USD', source: 'coingecko', coingeckoId: 'internet-computer' },
        };

        // Procesar resultados de Twelve Data
        const apiMapped = tdResults.filter((item: any) => {
          return item.instrument_type !== 'Index' || item.symbol === 'SPX' || item.symbol === 'NDX' || item.symbol === 'IXIC';
        }).map((item: any) => {
          let tvSymbol = item.symbol;
          let apiSymbol = item.symbol;
          let type = item.instrument_type || 'ASSET';
          let source = 'twelvedata';

          if (type === 'Physical Currency') {
            const pairSymbol = item.symbol;
            const override = POPULAR_ASSET_MAP[pairSymbol];
            if (override) {
              tvSymbol = override.tvSymbol;
              apiSymbol = override.apiSymbol;
              source = override.source;
            } else {
              tvSymbol = `FX:${item.symbol.replace('/', '')}`;
              apiSymbol = item.symbol;
            }
            type = pairSymbol.includes('XAU') || pairSymbol.includes('XAG') ? 'METAL' : 'FOREX';
          } else if (type === 'Digital Currency' || type === 'Cryptocurrency') {
            const cryptoSymbol = item.symbol;
            const override = POPULAR_ASSET_MAP[cryptoSymbol];
            if (override) {
              tvSymbol = override.tvSymbol;
              apiSymbol = override.apiSymbol;
              source = override.source;
            } else {
              tvSymbol = `CRYPTO:${item.symbol.replace('/', '')}`;
              apiSymbol = item.symbol;
            }
            type = 'CRYPTO';
          } else if (type === 'Common Stock') {
            source = 'finnhub';
            type = 'STOCK';
          } else if (item.symbol === 'SPX' || item.symbol === 'NDX' || item.symbol === 'IXIC') {
             if (item.symbol === 'SPX') { tvSymbol = 'SPY'; apiSymbol = 'SPY'; source = 'finnhub'; }
             if (item.symbol === 'NDX' || item.symbol === 'IXIC') { tvSymbol = 'QQQ'; apiSymbol = 'QQQ'; source = 'finnhub'; }
             type = 'INDEX ETF';
          }

          return {
            symbol: tvSymbol,
            apiSymbol: apiSymbol,
            description: item.instrument_name,
            type: type,
            source: source
          };
        });

        // Procesar resultados de CoinGecko (Solo si no están ya en Twelve Data)
        const cgMapped = cgResults.slice(0, 5).map((item: any) => {
          const sym = item.symbol.toUpperCase();
          const apiSym = `${sym}/USD`;
          const tvSym = `BINANCE:${sym}USD`;
          
          return {
            symbol: tvSym,
            apiSymbol: apiSym,
            description: item.name,
            type: 'CRYPTO',
            source: 'coingecko',
            coingeckoId: item.id
          };
        });

        // Combinar todos los resultados
        const combined = [...apiMapped, ...cgMapped];

        // DOBLE VALIDACIÓN: Lista negra quirúrgica + Filtro de consistencia de API
        // 1. Lista Negra: Símbolos que rompen el widget GRATUITO de TradingView
        const SYMBOL_BLACKLIST = new Set([
          'CBOE:VIX', 'TVC:DXY', 'TVC:GOLD', 'TVC:SILVER', 'TVC:USOIL_OLD',
          'TVC:SPX', 'TVC:NDX', 'TVC:DJI', 'TVC:NI225', 'TVC:FTSE', 'TVC:DAX',
          'CURRENCYCOM:US500', 'CURRENCYCOM:DE40', 'CURRENCYCOM:UK100',
          'INDEX:DEU40', 'INDEX:SPX500', 'CAPITALCOM:VIX',
          'FOREXCOM:SPXUSD', 'FOREXCOM:NSXUSD',
        ]);

        // 2. Prefijos de exchanges que generalmente requieren plan de pago
        const BLOCKED_PREFIXES = ['CURRENCYCOM:', 'CAPITALCOM:', 'FOREXCOM:', 'INDEX:'];

        // 3. Fuentes de API que sí podemos trackear con precio real
        const SUPPORTED_SOURCES = new Set(['finnhub', 'twelvedata', 'coingecko', 'finnhub_synthetic_wti']);

        const validated = combined.filter((r: any) => {
          if (!r.symbol) return false;
          // Bloquear si está en la lista negra exacta
          if (SYMBOL_BLACKLIST.has(r.symbol)) return false;
          // Bloquear si tiene un prefijo de exchange bloqueado
          if (BLOCKED_PREFIXES.some(p => r.symbol.startsWith(p))) return false;
          // Bloquear si no tenemos API de precios que lo soporte
          if (!SUPPORTED_SOURCES.has(r.source)) return false;
          return true;
        });

        // El resultado curado (pinnedResult) va PRIMERO para que Enter lo seleccione correctamente
        this.searchResults = [
          ...pinnedResult,
          ...validated.filter((r: any) => !pinnedResult.some((p: any) => p.symbol === r.symbol))
        ];

        this.showSearchModal = true;
        this.cdr.detectChanges();
      });
  }

  onEnterSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Bloqueo por nombre explícito: activos que el usuario puede teclear manualmente y que NO soportamos
    const MANUAL_BLOCKLIST = new Set(['VIX', 'DXY', 'DAX', 'FTSE', 'NIKKEI', 'NI225', 'CAC40', 'IBEX', 'IBEX35']);
    if (MANUAL_BLOCKLIST.has(trimmed.toUpperCase())) {
      this.assetNotSupported = true;
      this.showSearchModal = false;
      this.searchResults = [];
      this.searchQuery = '';
      this.cdr.detectChanges();
      return;
    }

    // Capa 1: Mapa instantáneo local — respuesta 0ms
    const QUICK_MAP: { [key: string]: any } = {
      'XAU': { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  source: 'twelvedata' },
      'GOLD': { symbol: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD',  source: 'twelvedata' },
      'XAG': { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  source: 'twelvedata' },
      'SILVER': { symbol: 'OANDA:XAGUSD', apiSymbol: 'XAG/USD', source: 'twelvedata' },
      'BTC': { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD',  source: 'coingecko', coingeckoId: 'bitcoin' },
      'BITCOIN': { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD', source: 'coingecko', coingeckoId: 'bitcoin' },
      'ETH': { symbol: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD',  source: 'coingecko', coingeckoId: 'ethereum' },
      'SOL': { symbol: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD',  source: 'coingecko', coingeckoId: 'solana' },
      'ADA': { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD',  source: 'coingecko', coingeckoId: 'cardano' },
      'CARDANO': { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD', source: 'coingecko', coingeckoId: 'cardano' },
      'DOT': { symbol: 'BINANCE:DOTUSD', apiSymbol: 'DOT/USD',  source: 'coingecko', coingeckoId: 'polkadot' },
      'AVAX': { symbol: 'BINANCE:AVAXUSD', apiSymbol: 'AVAX/USD', source: 'coingecko', coingeckoId: 'avalanche-2' },
      'XRP': { symbol: 'BINANCE:XRPUSD', apiSymbol: 'XRP/USD',  source: 'coingecko', coingeckoId: 'ripple' },
      'EUR': { symbol: 'FX:EURUSD',     apiSymbol: 'EUR/USD',  source: 'twelvedata' },
      'EURUSD': { symbol: 'FX:EURUSD',  apiSymbol: 'EUR/USD',  source: 'twelvedata' },
      'GBP': { symbol: 'FX:GBPUSD',     apiSymbol: 'GBP/USD',  source: 'twelvedata' },
      'OIL': { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      source: 'finnhub_synthetic_wti' },
      'WTI': { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      source: 'finnhub_synthetic_wti' },
      'SPY': { symbol: 'SPY',           apiSymbol: 'SPY',      source: 'finnhub' },
      'SP500': { symbol: 'SPY',         apiSymbol: 'SPY',      source: 'finnhub' },
      'QQQ': { symbol: 'QQQ',           apiSymbol: 'QQQ',      source: 'finnhub' },
      'NASDAQ': { symbol: 'QQQ',        apiSymbol: 'QQQ',      source: 'finnhub' },
    };
    const quickMatch = QUICK_MAP[trimmed.toUpperCase()];
    if (quickMatch) {
      this.selectResult(quickMatch);
      return;
    }

    // Capa 2: Validar que el primer resultado de la API coincide con lo que escribió el usuario.
    // Si los resultados son de una búsqueda anterior (stale), NO los usamos — activamos el overlay.
    const queryUpper = trimmed.toUpperCase();
    const freshResult = this.searchResults.find((r: any) =>
      r.symbol?.toUpperCase().includes(queryUpper) ||
      r.description?.toUpperCase().includes(queryUpper)
    );

    if (freshResult) {
      this.selectResult(freshResult);
    } else {
      // No existe el activo — mostramos el overlay premium en vez del error interno de TradingView
      this.assetNotSupported = true;
      this.showSearchModal = false;
      this.searchResults = [];
      this.searchQuery = '';
      this.cdr.detectChanges();
    }
  }

  selectResult(result: any) {
    this.showSearchModal = false;
    this.searchQuery = '';
    this.assetNotSupported = false;

    // Actualizamos el estado global que automáticamente hidratará y conectará los streams
    this.smartMarket.setActiveAsset({
      symbol: result.symbol,
      apiSymbol: result.apiSymbol,
      displaySymbol: this.formatDisplaySymbol(result.symbol),
      source: result.source,
      coingeckoId: result.coingeckoId || ''
    });
  }

  loadAllData() {
    this.initDashboard();
  }

  ngAfterViewInit() {
    // Delegado en ngOnInit a través de la suscripción selectedAsset$
  }

  formatDisplaySymbol(symbol: string) {
    if (symbol === 'SPY') return 'S&P 500 (SPY)';
    if (symbol === 'QQQ') return 'NASDAQ 100 (QQQ)';
    if (symbol.includes('BTC') || symbol.includes('ETH')) return symbol.replace('BINANCE:', '').replace('CRYPTO:', '').replace('USDT', ' / USD').replace('USD', ' / USD');
    if (symbol.includes('FX:EURUSD')) return 'EUR / USD';
    if (symbol.includes('XAUUSD')) return 'GOLD (XAU)';
    if (symbol.includes('USOIL')) return 'CRUDE OIL (WTI)';
    
    return symbol.split(':').pop() || symbol;
  }

  // Dinámicamente formatea los decimales: 4 decimales (pips completos) para Forex, 2 para el resto.
  getPriceFormat(techSymbol: string): string {
    if (techSymbol && (techSymbol.includes('FX:') || techSymbol.includes('EURUSD') || techSymbol.includes('OANDA:'))) {
      if (techSymbol.includes('XAUUSD')) return '1.2-2'; // El oro suele mostrar 2 decimales
      return '1.4-4';
    }
    return '1.2-2';
  }

  updateMainPriceStream() {
    // DESTRUIR AMBAS SUSCRIPCIONES al cambiar de activo - elimina la fuga de memoria
    if (this.mainPriceSub) {
      this.mainPriceSub.unsubscribe();
      this.mainPriceSub = undefined;
    }
    if (this.stockRestSub) {
      this.stockRestSub.unsubscribe();
      this.stockRestSub = undefined;
    }

    if (this.currentSource.startsWith('finnhub')) {
      this.smartMarket.initFinnhubWebSocket(this.currentSymbol);
      // Suscripción 1: WebSocket en tiempo real (precio tick a tick)
      this.mainPriceSub = this.smartMarket.getWebSocketPriceStream()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => {
          if (data && data.s === this.currentSymbol) {
             this.currentPriceData = { ...this.currentPriceData, c: data.p, timestamp: new Date().getTime() };
             this.smartMarket.updateCache(this.currentApiSymbol, data.p, this.currentPriceData.dp || 0);
             this.cdr.detectChanges();
          }
        });
      
      // Suscripción 2: REST polling asignado a stockRestSub SEPARADO para limpieza individual
      const multiplier = this.currentSource === 'finnhub_synthetic_wti' ? 0.7146 : 1;
      this.stockRestSub = this.smartMarket.getStockPrice(this.currentApiSymbol)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => {
          if (data && data.c && data.c !== 0) {
            let dp = data.dp;
            if (dp === 0 && data.pc !== 0) dp = ((data.c - data.pc) / data.pc) * 100;
            const price = data.c * multiplier;
            this.currentPriceData = { c: price, dp: dp || 0, timestamp: new Date().getTime() };
            this.smartMarket.updateCache(this.currentApiSymbol, price, dp || 0);
            this.cdr.detectChanges();
          }
        });

    } else if (this.currentSource === 'twelvedata') {
      this.mainPriceSub = this.smartMarket.getForexPricesBatch([this.currentApiSymbol])
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => {
          if (data && data.status !== 'error') {
             const quote = data[this.currentApiSymbol] || data;
             if (quote && quote.close) {
               const price = parseFloat(quote.close);
               const dp = parseFloat(quote.percent_change || 0);
               this.currentPriceData = { c: price, dp, timestamp: new Date().getTime() };
               this.smartMarket.updateCache(this.currentApiSymbol, price, dp);
               this.cdr.detectChanges();
             }
          }
        });

    } else if (this.currentSource === 'coingecko') {
      // Resolver siempre el ID de CoinGecko correcto antes de suscribirse
      const resolvedId = this.resolveCoingeckoId(this.currentCoingeckoId || this.currentApiSymbol);
      this.currentCoingeckoId = resolvedId; // Actualizar en caso de que venga mal
      
      this.mainPriceSub = this.smartMarket.getCryptoPrices([])
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => {
          if (data && data[resolvedId]) {
            const info = data[resolvedId];
            const price = info.usd;
            const dp = info.usd_24h_change || 0;
            this.currentPriceData = { c: price, dp, timestamp: new Date().getTime() };
            this.smartMarket.updateCache(resolvedId, price, dp);
            this.cdr.detectChanges();
          }
        });
    }
  }

  loadGlobalSentiment() {
    this.http.get('https://api.alternative.me/fng/').subscribe((res: any) => {
      this.sentimentData = res.data[0];
      this.cdr.detectChanges();
    });
  }

  getSentimentIndicatorCoords(): { x: number, y: number } {
    const val = parseFloat(this.sentimentData?.value || '0');
    const R = 59;
    const centerX = 72;
    const centerY = 68;
    const angle = Math.PI - (val / 100) * Math.PI;
    const x = centerX + R * Math.cos(angle);
    const y = centerY - R * Math.sin(angle);
    return { x, y };
  }

  getSentimentColor(): string {
    const val = parseFloat(this.sentimentData?.value || '0');
    if (val <= 25) return '#EA3943';
    if (val <= 45) return '#EA8C00';
    if (val <= 55) return '#F3D42F';
    if (val <= 75) return '#93D900';
    return '#16C784';
  }

  setNewsCategory(cat: string) {
    // Logic moved to MarketNewsComponent
  }

  filterNews() {
    // Logic moved to MarketNewsComponent
  }

  loadNews() {
    const rapidHeaders = {
      'x-rapidapi-key': this.rapidApiKey,
      'x-rapidapi-host': this.rapidApiHost
    };

    const sources = {
      finnhub: this.http.get(`https://finnhub.io/api/v1/news?category=general&token=${this.apiKey}`).pipe(catchError(() => of([]))),
      newsData: this.http.get(`https://newsdata.io/api/1/news?apikey=${this.newsDataKey}&q=finance&language=en`).pipe(catchError(() => of({ results: [] }))),
      marketaux: this.http.get(`https://api.marketaux.com/v1/news/all?language=en&api_token=${this.marketauxKey}`).pipe(catchError(() => of({ data: [] }))),
      tiingo: this.http.get(`https://api.tiingo.com/tiingo/news?token=${this.tiingoApiKey}`).pipe(catchError(() => of([]))),
      yahoo: this.http.get(`https://yahoo-finance15.p.rapidapi.com/api/v1/markets/news?ticker=AAPL,TSLA,BTC-USD,EURUSD=X`, { headers: rapidHeaders }).pipe(catchError(() => of({ body: [] })))
    };

    forkJoin(sources).subscribe((res: any) => {
      let combined: any[] = [];

      // Yahoo
      if (res.yahoo?.body) {
        combined = [...combined, ...res.yahoo.body.map((n: any) => ({
          headline: n.title,
          source: n.source || 'Yahoo Finance',
          datetime: new Date(n.pubDate).getTime() / 1000,
          image: null,
          url: n.link,
          summary: n.description,
          category: 'Stock Markets'
        }))];
      }

      // Finnhub
      if (Array.isArray(res.finnhub)) {
        combined = [...combined, ...res.finnhub.map((n: any) => ({
          headline: n.headline,
          source: n.source,
          datetime: n.datetime,
          image: n.image,
          url: n.url,
          summary: n.summary,
          category: 'Economy'
        }))];
      }

      // NewsData
      if (res.newsData?.results) {
        combined = [...combined, ...res.newsData.results.map((n: any) => ({
          headline: n.title,
          source: n.source_id,
          datetime: new Date(n.pubDate).getTime() / 1000,
          image: n.image_url,
          url: n.link,
          summary: n.description,
          category: 'Stock Markets'
        }))];
      }

      // Marketaux
      if (res.marketaux?.data) {
        combined = [...combined, ...res.marketaux.data.map((n: any) => ({
          headline: n.title,
          source: n.source,
          datetime: new Date(n.published_at).getTime() / 1000,
          image: n.image_url,
          url: n.link,
          summary: n.description,
          category: 'Currencies'
        }))];
      }

      // Tiingo
      if (Array.isArray(res.tiingo)) {
        combined = [...combined, ...res.tiingo.map((n: any) => ({
          headline: n.title,
          source: n.sourceName,
          datetime: new Date(n.publishedDate).getTime() / 1000,
          image: null,
          url: n.url,
          summary: n.description,
          category: 'Cryptocurrencies'
        }))];
      }

      // Ordenar y seleccionar los 10 mejores
      this.marketNews = combined
        .filter(n => this.isFinancialRelevant(n))
        .sort((a, b) => b.datetime - a.datetime)
        .slice(0, 10);

      this.cdr.detectChanges();
    });
  }

  private isFinancialRelevant(n: any): boolean {
    const text = (n.headline + ' ' + (n.summary || '')).toLowerCase();
    const blacklist = [
      'fruit', 'recipe', 'hello', 'prediction', 'wwe', 'backlash', 'show', 'entertainment',
      'lifestyle', 'travel', 'fashion', 'sport', 'football', 'soccer', 'celebrity'
    ];
    if (blacklist.some(word => text.includes(word))) return false;

    const whitelist = [
      'market', 'stock', 'invest', 'fed', 'bank', 'inflation', 'gdp', 'economy',
      'currency', 'forex', 'usd', 'eur', 'gold', 'oil', 'wti', 'commodit',
      'crypto', 'bitcoin', 'btc', 'eth', 'price', 'trade', 'finance', 'report',
      'earnings', 'dividend', 'share', 'bond', 'yield', 'rate', 'central bank',
      'wall street', 'nasdaq', 'sp 500', 'dow jones', 'recession'
    ];
    return whitelist.some(word => text.includes(word));
  }

  scrollNews(dir: number) {
    if (this.newsSlider) {
      const container = this.newsSlider.nativeElement;
      const scrollAmount = 310 * 3; // Item width (280) + gap (30) approx * 3
      container.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    }
  }

  fetchCalendarData() {
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    this.http.get(`https://finnhub.io/api/v1/calendar/economic?from=${dateStr}&to=${dateStr}&token=${this.apiKey}`)
      .subscribe((res: any) => {
        this.economicEvents = (res.economicCalendar || []).map((event: any) => {
          const impactMap: { [key: string]: number } = { 'low': 1, 'med': 2, 'medium': 2, 'high': 3, 'none': 0 };
          
          let localTime = '--:--';
          if (event.time) {
            const utcDate = new Date(event.time + ' UTC');
            if (!isNaN(utcDate.getTime())) {
              localTime = utcDate.toLocaleTimeString(undefined, {
                hour: '2-digit', minute: '2-digit', hour12: true
              });
            }
          }

          return {
            ...event,
            localTime: localTime,
            impact: impactMap[event.impact?.toLowerCase()] || 0
          };
        });
        this.applyFilters();
        this.cdr.detectChanges();
      });
  }

  applyFilters() {
    this.filteredEvents = [...this.economicEvents].sort((a, b) => {
      if (b.impact !== a.impact) return b.impact - a.impact;
      return (a.time || '').localeCompare(b.time || '');
    });
  }

  loadTradingViewWidget(symbol: string): void {
    new TradingView.widget({
      "container_id": "tv_chart_container",
      "autosize": true,
      "symbol": symbol,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "light",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": false,
      "hide_top_toolbar": true,
      "hide_legend": false,
      "save_image": false,
      "details": false,
      "hotlist": false,
      "calendar": false,
      "disabled_features": [
        "header_widget",
        "header_symbol_search",
        "header_resolutions",
        "header_chart_type",
        "header_settings",
        "header_indicators",
        "header_compare",
        "header_undo_redo",
        "header_screenshot",
        "header_fullscreen_button",
        "header_saveload"
      ]
    });
  }

  changeDate(days: number) {
    this.selectedDate = new Date(this.selectedDate.setDate(this.selectedDate.getDate() + days));
    this.fetchCalendarData();
  }

  goToday() {
    this.selectedDate = new Date();
    this.fetchCalendarData();
  }

  openArticle(news: any) {
    this.pendingNewsArticle = {
      title: news.headline,
      snippet: news.summary ?? '',
      time: news.datetime * 1000,
      source: news.source ?? '',
      category: news.category ?? 'Economy',
      image: news.image ?? null,
      url: news.url ?? '',
      isPro: !!news.isPro
    };
    this.activeTab = 'news';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();
  }

  clearPendingNewsArticle(): void {
    this.pendingNewsArticle = null;
  }

  // Lógica avanzada de Arrastrar para Deslizar de forma directa e instantánea (Delta Tracking)
  private isDragging = false;
  private lastX = 0;
  private dragDistance = 0;

  onDragStart(e: MouseEvent, slider: HTMLDivElement) {
    this.isDragging = true;
    this.dragDistance = 0;
    this.lastX = e.pageX;
    
    // Desactivamos snapping y scroll animado mientras arrastramos físicamente
    slider.style.scrollBehavior = 'auto';
    slider.style.scrollSnapType = 'none';
  }

  onDragEnd(slider: HTMLDivElement) {
    if (!this.isDragging) return;
    this.isDragging = false;
    // Restaurar inmediatamente el snapping y scroll animado nativo de CSS al soltar
    slider.style.scrollBehavior = 'smooth';
    slider.style.scrollSnapType = 'x mandatory';
  }

  onDragMove(e: MouseEvent, slider: HTMLDivElement) {
    if (!this.isDragging) return;
    
    // Si el usuario soltó el clic del ratón (dentro o fuera de la ventana), cancelamos inmediatamente el arrastre
    if (e.buttons === 0) {
      this.onDragEnd(slider);
      return;
    }
    
    e.preventDefault();
    const deltaX = e.pageX - this.lastX;
    this.lastX = e.pageX;
    this.dragDistance += Math.abs(deltaX);
    
    // Desplazamiento reactivo de alta precisión
    slider.scrollLeft -= deltaX * 1.3;
  }

  onNewsClick(news: any, event: MouseEvent) {
    if (this.dragDistance > 10) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.openArticle(news);
  }
}
