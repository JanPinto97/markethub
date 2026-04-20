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
  lastSentimentUpdate: string = '';
  
  tickerData = [
    { symbol: 'BTC/USD', price: 0, change: 0, up: true },
    { symbol: 'EUR/USD', price: 0, change: 0, up: true },
    { symbol: 'GOLD', price: 0, change: 0, up: false },
    { symbol: 'S&P 500', price: 0, change: 0, up: true }
  ];

  economicEvents: any[] = [];
  filteredEvents: any[] = [];
  marketNews: any[] = [];
  sentimentData: any = { value: 0, value_classification: '...' };

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
      "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
      "withdateranges": true,
      "hide_side_toolbar": false,
      "allow_symbol_change": false, // Limpieza: quitamos buscador interno
      "header_widget_buttons": false, // Limpieza: quitamos botones de cabecera
      "top_toolbar": false, // Limpieza: quitamos toda la barra superior del widget
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
