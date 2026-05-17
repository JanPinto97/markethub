import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SmartMarketService } from '../../../features/markets/services/smart-market.service';

interface TickerCoin {
  symbol: string;
  tech: string;
  apiSymbol: string;
  source: 'twelvedata' | 'finnhub' | 'finnhub_synthetic_wti' | 'coingecko';
  coingeckoId?: string;
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
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private smartMarket = inject(SmartMarketService);

  coins: TickerCoin[] = [
    { symbol: 'BTC/USD',           tech: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD', source: 'coingecko',  coingeckoId: 'bitcoin',  price: 0, change: 0 },
    { symbol: 'ETH/USD',           tech: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD', source: 'coingecko',  coingeckoId: 'ethereum', price: 0, change: 0 },
    { symbol: 'EUR/USD',           tech: 'FX:EURUSD',      apiSymbol: 'EUR/USD', source: 'twelvedata',           price: 0, change: 0 },
    { symbol: 'S&P 500 (SPY)',     tech: 'SPY',            apiSymbol: 'SPY',     source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'GOLD (XAU)',        tech: 'OANDA:XAUUSD',   apiSymbol: 'XAU/USD', source: 'twelvedata',           price: 0, change: 0 },
    { symbol: 'NASDAQ 100 (QQQ)',  tech: 'QQQ',            apiSymbol: 'QQQ',     source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'AAPL',              tech: 'AAPL',           apiSymbol: 'AAPL',    source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'NVDA',              tech: 'NVDA',           apiSymbol: 'NVDA',    source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'TSLA',              tech: 'TSLA',           apiSymbol: 'TSLA',    source: 'finnhub',              price: 0, change: 0 },
    { symbol: 'CRUDE OIL (WTI)',   tech: 'TVC:USOIL',      apiSymbol: 'USO',     source: 'finnhub_synthetic_wti', price: 0, change: 0 },
  ];

  ngOnInit(): void {
    this.hydrateFromCache();
    this.initSmartStreams();
  }

  private hydrateFromCache(): void {
    this.coins.forEach((coin) => {
      // Hidratación directa desde la caché unificada de SmartMarketService
      const cached = this.smartMarket.getCachedPrice(coin.apiSymbol);
      if (cached && cached.c > 0) {
        coin.price = cached.c;
        coin.change = cached.dp;
      }
    });
  }

  private initSmartStreams(): void {
    // 1. Forex and Metals (TwelveData)
    const forexCoins = this.coins.filter((c) => c.source === 'twelvedata');
    if (forexCoins.length > 0) {
      this.smartMarket.getForexPricesBatch(forexCoins.map(c => c.apiSymbol))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => {
          if (data && data.status !== 'error') {
            forexCoins.forEach((coin) => {
              const quote = forexCoins.length > 1 ? data[coin.apiSymbol] : data;
              if (quote && quote.close) {
                coin.price = parseFloat(quote.close);
                coin.change = parseFloat(quote.percent_change ?? 0);
                // Retroalimentamos la caché compartida en tiempo real
                this.smartMarket.updateCache(coin.apiSymbol, coin.price, coin.change);
              }
            });
            this.cdr.detectChanges();
          }
        });
    }

    // 2. Crypto (CoinGecko)
    const cryptoCoins = this.coins.filter((c) => c.source === 'coingecko');
    if (cryptoCoins.length > 0) {
      this.smartMarket.getCryptoPrices(cryptoCoins.map(c => c.coingeckoId!))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => {
          if (data) {
            cryptoCoins.forEach((coin) => {
              const info = data[coin.coingeckoId!];
              if (info && info.usd) {
                coin.price = info.usd;
                coin.change = info.usd_24h_change ?? 0;
                // Retroalimentamos la caché compartida en tiempo real
                this.smartMarket.updateCache(coin.apiSymbol, coin.price, coin.change);
              }
            });
            this.cdr.detectChanges();
          }
        });
    }

    // 3. Stocks (Finnhub)
    this.coins.filter((c) => c.source.startsWith('finnhub')).forEach((coin) => {
      this.smartMarket.getStockPrice(coin.apiSymbol)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => {
          if (data?.c && data.c !== 0) {
            const multiplier = coin.source === 'finnhub_synthetic_wti' ? 0.7146 : 1;
            coin.price = data.c * multiplier;
            coin.change = data.dp ?? 0;
            // Retroalimentamos la caché compartida en tiempo real
            this.smartMarket.updateCache(coin.apiSymbol, coin.price, coin.change);
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
