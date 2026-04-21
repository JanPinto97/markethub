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

  // CONFIGURACIÓN (API Key de Finnhub)
  private apiKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  private socket: WebSocket | null = null;
  
  widget: any;
  currentSymbol: string = 'BINANCE:BTCUSDT';
  displaySymbol: string = 'BTC / USD';
  currentPriceData: any = { c: 0, dp: 0 };
  currentYear = new Date().getFullYear();
  selectedDate: Date = new Date();
  lastSentimentUpdate: string = '';
  
  // Ticker extendido y real
  coins: any[] = [
    { symbol: 'BTC/USD', tech: 'BINANCE:BTCUSDT', price: 0, change: 0 },
    { symbol: 'ETH/USD', tech: 'BINANCE:ETHUSDT', price: 0, change: 0 },
    { symbol: 'EUR/USD', tech: 'FX_IDC:EURUSD', price: 0, change: 0 },
    { symbol: 'S&P 500', tech: 'FOREXCOM:SPXUSD', price: 0, change: 0 },
    { symbol: 'GOLD', tech: 'OANDA:XAUUSD', price: 0, change: 0 },
    { symbol: 'NASDAQ', tech: 'NASDAQ:NDX', price: 0, change: 0 },
    { symbol: 'AAPL', tech: 'AAPL', price: 0, change: 0 },
    { symbol: 'NVDA', tech: 'NVDA', price: 0, change: 0 },
    { symbol: 'TSLA', tech: 'TSLA', price: 0, change: 0 },
    { symbol: 'CRUDE OIL', tech: 'TVC:USOIL', price: 0, change: 0 }
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
    
    this.loadNews();
    this.loadGlobalSentiment();
    this.loadTickerPrices();
    this.updatePrice(this.currentSymbol);
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
    // Cuando está vacío, mostramos nuestros activos principales
    this.searchResults = this.coins.map(c => ({
      symbol: c.tech,
      description: c.symbol,
      type: 'POPULAR'
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

    this.http.get(`https://finnhub.io/api/v1/search?q=${query}&token=${this.apiKey}`)
      .subscribe((res: any) => {
        this.searchResults = (res.result || []).slice(0, 10);
        this.showSearchModal = true;
        this.cdr.detectChanges();
      });
  }

  selectResult(result: any) {
    this.onSymbolSearch(result.symbol);
    this.showSearchModal = false;
    this.searchQuery = '';
    // Limpiamos el input físicamente en el HTML se hace con binding
  }

  loadAllData() {
    this.initDashboard();
  }

  ngAfterViewInit() {
    this.loadTradingViewWidget(this.currentSymbol);
  }

  formatDisplaySymbol(symbol: string) {
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('USD')) {
       return symbol.replace('USD', ' / USD').replace('BINANCE:', '').replace('FX_IDC:', '').replace(':', ' / ');
    }
    return symbol.split(':').pop() || symbol;
  }

  onSymbolSearch(value: string) {
    if (!value) return;
    let formattedSymbol = value.toUpperCase().trim();
    
    // Desuscribimos del anterior si no está en el ticker constante
    if (!this.coins.some(c => c.tech === this.currentSymbol)) {
      this.unsubscribeSymbol(this.currentSymbol);
    }

    this.currentSymbol = formattedSymbol;
    this.displaySymbol = this.formatDisplaySymbol(this.currentSymbol);
    
    // Suscribimos al nuevo símbolo para tiempo real
    this.subscribeSymbol(this.currentSymbol);

    this.updatePrice(this.currentSymbol);
    this.loadTradingViewWidget(this.currentSymbol);
    this.cdr.detectChanges();
  }

  updatePrice(symbol: string) {
    this.http.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`)
      .subscribe((data: any) => {
        // Aseguramos que si no hay datos (0), mostramos algo coherente o esperamos el siguiente tick
        this.currentPriceData = data;
        this.cdr.detectChanges();
      });
  }

  loadTickerPrices() {
    this.coins.forEach((coin) => {
      this.http.get(`https://finnhub.io/api/v1/quote?symbol=${coin.tech}&token=${this.apiKey}`)
        .subscribe((data: any) => {
          coin.price = data.c;
          coin.change = data.dp;
          this.cdr.detectChanges();
        });
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
