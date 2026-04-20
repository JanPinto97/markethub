import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { MarketService } from '../../core/services/market.service';
import { FormsModule } from '@angular/forms';

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
  
  widget: any;
  currentSymbol: string = 'BTCUSD';
  displaySymbol: string = 'BTC / USD';
  currentPriceData: any = { c: 0, dp: 0 };
  currentYear = new Date().getFullYear();
  selectedDate: Date = new Date();
  
  tickerItems = [
    { symbol: 'BTC/USD', price: '...', change: '...', up: true },
    { symbol: 'EUR/USD', price: '...', change: '...', up: true },
    { symbol: 'GOLD', price: '...', change: '...', up: false },
    { symbol: 'S&P 500', price: '...', change: '...', up: true }
  ];

  economicEvents: any[] = [];
  filteredEvents: any[] = [];
  marketNews: any[] = [];
  globalSentiment: any = { value: 0, classification: '...' };

  // Filtros del calendario
  filters = {
    impact: ['high', 'medium', 'low'],
    currencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF']
  };

  constructor(private marketService: MarketService) {}

  ngOnInit() {
    this.updatePrice(this.currentSymbol);
    this.loadTickerData();
    this.loadSentiment();
    this.loadNews();
    this.fetchCalendar();
  }

  ngAfterViewInit() {
    this.loadTradingViewWidget(this.currentSymbol);
  }

  // MÉTODO PARA RENDERIZAR EL WIDGET AVANZADO
  loadTradingViewWidget(symbol: string): void {
    // Si ya existe un widget, lo eliminamos (opcional, el constructor suele manejarlo si el ID es el mismo)
    new TradingView.widget({
      "container_id": "tv_chart_container",
      "autosize": true,
      "symbol": symbol,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "light",
      "style": "1", // Velas japonesas
      "locale": "es",
      "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
      "withdateranges": true,
      "hide_side_toolbar": false,
      "allow_symbol_change": true,
      "details": true,
      "hotlist": true,
      "calendar": true,
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650"
    });
  }

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
        this.tickerItems[index].price = data.c.toLocaleString();
        this.tickerItems[index].change = (data.dp >= 0 ? '+' : '') + data.dp.toFixed(2) + '%';
        this.tickerItems[index].up = data.dp >= 0;
      });
    });
  }

  loadSentiment() {
    this.marketService.getGlobalSentiment().subscribe(res => {
      if (res.data && res.data.length > 0) {
        this.globalSentiment = {
          value: res.data[0].value,
          classification: res.data[0].value_classification
        };
      }
    });
  }

  loadNews() {
    this.marketService.getMarketNews().subscribe(data => {
      this.marketNews = data.slice(0, 5);
    });
  }

  // Lógica del Calendario
  fetchCalendar() {
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    this.marketService.getEconomicCalendar(dateStr, dateStr).subscribe(data => {
      // Ajustamos según la respuesta de Finnhub
      this.economicEvents = data.economicCalendar || [];
      this.applyFilters();
    });
  }

  applyFilters() {
    this.filteredEvents = this.economicEvents.filter(event => {
      const impactMap: any = { 1: 'low', 2: 'medium', 3: 'high' };
      const eventImpact = impactMap[event.impact] || 'low';
      
      return this.filters.impact.includes(eventImpact) && 
             this.filters.currencies.includes(event.country);
    });
  }

  changeDate(days: number) {
    this.selectedDate = new Date(this.selectedDate.setDate(this.selectedDate.getDate() + days));
    this.fetchCalendar();
  }

  goToday() {
    this.selectedDate = new Date();
    this.fetchCalendar();
  }
}
