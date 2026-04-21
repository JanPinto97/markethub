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

  economicEvents: any[] = [];
  filteredEvents: any[] = [];
  marketNews: any[] = [];
  sentimentData: any = { value: 0, value_classification: '...' };

  constructor(private http: HttpClient) {}

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

  applyFilters() {
    // Ordenamos por impacto para asegurar visibilidad
    this.filteredEvents = this.economicEvents.sort((a, b) => b.impact - a.impact);
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
