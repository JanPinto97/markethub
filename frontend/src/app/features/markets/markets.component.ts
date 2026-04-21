import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
export class MarketsComponent implements OnInit, AfterViewInit {
  @ViewChild('symbolInput') symbolInput!: ElementRef;
  
  // CONFIGURACIÓN (API Key de Finnhub)
  private apiKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  
  widget: any;
  currentSymbol: string = 'BINANCE:BTCUSDT';
  displaySymbol: string = 'BTC / USD';
  currentPriceData: any = { c: 0, dp: 0 };
  currentYear = new Date().getFullYear();
  selectedDate: Date = new Date();
  lastSentimentUpdate: string = '';
  
<<<<<<< HEAD
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
=======
  tickerData = [
    { symbol: 'BTC/USD', price: 0, change: 0, up: true },
    { symbol: 'EUR/USD', price: 0, change: 0, up: true },
    { symbol: 'GOLD', price: 0, change: 0, up: false },
    { symbol: 'S&P 500', price: 0, change: 0, up: true }
>>>>>>> dev
  ];

  economicEvents: any[] = [];
  filteredEvents: any[] = [];
  marketNews: any[] = [];
  sentimentData: any = { value: 0, value_classification: '...' };

<<<<<<< HEAD
  constructor(private http: HttpClient) {}
=======
  constructor(private marketService: MarketService) {}
>>>>>>> dev

  ngOnInit() {
    // Carga inicial masiva
    this.loadAllData();
  }

  loadAllData() {
    this.updatePrice(this.currentSymbol);
    this.loadTickerPrices();
    this.loadGlobalSentiment();
    this.loadNews();
    this.fetchCalendarData();
  }

  ngAfterViewInit() {
    this.loadTradingViewWidget(this.currentSymbol);
  }

<<<<<<< HEAD
  // Símbolo dinámico inteligente
  formatDisplaySymbol(symbol: string) {
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('USD')) {
       return symbol.replace('USD', ' / USD').replace('BINANCE:', '').replace('FX_IDC:', '').replace(':', ' / ');
    }
    // Si es un Stock o Índice (ej: AAPL, SPX) lo dejamos limpio
    return symbol.split(':').pop() || symbol;
  }

  onSymbolSearch(value: string) {
    if (!value) return;
    let formattedSymbol = value.toUpperCase().trim();
    this.currentSymbol = formattedSymbol;
    this.displaySymbol = this.formatDisplaySymbol(this.currentSymbol);
    this.loadTradingViewWidget(this.currentSymbol);
    this.updatePrice(this.currentSymbol);
  }

  // CONEXIÓN FINNHUB REAL
  updatePrice(symbol: string) {
    const cleanSym = symbol.includes(':') ? symbol : symbol; 
    this.http.get(`https://finnhub.io/api/v1/quote?symbol=${cleanSym}&token=${this.apiKey}`)
      .subscribe((data: any) => {
        this.currentPriceData = data;
      });
  }

  loadTickerPrices() {
    this.coins.forEach((coin) => {
      this.http.get(`https://finnhub.io/api/v1/quote?symbol=${coin.tech}&token=${this.apiKey}`)
        .subscribe((data: any) => {
          coin.price = data.c;
          coin.change = data.dp;
        });
    });
  }

  loadGlobalSentiment() {
    this.http.get('https://api.alternative.me/fng/').subscribe((res: any) => {
      this.sentimentData = res.data[0];
      const date = new Date();
      this.lastSentimentUpdate = date.toLocaleString('en-US', { 
        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
      }).replace(',', ' at') + ' ET';
    });
  }

  loadNews() {
    this.http.get(`https://finnhub.io/api/v1/news?category=general&token=${this.apiKey}`)
      .subscribe((data: any) => {
        this.marketNews = data.slice(0, 8);
      });
  }

  fetchCalendarData() {
    const date = this.selectedDate.toISOString().split('T')[0];
    this.http.get(`https://finnhub.io/api/v1/calendar/economic?from=${date}&to=${date}&token=${this.apiKey}`)
      .subscribe((res: any) => {
        this.economicEvents = res.economicCalendar || [];
        this.applyFilters();
      });
  }

  // --- MÉTODOS TRADINGVIEW ---
=======
>>>>>>> dev
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
<<<<<<< HEAD
      "allow_symbol_change": false, 
      "header_widget_buttons": false,
      "top_toolbar": false,
      "details": false, 
      "hotlist": false,
      "calendar": false,
=======
      "withdateranges": true,
      "hide_side_toolbar": false,
      "allow_symbol_change": false, // Limpieza: quitamos buscador interno
      "header_widget_buttons": false, // Limpieza: quitamos botones de cabecera
      "top_toolbar": false, // Limpieza: quitamos toda la barra superior del widget
      "details": true,
      "hotlist": true,
      "calendar": true,
>>>>>>> dev
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650"
    });
  }

<<<<<<< HEAD
  applyFilters() {
    // Ordenamos por impacto para asegurar visibilidad
    this.filteredEvents = this.economicEvents.sort((a, b) => b.impact - a.impact);
=======
  onSymbolSearch(value: string) {
    if (!value) return;
    let formattedSymbol = value.toUpperCase().trim();
    if (!formattedSymbol.includes(':') && formattedSymbol.length <= 4) {
      formattedSymbol = `${formattedSymbol}USD`;
    }
    this.currentSymbol = formattedSymbol;
    this.displaySymbol = this.currentSymbol.replace('USD', ' / USD').replace(':', ' / ');
    this.loadTradingViewWidget(this.currentSymbol);
    this.updatePrice(this.currentSymbol);
  }

  updatePrice(symbol: string) {
    this.marketService.getSymbolPrice(symbol).subscribe(data => {
      this.currentPriceData = data;
    });
  }

  loadTickerData() {
    const tickerSymbols = ['BINANCE:BTCUSDT', 'FX_IDC:EURUSD', 'OANDA:XAUUSD', 'FOREXCOM:SPXUSD'];
    tickerSymbols.forEach((sym, index) => {
      this.marketService.getSymbolPrice(sym).subscribe(data => {
        this.tickerData[index].price = data.c;
        this.tickerData[index].change = data.dp;
        this.tickerData[index].up = data.dp >= 0;
      });
    });
  }

  loadSentiment() {
    this.marketService.getGlobalSentiment().subscribe((res: any) => {
      this.sentimentData = res.data[0];
      // Formateo exacto: Apr 20 at 2:36:46 PM ET
      const date = new Date();
      this.lastSentimentUpdate = date.toLocaleString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      }).replace(',', ' at') + ' ET';
    });
  }

  loadNews() {
    this.marketService.getMarketNews().subscribe(data => {
      this.marketNews = data.slice(0, 5);
    });
  }

  fetchCalendar() {
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    this.marketService.getEconomicCalendar(dateStr, dateStr).subscribe(data => {
      this.economicEvents = data.economicCalendar || [];
      this.applyFilters();
    });
  }

  applyFilters() {
    this.filteredEvents = this.economicEvents.filter(event => {
      const impactMap: any = { 1: 'low', 2: 'medium', 3: 'high' };
      const eventImpact = impactMap[event.impact] || 'low';
      return ['high', 'medium', 'low'].includes(eventImpact);
    });
>>>>>>> dev
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
