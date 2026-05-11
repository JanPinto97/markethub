import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';

interface TickerCoin {
  symbol: string;
  tech: string;
  apiSymbol: string;
  source: 'twelvedata' | 'finnhub' | 'finnhub_synthetic_wti';
  price: number;
  change: number;
}

@Component({
  selector: 'app-ticker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticker.component.html',
  styleUrl: './ticker.component.css',
})
export class TickerComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  private readonly finnhubKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  private readonly twelveDataKey = 'b21b5589fbce4aada1a45a82a7bbbbf0';

  coins: TickerCoin[] = [
    { symbol: 'BTC/USD',           tech: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD', source: 'twelvedata',           price: 0, change: 0 },
    { symbol: 'ETH/USD',           tech: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD', source: 'twelvedata',           price: 0, change: 0 },
    { symbol: 'EUR/USD',           tech: 'FX:EURUSD',      apiSymbol: 'EUR/USD', source: 'twelvedata',           price: 0, change: 0 },
    { symbol: 'S&P 500 (SPY)',     tech: 'SPY',            apiSymbol: 'SPY',     source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'GOLD (XAU)',        tech: 'OANDA:XAUUSD',   apiSymbol: 'XAU/USD', source: 'twelvedata',           price: 0, change: 0 },
    { symbol: 'NASDAQ 100 (QQQ)',  tech: 'QQQ',            apiSymbol: 'QQQ',     source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'AAPL',              tech: 'AAPL',           apiSymbol: 'AAPL',    source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'NVDA',              tech: 'NVDA',           apiSymbol: 'NVDA',    source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'TSLA',              tech: 'TSLA',           apiSymbol: 'TSLA',    source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'CRUDE OIL (WTI)',   tech: 'TVC:USOIL',      apiSymbol: 'USO',     source: 'finnhub_synthetic_wti', price: 0, change: 0 },
  ];

  private pollId: ReturnType<typeof setInterval> | null = null;
  private twelveDataExhausted = false;

  ngOnInit(): void {
    this.hydrateFromCache();
    this.refreshAll();
    this.pollId = setInterval(() => this.refreshAll(), 8000);
    this.destroyRef.onDestroy(() => {
      if (this.pollId) clearInterval(this.pollId);
    });
  }

  private hydrateFromCache(): void {
    try {
      const raw = localStorage.getItem('markethub_state');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.date !== new Date().toDateString()) return;
      const cache = parsed.tickerPrices;
      if (!cache) return;
      this.coins.forEach((c) => {
        if (cache[c.symbol]) {
          c.price = cache[c.symbol].price ?? 0;
          c.change = cache[c.symbol].change ?? 0;
        }
      });
    } catch {
      // ignore
    }
  }

  private refreshAll(): void {
    const tdCoins = this.coins.filter((c) => c.source === 'twelvedata');
    if (tdCoins.length > 0 && !this.twelveDataExhausted) {
      const symbols = tdCoins.map((c) => c.apiSymbol).join(',');
      this.http
        .get(`https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${this.twelveDataKey}`)
        .pipe(timeout(10000), catchError(() => of(null)))
        .subscribe((data: any) => {
          if (!data || data.status === 'error' || data.code === 429 || data.message?.includes('limit')) {
            this.twelveDataExhausted = true;
            return;
          }
          tdCoins.forEach((coin) => {
            const quote = symbols.includes(',') ? data[coin.apiSymbol] : data;
            if (quote && quote.close) {
              coin.price = parseFloat(quote.close);
              coin.change = parseFloat(quote.percent_change ?? 0);
            }
          });
          this.cdr.detectChanges();
        });
    }

    this.coins
      .filter((c) => c.source.startsWith('finnhub'))
      .forEach((coin) => {
        this.http
          .get(`https://finnhub.io/api/v1/quote?symbol=${coin.apiSymbol}&token=${this.finnhubKey}`)
          .pipe(timeout(10000), catchError(() => of(null)))
          .subscribe((data: any) => {
            if (data?.c && data.c !== 0) {
              const multiplier = coin.source === 'finnhub_synthetic_wti' ? 0.7146 : 1;
              coin.price = data.c * multiplier;
              coin.change = data.dp ?? 0;
              this.cdr.detectChanges();
            }
          });
      });
  }

  getPriceFormat(techSymbol: string): string {
    if (techSymbol && (techSymbol.includes('FX:') || techSymbol.includes('EURUSD') || techSymbol.includes('OANDA:'))) {
      if (techSymbol.includes('XAUUSD')) return '1.2-2';
      return '1.4-4';
    }
    return '1.2-2';
  }

  readonly loops = [1, 2, 3];
}
