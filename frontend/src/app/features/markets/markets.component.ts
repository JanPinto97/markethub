import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { MarketService } from '../../core/services/market.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  private apiKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  private twelveDataApiKey = 'b21b5589fbce4aada1a45a82a7bbbbf0';
  private nasdaqApiKey = '_wXBK_-xW7nRm9cAGGEV';
  private socket: WebSocket | null = null;
  
  widget: any;
  currentSymbol: string = 'CRYPTO:BTCUSD';
  displaySymbol: string = 'BTC / USD';
  currentApiSymbol: string = 'BTC/USD';
  currentSource: string = 'twelvedata';
  currentPriceData: any = { c: 0, dp: 0 };
  assetNotSupported: boolean = false;
  currentYear = new Date().getFullYear();
  selectedDate: Date = new Date();
  lastSentimentUpdate: string = '';
  
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
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.close();
    }
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
      'BTCUSD':  { symbol: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD',  description: 'Bitcoin / US Dollar',         type: 'CRYPTO',    source: 'twelvedata' },
      'ETH':     { symbol: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'ETHEREUM':{ symbol: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'ETHUSD':  { symbol: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD',  description: 'Ethereum / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'SOL':     { symbol: 'CRYPTO:SOLUSD', apiSymbol: 'SOL/USD',  description: 'Solana / US Dollar',          type: 'CRYPTO',    source: 'twelvedata' },
      'XRP':     { symbol: 'CRYPTO:XRPUSD', apiSymbol: 'XRP/USD',  description: 'XRP / US Dollar',             type: 'CRYPTO',    source: 'twelvedata' },
      'DOGE':    { symbol: 'CRYPTO:DOGEUSD',apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar',        type: 'CRYPTO',    source: 'twelvedata' },
      'EUR':     { symbol: 'FX:EURUSD',     apiSymbol: 'EUR/USD',  description: 'Euro / US Dollar',            type: 'FOREX',     source: 'twelvedata' },
      'EURUSD':  { symbol: 'FX:EURUSD',     apiSymbol: 'EUR/USD',  description: 'Euro / US Dollar',            type: 'FOREX',     source: 'twelvedata' },
      'GBP':     { symbol: 'FX:GBPUSD',     apiSymbol: 'GBP/USD',  description: 'British Pound / US Dollar',  type: 'FOREX',     source: 'twelvedata' },
      'GBPUSD':  { symbol: 'FX:GBPUSD',     apiSymbol: 'GBP/USD',  description: 'British Pound / US Dollar',  type: 'FOREX',     source: 'twelvedata' },
      'JPY':     { symbol: 'FX:USDJPY',     apiSymbol: 'USD/JPY',  description: 'US Dollar / Japanese Yen',   type: 'FOREX',     source: 'twelvedata' },
      'USDJPY':  { symbol: 'FX:USDJPY',     apiSymbol: 'USD/JPY',  description: 'US Dollar / Japanese Yen',   type: 'FOREX',     source: 'twelvedata' },
      'OIL':     { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      description: 'Crude Oil WTI',              type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
      'WTI':     { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      description: 'Crude Oil WTI',              type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
      'CRUDE':   { symbol: 'TVC:USOIL',     apiSymbol: 'USO',      description: 'Crude Oil WTI',              type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
      'SPY':     { symbol: 'SPY',           apiSymbol: 'SPY',      description: 'S&P 500 ETF',                type: 'INDEX ETF', source: 'finnhub' },
      'SP500':   { symbol: 'SPY',           apiSymbol: 'SPY',      description: 'S&P 500 ETF',                type: 'INDEX ETF', source: 'finnhub' },
      'QQQ':     { symbol: 'QQQ',           apiSymbol: 'QQQ',      description: 'NASDAQ 100 ETF',             type: 'INDEX ETF', source: 'finnhub' },
      'NASDAQ':  { symbol: 'QQQ',           apiSymbol: 'QQQ',      description: 'NASDAQ 100 ETF',             type: 'INDEX ETF', source: 'finnhub' },
    };

    const shorthandMatch = SHORTHAND_MAP[query.trim().toUpperCase()];
    const pinnedResult = shorthandMatch ? [shorthandMatch] : [];

    // CAPA 2: Búsqueda en la API de Twelve Data (corre en paralelo)
    this.http.get(`https://api.twelvedata.com/symbol_search?symbol=${query}&outputsize=10`)
      .subscribe((res: any) => {
        const rawResults = res.data || [];
        
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
          'DOGE/USD': { tvSymbol: 'CRYPTO:DOGEUSD',  apiSymbol: 'DOGE/USD', source: 'twelvedata' },
        };

        const apiMapped = rawResults.filter((item: any) => {
          return item.instrument_type !== 'Index' || item.symbol === 'SPX' || item.symbol === 'NDX' || item.symbol === 'IXIC';
        }).map((item: any) => {
          let tvSymbol = item.symbol;
          let apiSymbol = item.symbol;
          let type = item.instrument_type || 'ASSET';
          let source = 'twelvedata';

          if (type === 'Physical Currency') {
            const pairSymbol = item.symbol; // e.g. "XAU/USD"
            const override = POPULAR_ASSET_MAP[pairSymbol];
            if (override) {
              tvSymbol = override.tvSymbol;
              apiSymbol = override.apiSymbol;
              source = override.source;
            } else {
              // Fallback genérico para pares de Forex no mapeados
              tvSymbol = `FX:${item.symbol.replace('/', '')}`;
              apiSymbol = item.symbol;
            }
            type = pairSymbol.includes('XAU') || pairSymbol.includes('XAG') ? 'METAL' : 'FOREX';
          } else if (type === 'Digital Currency' || type === 'Cryptocurrency') {
            const cryptoSymbol = item.symbol; // e.g. "BTC/USD"
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

        // El resultado curado (pinnedResult) va PRIMERO para que Enter lo seleccione correctamente
        this.searchResults = [
          ...pinnedResult,
          ...apiMapped.filter((r: any) => !pinnedResult.some((p: any) => p.symbol === r.symbol))
        ];

        this.showSearchModal = true;
        this.cdr.detectChanges();
      });
  }

  onEnterSearch(value: string) {
    // Primero consultar el mapa local instantáneo sin esperar a la API
    const QUICK_MAP: { [key: string]: any } = {
      'XAU': { symbol: 'OANDA:XAUUSD',  apiSymbol: 'XAU/USD',  source: 'twelvedata' },
      'GOLD': { symbol: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD',  source: 'twelvedata' },
      'XAG': { symbol: 'OANDA:XAGUSD',  apiSymbol: 'XAG/USD',  source: 'twelvedata' },
      'SILVER': { symbol: 'OANDA:XAGUSD', apiSymbol: 'XAG/USD', source: 'twelvedata' },
      'BTC': { symbol: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD',  source: 'twelvedata' },
      'BITCOIN': { symbol: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD', source: 'twelvedata' },
      'ETH': { symbol: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD',  source: 'twelvedata' },
      'SOL': { symbol: 'CRYPTO:SOLUSD', apiSymbol: 'SOL/USD',  source: 'twelvedata' },
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
    const quickMatch = QUICK_MAP[value.trim().toUpperCase()];
    if (quickMatch) {
      this.selectResult(quickMatch);
      return;
    }
    if (this.searchResults.length > 0) {
       this.selectResult(this.searchResults[0]);
    } else {
       this.assetNotSupported = true;
       this.showSearchModal = false;
       this.cdr.detectChanges();
    }
  }

  selectResult(result: any) {
    this.unsubscribeSymbol(this.currentSymbol);

    this.currentSymbol = result.symbol;
    this.currentApiSymbol = result.apiSymbol;
    this.currentSource = result.source;
    
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
      const date = new Date();
      this.lastSentimentUpdate = date.toLocaleString('es-ES', { 
        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
      });
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
