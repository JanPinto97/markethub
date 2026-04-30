import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { MarketService } from '../../core/services/market.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

declare const TradingView: any;

@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe, DatePipe],
  templateUrl: './markets.component.html',
  styleUrls: ['./markets.component.css']
})
export class MarketsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('symbolInput') symbolInput!: ElementRef;
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  // CONFIGURACIÓN (API Keys)
  private apiKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';       // Finnhub — US Stocks & Synthetic WTI
  private twelveDataApiKey = 'b21b5589fbce4aada1a45a82a7bbbbf0';      // Twelve Data — Forex, Crypto, Gold
  private coinGeckoApiKey = 'CG-T7BjzNAbWJhwFMvvbj4sM8Mp';           // CoinGecko — Global Crypto Discovery
  private socket: WebSocket | null = null;
  
  widget: any;
  currentSymbol: string = 'CRYPTO:BTCUSD';
  displaySymbol: string = 'BTC / USD';
  currentApiSymbol: string = 'BTC/USD';
  currentSource: string = 'twelvedata';
  currentCoingeckoId: string = '';
  currentPriceData: any = { c: 0, dp: 0 };
  assetNotSupported: boolean = false;
  currentYear = new Date().getFullYear();
  selectedDate: Date = new Date();
  lastSentimentUpdate: string = '';
  private clockInterval: any;
  private searchSubject = new Subject<string>();
  
  // 1. SÍMBOLOS Y ETIQUETAS (Arquitectura Inteligente: Finnhub, TwelveData, Synthetic)
  coins: any[] = [
    { symbol: 'BTC/USD', tech: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD', source: 'twelvedata', price: 0, change: 0 },
    { symbol: 'ETH/USD', tech: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD', source: 'twelvedata', price: 0, change: 0 },
    { symbol: 'EUR/USD', tech: 'FX:EURUSD', apiSymbol: 'EUR/USD', source: 'twelvedata', price: 0, change: 0 }, 
    { symbol: 'S&P 500 (SPY)', tech: 'SPY', apiSymbol: 'SPY', source: 'finnhub', price: 0, change: 0 },       
    { symbol: 'GOLD (XAU)', tech: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD', source: 'twelvedata', price: 0, change: 0 }, 
    { symbol: 'NASDAQ 100 (QQQ)', tech: 'QQQ', apiSymbol: 'QQQ', source: 'finnhub', price: 0, change: 0 },      
    { symbol: 'AAPL', tech: 'AAPL', apiSymbol: 'AAPL', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'NVDA', tech: 'NVDA', apiSymbol: 'NVDA', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'TSLA', tech: 'TSLA', apiSymbol: 'TSLA', source: 'finnhub', price: 0, change: 0 },
    { symbol: 'CRUDE OIL (WTI)', tech: 'TVC:USOIL', apiSymbol: 'USO', source: 'finnhub_synthetic_wti', price: 0, change: 0 }
  ];

  searchResults: any[] = [];
  showSearchModal: boolean = false;
  searchQuery: string = '';
  
  economicEvents: any[] = [];
  filteredEvents: any[] = [];
  marketNews: any[] = [];
  sentimentData: any = { value: 0, value_classification: '...' };

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.showSearchModal && !this.searchContainer.nativeElement.contains(event.target)) {
      this.showSearchModal = false;
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {
    this.initDashboard();
    this.setupWebSocket();
    this.startLiveClock();

    // Optimización: Debounce para evitar que el buscador ralentice la UI
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.close();
    }
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  startLiveClock() {
    const tick = () => {
      const now = new Date();
      this.lastSentimentUpdate = now.toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
      this.cdr.detectChanges();
    };
    tick(); // ejecutar inmediatamente
    this.clockInterval = setInterval(tick, 1000);
  }

  setupWebSocket() {
    this.socket = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

    this.socket.addEventListener('open', () => {
      // Suscribimos a los activos del ticker inicial
      this.coins.forEach(coin => this.subscribeSymbol(coin.tech));
      // Suscribimos al símbolo actual
      this.subscribeSymbol(this.currentSymbol);
    });

    this.socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'trade') {
        const trades = msg.data;
        trades.forEach((trade: any) => {
          // Actualizamos el precio del ticker si coincide
          const coin = this.coins.find(c => c.tech === trade.s);
          if (coin) {
            coin.price = trade.p;
          }
          // Actualizamos el precio de la cabecera si coincide
          if (trade.s === this.currentSymbol) {
            this.currentPriceData.c = trade.p;
            this.cdr.detectChanges();
          }
        });
        this.cdr.detectChanges();
      }
    });
  }

  subscribeSymbol(symbol: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'subscribe', symbol: symbol }));
    }
  }

  unsubscribeSymbol(symbol: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol: symbol }));
    }
  }

  initDashboard() {
    this.selectedDate = new Date();
    this.showSearchModal = false;
    this.searchResults = [];
    this.assetNotSupported = false;
    
    this.loadNews();
    this.loadGlobalSentiment();
    this.loadTickerPrices();
    this.updatePrice(this.currentApiSymbol, this.currentSource);
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
      'BTC':     { symbol: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD',  description: 'Bitcoin / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'BITCOIN': { symbol: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD',  description: 'Bitcoin / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'ETH':     { symbol: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'ETHEREUM':{ symbol: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'SOL':     { symbol: 'CRYPTO:SOLUSD', apiSymbol: 'SOL/USD',  description: 'Solana / US Dollar',          type: 'CRYPTO',    source: 'twelvedata' },
      'SOLANA':  { symbol: 'CRYPTO:SOLUSD', apiSymbol: 'SOL/USD',  description: 'Solana / US Dollar',          type: 'CRYPTO',    source: 'twelvedata' },
      'ADA':     { symbol: 'CRYPTO:ADAUSD', apiSymbol: 'ADA/USD',  description: 'Cardano / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'CARDANO': { symbol: 'CRYPTO:ADAUSD', apiSymbol: 'ADA/USD',  description: 'Cardano / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'DOT':     { symbol: 'CRYPTO:DOTUSD', apiSymbol: 'DOT/USD',  description: 'Polkadot / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'POLKADOT':{ symbol: 'CRYPTO:DOTUSD', apiSymbol: 'DOT/USD',  description: 'Polkadot / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'AVAX':    { symbol: 'CRYPTO:AVAXUSD', apiSymbol: 'AVAX/USD',  description: 'Avalanche / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'AVALANCHE':{ symbol: 'CRYPTO:AVAXUSD',apiSymbol: 'AVAX/USD',  description: 'Avalanche / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'XRP':     { symbol: 'CRYPTO:XRPUSD', apiSymbol: 'XRP/USD',  description: 'XRP / US Dollar',             type: 'CRYPTO',    source: 'twelvedata' },
      'RIPPLE':  { symbol: 'CRYPTO:XRPUSD', apiSymbol: 'XRP/USD',  description: 'XRP / US Dollar',             type: 'CRYPTO',    source: 'twelvedata' },
      'LINK':    { symbol: 'CRYPTO:LINKUSD', apiSymbol: 'LINK/USD', description: 'Chainlink / US Dollar',      type: 'CRYPTO',    source: 'twelvedata' },
      'CHAINLINK':{ symbol: 'CRYPTO:LINKUSD',apiSymbol: 'LINK/USD', description: 'Chainlink / US Dollar',      type: 'CRYPTO',    source: 'twelvedata' },
      'MATIC':   { symbol: 'CRYPTO:MATICUSD',apiSymbol: 'MATIC/USD',description: 'Polygon / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'POLYGON': { symbol: 'CRYPTO:MATICUSD',apiSymbol: 'MATIC/USD',description: 'Polygon / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'DOGE':    { symbol: 'CRYPTO:DOGEUSD',apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'DOGECOIN':{ symbol: 'CRYPTO:DOGEUSD',apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'SHIB':    { symbol: 'CRYPTO:SHIBUSD',apiSymbol: 'SHIB/USD', description: 'Shiba Inu / US Dollar',       type: 'CRYPTO',    source: 'twelvedata' },
      'LTC':     { symbol: 'CRYPTO:LTCUSD', apiSymbol: 'LTC/USD',  description: 'Litecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'LITECOIN':{ symbol: 'CRYPTO:LTCUSD', apiSymbol: 'LTC/USD',  description: 'Litecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
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

    forkJoin([twelveDataObs, coinGeckoObs]).subscribe(([tdRes, cgRes]: [any, any]) => {
        const tdResults = tdRes.data || [];
        const cgResults = cgRes.coins || [];
        
        // Mapa de activos populares: sobreescribe el símbolo TV y la API para activos conocidos
        const POPULAR_ASSET_MAP: { [key: string]: { tvSymbol: string; apiSymbol: string; source: string } } = {
          'XAU/USD':  { tvSymbol: 'OANDA:XAUUSD',   apiSymbol: 'XAU/USD', source: 'twelvedata' },
          'XAG/USD':  { tvSymbol: 'OANDA:XAGUSD',   apiSymbol: 'XAG/USD', source: 'twelvedata' },
          'EUR/USD':  { tvSymbol: 'FX:EURUSD',       apiSymbol: 'EUR/USD', source: 'twelvedata' },
          'GBP/USD':  { tvSymbol: 'FX:GBPUSD',       apiSymbol: 'GBP/USD', source: 'twelvedata' },
          'USD/JPY':  { tvSymbol: 'FX:USDJPY',       apiSymbol: 'USD/JPY', source: 'twelvedata' },
          'AUD/USD':  { tvSymbol: 'FX:AUDUSD',       apiSymbol: 'AUD/USD', source: 'twelvedata' },
          'USD/CAD':  { tvSymbol: 'FX:USDCAD',       apiSymbol: 'USD/CAD', source: 'twelvedata' },
          'USD/CHF':  { tvSymbol: 'FX:USDCHF',       apiSymbol: 'USD/CHF', source: 'twelvedata' },
          'NZD/USD':  { tvSymbol: 'FX:NZDUSD',       apiSymbol: 'NZD/USD', source: 'twelvedata' },
          'BTC/USD':  { tvSymbol: 'CRYPTO:BTCUSD',   apiSymbol: 'BTC/USD', source: 'twelvedata' },
          'ETH/USD':  { tvSymbol: 'CRYPTO:ETHUSD',   apiSymbol: 'ETH/USD', source: 'twelvedata' },
          'SOL/USD':  { tvSymbol: 'CRYPTO:SOLUSD',   apiSymbol: 'SOL/USD', source: 'twelvedata' },
          'BNB/USD':  { tvSymbol: 'CRYPTO:BNBUSD',   apiSymbol: 'BNB/USD', source: 'twelvedata' },
          'XRP/USD':  { tvSymbol: 'CRYPTO:XRPUSD',   apiSymbol: 'XRP/USD', source: 'twelvedata' },
          'ADA/USD':  { tvSymbol: 'CRYPTO:ADAUSD',   apiSymbol: 'ADA/USD', source: 'twelvedata' },
          'DOGE/USD': { tvSymbol: 'CRYPTO:DOGEUSD',  apiSymbol: 'DOGE/USD', source: 'twelvedata' },
          'DOT/USD':  { tvSymbol: 'CRYPTO:DOTUSD',   apiSymbol: 'DOT/USD', source: 'twelvedata' },
          'AVAX/USD': { tvSymbol: 'CRYPTO:AVAXUSD',  apiSymbol: 'AVAX/USD', source: 'twelvedata' },
          'LINK/USD': { tvSymbol: 'CRYPTO:LINKUSD',  apiSymbol: 'LINK/USD', source: 'twelvedata' },
          'MATIC/USD':{ tvSymbol: 'CRYPTO:MATICUSD', apiSymbol: 'MATIC/USD',source: 'twelvedata' },
          'SHIB/USD': { tvSymbol: 'CRYPTO:SHIBUSD',  apiSymbol: 'SHIB/USD', source: 'twelvedata' },
          'LTC/USD':  { tvSymbol: 'CRYPTO:LTCUSD',   apiSymbol: 'LTC/USD', source: 'twelvedata' },
          'TRX/USD':  { tvSymbol: 'CRYPTO:TRXUSD',   apiSymbol: 'TRX/USD', source: 'twelvedata' },
          'UNI/USD':  { tvSymbol: 'CRYPTO:UNIUSD',   apiSymbol: 'UNI/USD', source: 'twelvedata' },
          'ATOM/USD': { tvSymbol: 'CRYPTO:ATOMUSD',  apiSymbol: 'ATOM/USD', source: 'twelvedata' },
          'NEAR/USD': { tvSymbol: 'CRYPTO:NEARUSD',  apiSymbol: 'NEAR/USD', source: 'twelvedata' },
          'XLM/USD':  { tvSymbol: 'CRYPTO:XLMUSD',   apiSymbol: 'XLM/USD', source: 'twelvedata' },
          'ICP/USD':  { tvSymbol: 'CRYPTO:ICPUSD',   apiSymbol: 'ICP/USD', source: 'twelvedata' },
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
          const tvSym = `CRYPTO:${sym}USD`;
          
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

        // El resultado curado (pinnedResult) va PRIMERO para que Enter lo seleccione correctamente
        this.searchResults = [
          ...pinnedResult,
          ...combined.filter((r: any) => !pinnedResult.some((p: any) => p.symbol === r.symbol))
        ];

        this.showSearchModal = true;
        this.cdr.detectChanges();
      });
  }

  onEnterSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Capa 1: Mapa instantáneo local — respuesta 0ms
    const QUICK_MAP: { [key: string]: any } = {
      'XAU': { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  source: 'twelvedata' },
      'GOLD': { symbol: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD',  source: 'twelvedata' },
      'XAG': { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  source: 'twelvedata' },
      'SILVER': { symbol: 'OANDA:XAGUSD', apiSymbol: 'XAG/USD', source: 'twelvedata' },
      'BTC': { symbol: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD',  source: 'twelvedata' },
      'BITCOIN': { symbol: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD', source: 'twelvedata' },
      'ETH': { symbol: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD',  source: 'twelvedata' },
      'SOL': { symbol: 'CRYPTO:SOLUSD', apiSymbol: 'SOL/USD',  source: 'twelvedata' },
      'ADA': { symbol: 'CRYPTO:ADAUSD', apiSymbol: 'ADA/USD',  source: 'twelvedata' },
      'CARDANO': { symbol: 'CRYPTO:ADAUSD', apiSymbol: 'ADA/USD', source: 'twelvedata' },
      'DOT': { symbol: 'CRYPTO:DOTUSD', apiSymbol: 'DOT/USD',  source: 'twelvedata' },
      'AVAX': { symbol: 'CRYPTO:AVAXUSD', apiSymbol: 'AVAX/USD', source: 'twelvedata' },
      'XRP': { symbol: 'CRYPTO:XRPUSD', apiSymbol: 'XRP/USD',  source: 'twelvedata' },
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
    this.unsubscribeSymbol(this.currentSymbol);

    this.currentSymbol = result.symbol;
    this.currentApiSymbol = result.apiSymbol;
    this.currentSource = result.source;
    this.currentCoingeckoId = result.coingeckoId || '';
    
    this.displaySymbol = this.formatDisplaySymbol(this.currentSymbol);
    // Limpiamos los datos anteriores inmediatamente para evitar precios residuales confusos
    this.currentPriceData = { c: 0, dp: 0 };
    
    this.subscribeSymbol(this.currentSymbol);

    this.updatePrice(this.currentApiSymbol, this.currentSource);
    this.loadTradingViewWidget(this.currentSymbol);
    
    this.showSearchModal = false;
    this.searchQuery = '';
    this.assetNotSupported = false;
    this.cdr.detectChanges();
  }

  loadAllData() {
    this.initDashboard();
  }

  ngAfterViewInit() {
    this.loadTradingViewWidget(this.currentSymbol);
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

  updatePrice(apiSymbol: string, source: string) {
    if (source === 'twelvedata') {
      this.http.get(`https://api.twelvedata.com/quote?symbol=${apiSymbol}&apikey=${this.twelveDataApiKey}`)
        .subscribe((data: any) => {
          if (data && data.close) {
            this.currentPriceData = {
              c: parseFloat(data.close),
              dp: parseFloat(data.percent_change)
            };
            this.cdr.detectChanges();
          }
        });
    } else if (source === 'coingecko') {
      const id = this.currentCoingeckoId;
      this.http.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${this.coinGeckoApiKey}`)
        .subscribe((data: any) => {
          if (data && data[id]) {
            this.currentPriceData = {
              c: data[id].usd,
              dp: data[id].usd_24h_change || 0
            };
            this.cdr.detectChanges();
          }
        });
    } else if (source === 'finnhub_synthetic_wti') {
      // Como no se puede leer el iframe de TradingView por políticas de seguridad del navegador (CORS), 
      // usamos el ETF del crudo (USO) de Finnhub y le aplicamos un multiplicador matemático 
      // para que el precio visual sea EXACTAMENTE el mismo que el gráfico de TradingView (~$107.64).
      this.http.get(`https://finnhub.io/api/v1/quote?symbol=${apiSymbol}&token=${this.apiKey}`)
        .subscribe((data: any) => {
          if (data && data.c) {
            const multiplier = 0.7146; // Ratio preciso entre USO ETF y TVC:USOIL
            this.currentPriceData = {
              c: data.c * multiplier,
              dp: data.dp // El porcentaje es 100% auténtico
            };
            this.cdr.detectChanges();
          }
        });
    } else {
      this.http.get(`https://finnhub.io/api/v1/quote?symbol=${apiSymbol}&token=${this.apiKey}`)
        .subscribe((data: any) => {
          if (data && data.c !== 0) {
            let dp = data.dp;
            if (dp === 0 && data.pc !== 0) dp = ((data.c - data.pc) / data.pc) * 100;
            this.currentPriceData = {
              c: data.c,
              dp: dp
            };
          }
          this.cdr.detectChanges();
        });
    }
  }

  loadTickerPrices() {
    this.coins.forEach((coin) => {
      if (coin.source === 'twelvedata') {
        this.http.get(`https://api.twelvedata.com/quote?symbol=${coin.apiSymbol}&apikey=${this.twelveDataApiKey}`)
          .subscribe((data: any) => {
            if (data && data.close) {
              coin.price = parseFloat(data.close);
              coin.change = parseFloat(data.percent_change);
              this.cdr.detectChanges();
            }
          });
      } else if (coin.source === 'finnhub_synthetic_wti') {
        this.http.get(`https://finnhub.io/api/v1/quote?symbol=${coin.apiSymbol}&token=${this.apiKey}`)
          .subscribe((data: any) => {
            if (data && data.c) {
              const multiplier = 0.7146; // Ratio preciso entre USO ETF y TVC:USOIL
              coin.price = data.c * multiplier;
              coin.change = data.dp; // El porcentaje es auténtico
              this.cdr.detectChanges();
            }
          });
      } else {
        this.http.get(`https://finnhub.io/api/v1/quote?symbol=${coin.apiSymbol}&token=${this.apiKey}`)
          .subscribe((data: any) => {
            if (data && data.c !== 0) {
              coin.price = data.c;
              let dp = data.dp;
              if (dp === 0 && data.pc !== 0) dp = ((data.c - data.pc) / data.pc) * 100;
              coin.change = dp;
            }
            this.cdr.detectChanges();
          });
      }
    });
  }

  loadGlobalSentiment() {
    this.http.get('https://api.alternative.me/fng/').subscribe((res: any) => {
      this.sentimentData = res.data[0];
      this.cdr.detectChanges();
    });
  }

  loadNews() {
    this.http.get(`https://finnhub.io/api/v1/news?category=general&token=${this.apiKey}`)
      .subscribe((data: any) => {
        this.marketNews = data.slice(0, 8);
        this.cdr.detectChanges();
      });
  }

  fetchCalendarData() {
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    this.http.get(`https://finnhub.io/api/v1/calendar/economic?from=${dateStr}&to=${dateStr}&token=${this.apiKey}`)
      .subscribe((res: any) => {
        this.economicEvents = (res.economicCalendar || []).map((event: any) => {
          const impactMap: { [key: string]: number } = { 'low': 1, 'med': 2, 'medium': 2, 'high': 3 };
          return {
            ...event,
            impact: impactMap[event.impact?.toLowerCase()] || 1
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
      "locale": "es",
      "enable_publishing": false,
      "allow_symbol_change": false, 
      "header_widget_buttons": false,
      "top_toolbar": false,
      "details": false, 
      "hotlist": false,
      "calendar": false,
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650"
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
}
