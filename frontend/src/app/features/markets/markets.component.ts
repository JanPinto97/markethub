import { Component, OnInit, AfterViewInit } from '@angular/core';
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
  widget: any;
  currentSymbol: string = 'BINANCE:BTCUSDT';
  displaySymbol: string = 'BTC / USD';
  currentPrice: any = { c: 0, dp: 0 };
  currentYear = new Date().getFullYear();
  selectedDate = new Date();
  
  tickerItems = [
    { symbol: 'BTC/USD', price: '...', change: '...', up: true },
    { symbol: 'EUR/USD', price: '...', change: '...', up: true },
    { symbol: 'GOLD', price: '...', change: '...', up: false },
    { symbol: 'S&P 500', price: '...', change: '...', up: true }
  ];

  calendarEvents: any[] = [];
  marketNews: any[] = [];
  globalSentiment: any = { value: 0, classification: '...' };
  searchQuery: string = '';

  constructor(private marketService: MarketService) {}

  ngOnInit() {
    this.loadMarketData();
    this.loadSentiment();
    this.loadNews();
    this.loadCalendar();
  }

  ngAfterViewInit() {
    this.initTradingViewWidget(this.currentSymbol);
  }

  initTradingViewWidget(symbol: string) {
    // Si ya existe un widget, lo eliminamos (o simplemente reiniciamos el contenedor)
    const container = document.getElementById('tv_chart_container');
    if (container) container.innerHTML = '';

    this.widget = new TradingView.widget({
      "container_id": "tv_chart_container",
      "autosize": true,
      "symbol": symbol,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "light",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
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

  loadMarketData() {
    // Cargar precio inicial para el overlay
    this.marketService.getSymbolPrice(this.currentSymbol).subscribe(data => {
      this.currentPrice = data;
    });

    // Cargar datos para el ticker (simulado con algunos símbolos principales)
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
      this.marketNews = data.slice(0, 3); // Solo cogemos las 3 primeras
    });
  }

  loadCalendar() {
    const today = new Date().toISOString().split('T')[0];
    this.marketService.getEconomicCalendar(today, today).subscribe(data => {
      this.calendarEvents = data.slice(0, 5);
    });
  }

  onSymbolSearch() {
    if (!this.searchQuery) return;
    
    // Si no contiene exchange, asumimos BINANCE para crypto o buscamos tal cual
    let symbolToSearch = this.searchQuery.toUpperCase();
    if (!symbolToSearch.includes(':')) {
      // Lógica simple de mapeo (mejorable)
      if (['BTC', 'ETH', 'SOL'].includes(symbolToSearch)) {
        symbolToSearch = `BINANCE:${symbolToSearch}USDT`;
      }
    }

    this.currentSymbol = symbolToSearch;
    this.displaySymbol = this.searchQuery.toUpperCase().replace(':', ' / ');
    
    this.initTradingViewWidget(this.currentSymbol);
    
    this.marketService.getSymbolPrice(this.currentSymbol).subscribe(data => {
      this.currentPrice = data;
    });

    this.searchQuery = '';
  }

  changeDate(days: number) {
    this.selectedDate.setDate(this.selectedDate.getDate() + days);
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    this.marketService.getEconomicCalendar(dateStr, dateStr).subscribe(data => {
      this.calendarEvents = data.slice(0, 5);
    });
  }
}
