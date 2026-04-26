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
  
  // 1. SÍMBOLOS Y ETIQUETAS (Dual API Strategy)
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
    { symbol: 'CRUDE OIL (WTI)', tech: 'TVC:USOIL', apiSymbol: 'WTI', source: 'twelvedata', price: 0, change: 0 }
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

    // Buscador Potenciado por Twelve Data (Soporta Forex, Cripto y Acciones Mundiales)
    this.http.get(`https://api.twelvedata.com/symbol_search?symbol=${query}&outputsize=10`)
      .subscribe((res: any) => {
        const rawResults = res.data || [];
        
        this.searchResults = rawResults.filter((item: any) => {
          return item.instrument_type !== 'Index' || item.symbol === 'SPX' || item.symbol === 'NDX' || item.symbol === 'IXIC';
        }).map((item: any) => {
          let tvSymbol = item.symbol;
          let apiSymbol = item.symbol;
          let type = item.instrument_type || 'ASSET';
          let source = 'twelvedata';

          if (type === 'Physical Currency') {
            tvSymbol = `FX:${item.symbol.replace('/', '')}`;
            type = 'FOREX';
          } else if (type === 'Digital Currency' || type === 'Cryptocurrency') {
            tvSymbol = `CRYPTO:${item.symbol.replace('/', '')}`;
            type = 'CRYPTO';
          } else if (type === 'Common Stock') {
            source = 'finnhub'; // Las acciones de US siguen por Finnhub
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

        this.showSearchModal = true;
        this.cdr.detectChanges();
      });
  }

  onEnterSearch(value: string) {
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
