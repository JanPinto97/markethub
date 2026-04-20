import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketService } from '../../core/services/market.service';
import { createChart, IChartApi, CandlestickSeries } from 'lightweight-charts';

@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './markets.component.html',
  styleUrls: ['./markets.component.css']
})
export class MarketsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef;
  private chart!: IChartApi;
  
  // Datos dinámicos inicializados
  tickerItems = [
    { symbol: 'BTC/USD', price: '64,241.50', change: '+2.4%', up: true },
    { symbol: 'EUR/USD', price: '1.0842', change: '-0.02%', up: false },
    { symbol: 'GOLD', price: '2,345.10', change: '-0.4%', up: false },
    { symbol: 'SPX', price: '5,432.12', change: '+0.15%', up: true }
  ];

  constructor(private marketService: MarketService) {}

  ngOnInit() {
    this.loadTickerData();
  }

  ngAfterViewInit() {
    this.initChart();
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.remove();
    }
  }

  loadTickerData() {
    const symbols = 'BTC/USD,EUR/USD,GOLD,SPX';
    this.marketService.getPrices(symbols).subscribe(data => {
      // Mapeamos los datos de la API a nuestro array del ticker
      // Nota: Si la API devuelve un solo objeto en lugar de un mapa por falta de créditos,
      // aquí lo manejamos con fallback.
      if (data) {
        if (data['BTC/USD']) this.tickerItems[0].price = data['BTC/USD'].price;
        if (data['EUR/USD']) this.tickerItems[1].price = data['EUR/USD'].price;
        if (data['GOLD']) this.tickerItems[2].price = data['GOLD'].price;
        if (data['SPX']) this.tickerItems[3].price = data['SPX'].price;
      }
    }, error => {
      console.error('Error loading ticker data:', error);
    });
  }

  initChart() {
    setTimeout(() => {
      if (!this.chartContainer) return;

      this.chart = createChart(this.chartContainer.nativeElement, {
        width: this.chartContainer.nativeElement.offsetWidth,
        height: 450,
        layout: { 
          background: { color: 'transparent' }, 
          textColor: '#191c1e' 
        },
        grid: { 
          vertLines: { visible: false }, 
          horzLines: { color: '#f0f3fa' } 
        },
      });

      const series = this.chart.addSeries(CandlestickSeries, {
        upColor: '#006c49', 
        downColor: '#ba1a1a', 
        borderVisible: false, 
        wickUpColor: '#006c49', 
        wickDownColor: '#ba1a1a'
      });

      // Cargar histórico real de BTC/USD
      this.marketService.getHistory('BTC/USD', '1h').subscribe(res => {
        if (res && res.values) {
          const formattedData = res.values.map((v: any) => ({
            time: new Date(v.datetime).getTime() / 1000,
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close)
          })).sort((a: any, b: any) => a.time - b.time); // Aseguramos orden cronológico

          series.setData(formattedData);
        }
      }, error => {
        console.error('Error loading chart data:', error);
      });

      // Responsive chart
      const resizeObserver = new ResizeObserver(entries => {
        if (this.chart && entries[0].contentRect.width) {
          this.chart.applyOptions({ width: entries[0].contentRect.width });
        }
      });
      resizeObserver.observe(this.chartContainer.nativeElement);
    }, 100);
  }
}
