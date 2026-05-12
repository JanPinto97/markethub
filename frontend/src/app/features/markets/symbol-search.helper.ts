import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface MarketsSymbolResult {
  symbol: string;
  apiSymbol: string;
  description: string;
  type: string;
  source: string;
  coingeckoId?: string;
}

const SHORTHAND_MAP: Record<string, MarketsSymbolResult> = {
  XAU: { symbol: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD', description: 'Gold Spot / US Dollar', type: 'METAL', source: 'twelvedata' },
  GOLD: { symbol: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD', description: 'Gold Spot / US Dollar', type: 'METAL', source: 'twelvedata' },
  XAUUSD: { symbol: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD', description: 'Gold Spot / US Dollar', type: 'METAL', source: 'twelvedata' },
  XAG: { symbol: 'OANDA:XAGUSD', apiSymbol: 'XAG/USD', description: 'Silver Spot / US Dollar', type: 'METAL', source: 'twelvedata' },
  SILVER: { symbol: 'OANDA:XAGUSD', apiSymbol: 'XAG/USD', description: 'Silver Spot / US Dollar', type: 'METAL', source: 'twelvedata' },
  XAGUSD: { symbol: 'OANDA:XAGUSD', apiSymbol: 'XAG/USD', description: 'Silver Spot / US Dollar', type: 'METAL', source: 'twelvedata' },
  BTC: { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD', description: 'Bitcoin / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  BITCOIN: { symbol: 'BINANCE:BTCUSD', apiSymbol: 'BTC/USD', description: 'Bitcoin / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  ETH: { symbol: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD', description: 'Ethereum / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  ETHEREUM: { symbol: 'BINANCE:ETHUSD', apiSymbol: 'ETH/USD', description: 'Ethereum / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  SOL: { symbol: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD', description: 'Solana / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  SOLANA: { symbol: 'BINANCE:SOLUSD', apiSymbol: 'SOL/USD', description: 'Solana / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  ADA: { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD', description: 'Cardano / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  CARDANO: { symbol: 'BINANCE:ADAUSD', apiSymbol: 'ADA/USD', description: 'Cardano / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  DOT: { symbol: 'BINANCE:DOTUSD', apiSymbol: 'DOT/USD', description: 'Polkadot / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  POLKADOT: { symbol: 'BINANCE:DOTUSD', apiSymbol: 'DOT/USD', description: 'Polkadot / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  AVAX: { symbol: 'BINANCE:AVAXUSD', apiSymbol: 'AVAX/USD', description: 'Avalanche / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  AVALANCHE: { symbol: 'BINANCE:AVAXUSD', apiSymbol: 'AVAX/USD', description: 'Avalanche / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  XRP: { symbol: 'BINANCE:XRPUSD', apiSymbol: 'XRP/USD', description: 'XRP / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  RIPPLE: { symbol: 'BINANCE:XRPUSD', apiSymbol: 'XRP/USD', description: 'XRP / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  LINK: { symbol: 'BINANCE:LINKUSD', apiSymbol: 'LINK/USD', description: 'Chainlink / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  CHAINLINK: { symbol: 'BINANCE:LINKUSD', apiSymbol: 'LINK/USD', description: 'Chainlink / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  MATIC: { symbol: 'BINANCE:MATICUSD', apiSymbol: 'MATIC/USD', description: 'Polygon / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  POLYGON: { symbol: 'BINANCE:MATICUSD', apiSymbol: 'MATIC/USD', description: 'Polygon / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  DOGE: { symbol: 'BINANCE:DOGEUSD', apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  DOGECOIN: { symbol: 'BINANCE:DOGEUSD', apiSymbol: 'DOGE/USD', description: 'Dogecoin / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  SHIB: { symbol: 'BINANCE:SHIBUSD', apiSymbol: 'SHIB/USD', description: 'Shiba Inu / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  LTC: { symbol: 'BINANCE:LTCUSD', apiSymbol: 'LTC/USD', description: 'Litecoin / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  LITECOIN: { symbol: 'BINANCE:LTCUSD', apiSymbol: 'LTC/USD', description: 'Litecoin / US Dollar', type: 'CRYPTO', source: 'twelvedata' },
  EUR: { symbol: 'FX:EURUSD', apiSymbol: 'EUR/USD', description: 'Euro / US Dollar', type: 'FOREX', source: 'twelvedata' },
  EURUSD: { symbol: 'FX:EURUSD', apiSymbol: 'EUR/USD', description: 'Euro / US Dollar', type: 'FOREX', source: 'twelvedata' },
  GBP: { symbol: 'FX:GBPUSD', apiSymbol: 'GBP/USD', description: 'British Pound / US Dollar', type: 'FOREX', source: 'twelvedata' },
  OIL: { symbol: 'TVC:USOIL', apiSymbol: 'USO', description: 'Crude Oil WTI', type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
  WTI: { symbol: 'TVC:USOIL', apiSymbol: 'USO', description: 'Crude Oil WTI', type: 'COMMODITY', source: 'finnhub_synthetic_wti' },
  SPY: { symbol: 'SPY', apiSymbol: 'SPY', description: 'S&P 500 ETF', type: 'INDEX ETF', source: 'finnhub' },
  SP500: { symbol: 'SPY', apiSymbol: 'SPY', description: 'S&P 500 ETF', type: 'INDEX ETF', source: 'finnhub' },
  QQQ: { symbol: 'QQQ', apiSymbol: 'QQQ', description: 'NASDAQ 100 ETF', type: 'INDEX ETF', source: 'finnhub' },
  NASDAQ: { symbol: 'QQQ', apiSymbol: 'QQQ', description: 'NASDAQ 100 ETF', type: 'INDEX ETF', source: 'finnhub' },
};

const POPULAR_ASSET_MAP: Record<string, { tvSymbol: string; apiSymbol: string; source: string; coingeckoId?: string }> = {
  'XAU/USD': { tvSymbol: 'OANDA:XAUUSD', apiSymbol: 'XAU/USD', source: 'twelvedata' },
  'XAG/USD': { tvSymbol: 'OANDA:XAGUSD', apiSymbol: 'XAG/USD', source: 'twelvedata' },
  'EUR/USD': { tvSymbol: 'FX:EURUSD', apiSymbol: 'EUR/USD', source: 'twelvedata' },
  'GBP/USD': { tvSymbol: 'FX:GBPUSD', apiSymbol: 'GBP/USD', source: 'twelvedata' },
  'USD/JPY': { tvSymbol: 'FX:USDJPY', apiSymbol: 'USD/JPY', source: 'twelvedata' },
  'AUD/USD': { tvSymbol: 'FX:AUDUSD', apiSymbol: 'AUD/USD', source: 'twelvedata' },
  'USD/CAD': { tvSymbol: 'FX:USDCAD', apiSymbol: 'USD/CAD', source: 'twelvedata' },
  'USD/CHF': { tvSymbol: 'FX:USDCHF', apiSymbol: 'USD/CHF', source: 'twelvedata' },
  'NZD/USD': { tvSymbol: 'FX:NZDUSD', apiSymbol: 'NZD/USD', source: 'twelvedata' },
  'BTC/USD': { tvSymbol: 'CRYPTO:BTCUSD', apiSymbol: 'BTC/USD', source: 'coingecko', coingeckoId: 'bitcoin' },
  'ETH/USD': { tvSymbol: 'CRYPTO:ETHUSD', apiSymbol: 'ETH/USD', source: 'coingecko', coingeckoId: 'ethereum' },
  'SOL/USD': { tvSymbol: 'CRYPTO:SOLUSD', apiSymbol: 'SOL/USD', source: 'coingecko', coingeckoId: 'solana' },
  'BNB/USD': { tvSymbol: 'CRYPTO:BNBUSD', apiSymbol: 'BNB/USD', source: 'coingecko', coingeckoId: 'binancecoin' },
  'XRP/USD': { tvSymbol: 'CRYPTO:XRPUSD', apiSymbol: 'XRP/USD', source: 'coingecko', coingeckoId: 'ripple' },
  'ADA/USD': { tvSymbol: 'CRYPTO:ADAUSD', apiSymbol: 'ADA/USD', source: 'coingecko', coingeckoId: 'cardano' },
  'DOGE/USD': { tvSymbol: 'CRYPTO:DOGEUSD', apiSymbol: 'DOGE/USD', source: 'coingecko', coingeckoId: 'dogecoin' },
  'DOT/USD': { tvSymbol: 'CRYPTO:DOTUSD', apiSymbol: 'DOT/USD', source: 'coingecko', coingeckoId: 'polkadot' },
  'AVAX/USD': { tvSymbol: 'CRYPTO:AVAXUSD', apiSymbol: 'AVAX/USD', source: 'coingecko', coingeckoId: 'avalanche-2' },
  'LINK/USD': { tvSymbol: 'CRYPTO:LINKUSD', apiSymbol: 'LINK/USD', source: 'coingecko', coingeckoId: 'chainlink' },
  'MATIC/USD': { tvSymbol: 'CRYPTO:MATICUSD', apiSymbol: 'MATIC/USD', source: 'coingecko', coingeckoId: 'polygon-ecosystem-token' },
  'SHIB/USD': { tvSymbol: 'CRYPTO:SHIBUSD', apiSymbol: 'SHIB/USD', source: 'coingecko', coingeckoId: 'shiba-inu' },
  'LTC/USD': { tvSymbol: 'CRYPTO:LTCUSD', apiSymbol: 'LTC/USD', source: 'coingecko', coingeckoId: 'litecoin' },
  'TRX/USD': { tvSymbol: 'CRYPTO:TRXUSD', apiSymbol: 'TRX/USD', source: 'coingecko', coingeckoId: 'tron' },
  'UNI/USD': { tvSymbol: 'CRYPTO:UNIUSD', apiSymbol: 'UNI/USD', source: 'coingecko', coingeckoId: 'uniswap' },
  'ATOM/USD': { tvSymbol: 'CRYPTO:ATOMUSD', apiSymbol: 'ATOM/USD', source: 'coingecko', coingeckoId: 'cosmos' },
  'NEAR/USD': { tvSymbol: 'CRYPTO:NEARUSD', apiSymbol: 'NEAR/USD', source: 'coingecko', coingeckoId: 'near' },
  'XLM/USD': { tvSymbol: 'CRYPTO:XLMUSD', apiSymbol: 'XLM/USD', source: 'coingecko', coingeckoId: 'stellar' },
  'ICP/USD': { tvSymbol: 'CRYPTO:ICPUSD', apiSymbol: 'ICP/USD', source: 'coingecko', coingeckoId: 'internet-computer' },
};

export function searchMarketsSymbols(
  http: HttpClient,
  query: string,
  coinGeckoApiKey: string
): Observable<MarketsSymbolResult[]> {
  const shorthandMatch = SHORTHAND_MAP[query.trim().toUpperCase()];
  const pinnedResult = shorthandMatch ? [shorthandMatch] : [];

  const twelveDataObs = http
    .get(`https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=10`)
    .pipe(catchError(() => of({ data: [] })));

  const coinGeckoObs = http
    .get(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}&x_cg_demo_api_key=${coinGeckoApiKey}`)
    .pipe(catchError(() => of({ coins: [] })));

  return forkJoin({ tdRes: twelveDataObs, cgRes: coinGeckoObs }).pipe(
    map(({ tdRes, cgRes }) => {
      const tdResults = (tdRes as { data?: any[] }).data || [];
      const cgResults = (cgRes as { coins?: any[] }).coins || [];

      const apiMapped = tdResults
        .filter((item: any) => {
          return item.instrument_type !== 'Index' || item.symbol === 'SPX' || item.symbol === 'NDX' || item.symbol === 'IXIC';
        })
        .map((item: any) => {
          let tvSymbol = item.symbol;
          let apiSymbol = item.symbol;
          let type = item.instrument_type || 'ASSET';
          let source = 'twelvedata';

          if (type === 'Physical Currency') {
            const pairSymbol = item.symbol;
            const override = POPULAR_ASSET_MAP[pairSymbol];
            if (override) {
              tvSymbol = override.tvSymbol;
              apiSymbol = override.apiSymbol;
              source = override.source;
            } else {
              tvSymbol = `FX:${item.symbol.replace('/', '')}`;
              apiSymbol = item.symbol;
            }
            type = pairSymbol.includes('XAU') || pairSymbol.includes('XAG') ? 'METAL' : 'FOREX';
          } else if (type === 'Digital Currency' || type === 'Cryptocurrency') {
            const cryptoSymbol = item.symbol;
            const override = POPULAR_ASSET_MAP[cryptoSymbol];
            if (override) {
              tvSymbol = override.tvSymbol;
              apiSymbol = override.apiSymbol;
              source = override.source;
            } else {
              tvSymbol = `CRYPTO:${item.symbol.replace('/', '')}`;
              apiSymbol = item.symbol;
            }
            type = 'CRYPTO';
          } else if (type === 'Common Stock') {
            source = 'finnhub';
            type = 'STOCK';
          } else if (item.symbol === 'SPX' || item.symbol === 'NDX' || item.symbol === 'IXIC') {
            if (item.symbol === 'SPX') {
              tvSymbol = 'SPY';
              apiSymbol = 'SPY';
              source = 'finnhub';
            }
            if (item.symbol === 'NDX' || item.symbol === 'IXIC') {
              tvSymbol = 'QQQ';
              apiSymbol = 'QQQ';
              source = 'finnhub';
            }
            type = 'INDEX ETF';
          }

          return {
            symbol: tvSymbol,
            apiSymbol,
            description: item.instrument_name,
            type,
            source,
          } as MarketsSymbolResult;
        });

      const cgMapped = cgResults.slice(0, 5).map((item: any) => {
        const sym = item.symbol.toUpperCase();
        const apiSym = `${sym}/USD`;
        const tvSym = `BINANCE:${sym}USD`;

        return {
          symbol: tvSym,
          apiSymbol: apiSym,
          description: item.name,
          type: 'CRYPTO',
          source: 'coingecko',
          coingeckoId: item.id,
        } as MarketsSymbolResult;
      });

      const combined = [...apiMapped, ...cgMapped];

      return [
        ...pinnedResult,
        ...combined.filter((r) => !pinnedResult.some((p) => p.symbol === r.symbol)),
      ];
    })
  );
}

export function getShorthandSymbol(query: string): MarketsSymbolResult | null {
  return SHORTHAND_MAP[query.trim().toUpperCase()] ?? null;
}
