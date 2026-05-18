import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SmartMarketService } from '../markets/services/smart-market.service';

interface MarketRow {
  sym: string;
  apiSym: string;
  name: string;
  px: string;
  chg: string;
  pct: string;
  isUp: boolean;
  tvSymbol: string;
  source: string;
  coingeckoId?: string;
}

interface Voice {
  quote: string;
  name: string;
  role: string;
  initials: string;
  meta: string;
  accent?: 'green' | 'dark';
}

interface Post {
  feature?: boolean;
  eyebrow: string;
  author: string;
  role: string;
  initials: string;
  time: string;
  title: string;
  body: string;
  likes: number;
  replies: number;
  img?: string;
}

interface FaqItem { q: string; a: string; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private smartMarket = inject(SmartMarketService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private priceInterval: any;

  openFaq = signal(0);

  toggleFaq(i: number) {
    this.openFaq.update(v => (v === i ? -1 : i));
  }

  private io?: IntersectionObserver;

  assetPool = [
    { sym: 'NVDA',    apiSym: 'NVDA',    name: 'NVIDIA · Stock',          tvSymbol: 'NVDA',           source: 'finnhub' },
    { sym: 'TSLA',    apiSym: 'TSLA',    name: 'Tesla · Stock',           tvSymbol: 'TSLA',           source: 'finnhub' },
    { sym: 'S&P 500', apiSym: 'SPY',     name: 'S&P 500 · Index',         tvSymbol: 'SPY',            source: 'finnhub' },
    { sym: 'XAU',     apiSym: 'XAU/USD', name: 'Gold spot · Commodity',   tvSymbol: 'OANDA:XAUUSD',   source: 'twelvedata' },
    { sym: 'BTC',     apiSym: 'BTC/USD', name: 'Bitcoin · Crypto',        tvSymbol: 'BINANCE:BTCUSD', source: 'coingecko', coingeckoId: 'bitcoin' },
    { sym: 'WTI',     apiSym: 'USO',     name: 'Crude Oil · Commodity',   tvSymbol: 'TVC:USOIL',      source: 'finnhub_synthetic_wti' },
    { sym: 'ETH',     apiSym: 'ETH/USD', name: 'Ethereum · Crypto',       tvSymbol: 'BINANCE:ETHUSD', source: 'coingecko', coingeckoId: 'ethereum' },
    { sym: 'EURUSD',  apiSym: 'EUR/USD', name: 'Euro / US Dollar · Forex',tvSymbol: 'FX:EURUSD',      source: 'twelvedata' },
    { sym: 'AAPL',    apiSym: 'AAPL',    name: 'Apple · Stock',           tvSymbol: 'AAPL',           source: 'finnhub' },
    { sym: 'MSFT',    apiSym: 'MSFT',    name: 'Microsoft · Stock',       tvSymbol: 'MSFT',           source: 'finnhub' },
    { sym: 'QQQ',     apiSym: 'QQQ',     name: 'NASDAQ 100 · Index',      tvSymbol: 'QQQ',            source: 'finnhub' },
    { sym: 'GBPUSD',  apiSym: 'GBP/USD', name: 'GBP / USD · Forex',       tvSymbol: 'FX:GBPUSD',      source: 'twelvedata' },
    { sym: 'SOL',     apiSym: 'SOL/USD', name: 'Solana · Crypto',         tvSymbol: 'BINANCE:SOLUSD', source: 'coingecko', coingeckoId: 'solana' },
    { sym: 'XAG',     apiSym: 'XAG/USD', name: 'Silver spot · Commodity', tvSymbol: 'OANDA:XAGUSD',   source: 'twelvedata' },
    { sym: 'AMZN',    apiSym: 'AMZN',    name: 'Amazon · Stock',          tvSymbol: 'AMZN',           source: 'finnhub' }
  ];

  gainers: MarketRow[] = [];
  losers: MarketRow[] = [];

  ngOnInit() {
    this.hydratePrices();
    this.priceInterval = setInterval(() => {
      this.hydratePrices();
      this.cdr.detectChanges();
    }, 2000);
  }

  openAssetInMarkets(row: MarketRow) {
    this.smartMarket.setActiveAsset({
      symbol: row.tvSymbol,
      apiSymbol: row.apiSym,
      displaySymbol: row.sym,
      source: row.source,
      coingeckoId: row.coingeckoId
    });
    this.router.navigate(['/markets']);
  }

  hydratePrices() {
    const updatedAssets: (MarketRow & { rawPct: number })[] = [];

    this.assetPool.forEach(asset => {
      const cached = this.smartMarket.getCachedPrice(asset.apiSym);
      if (cached && cached.c > 0) {
        const rawPct = cached.dp;
        const isUp = rawPct >= 0;
        
        // Truncado matemático estricto a 2 decimales
        const truncPx = Math.trunc(cached.c * 100) / 100;
        const pxStr = truncPx.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const rawChg = cached.c - (cached.c / (1 + (rawPct / 100)));
        const truncChg = Math.trunc(Math.abs(rawChg) * 100) / 100;
        const chgStr = (isUp ? '+' : '−') + truncChg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const truncPct = Math.trunc(Math.abs(rawPct) * 100) / 100;
        const pctStr = (isUp ? '+' : '−') + truncPct.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
        
        updatedAssets.push({
          sym: asset.sym,
          apiSym: asset.apiSym,
          name: asset.name,
          px: pxStr,
          chg: chgStr,
          pct: pctStr,
          isUp,
          rawPct,
          tvSymbol: asset.tvSymbol,
          source: asset.source,
          coingeckoId: asset.coingeckoId
        });
      }
    });

    if (updatedAssets.length > 0) {
      // Ordenar por rendimiento de mayor a menor
      updatedAssets.sort((a, b) => b.rawPct - a.rawPct);
      
      // Top 4 ganadores (mayor porcentaje)
      this.gainers = updatedAssets.slice(0, 4);
      
      // Top 4 perdedores (menor porcentaje, invertimos para ver el peor de todos primero)
      this.losers = updatedAssets.slice(-4).reverse();
    }
  }

  voices: Voice[] = [
    {
      quote: 'I lurk in the public communities and pin a couple of topics. I learn how people actually think about a chart — not just what the chart says.',
      name: 'Sara M.',
      role: 'Curious beginner',
      initials: 'SM',
      meta: 'Joined 3 weeks ago',
      accent: 'green',
    },
    {
      quote: 'Watchlist on one tab, Economic Calendar on another, community feed open in a third. I crowd-check the news against what people are actually trading.',
      name: 'Marcus B.',
      role: 'Active trader',
      initials: 'MB',
      meta: 'Watchlist · 24 symbols',
    },
    {
      quote: 'I spun up a private community for my strategy group. Approve a join request, drop a chart, pin the post. The conversation stays where I can moderate it.',
      name: 'Priya A.',
      role: 'Community builder',
      initials: 'PA',
      meta: 'AsiaMacro · 412 members',
    },
    {
      quote: "Honestly? It's the first place where the prices and the conversation actually live next to each other. I stopped bouncing between five tabs.",
      name: 'Henrik S.',
      role: 'Anyone, really',
      initials: 'HS',
      meta: 'Trending feed regular',
      accent: 'dark',
    },
  ];

  posts: Post[] = [
    {
      feature: true,
      eyebrow: 'SEMICONDUCTORS CLUB · PUBLIC COMMUNITY',
      author: 'Lena K.',
      role: 'Member · 4.2K followers',
      initials: 'LK',
      time: '12 min ago',
      title: 'NVDA broke the 50-day on volume. Adding a small hedge into Friday.',
      body: "Chart's posted below. Not calling a top — just trimming around the gap fill and rolling some Aug puts down. Curious what the rest of you are doing into expiry. Comments open.",
      likes: 248,
      replies: 63,
      img: 'assets/landing/photo-candles-bokeh.jpg',
    },
    {
      eyebrow: 'TOPIC · MACRO',
      author: 'Tobias R.',
      role: 'Member · 1.8K followers',
      initials: 'TR',
      time: '38 min ago',
      title: 'CPI came in line. Two-year yields told you yesterday.',
      body: 'Posting the chart in the Macro topic. Upvote if you saw it on the tape before the print.',
      likes: 162,
      replies: 41,
    },
    {
      eyebrow: 'FX TRADERS · PRIVATE COMMUNITY',
      author: 'Aiko M.',
      role: 'Joined this morning',
      initials: 'AM',
      time: '1 hr ago',
      title: 'EUR/USD — anyone running a carry basket through the Fed window?',
      body: 'Opened a private discussion from the comment. Someone please enlighten me.',
      likes: 94,
      replies: 28,
    },
  ];

  faq: FaqItem[] = [
    {
      q: 'Is MarketHub free?',
      a: "Yes. The whole platform is free — there's no Pro tier, no premium gate. A free account (email and password) is required only for the interactive parts: posting, following, joining or creating communities, and chatting with Warren. Everything else can be browsed as a guest.",
    },
    {
      q: "What can I do without signing in?",
      a: "More than you'd expect. Browse the community feed, read any public community, open any topic and any post in full with all its comments, visit any user's public profile, use the global search across users / posts / communities, and open the Markets dashboard with live prices, charts, news and the economic calendar.",
    },
    {
      q: 'What markets and asset classes are covered?',
      a: 'Crypto (BTC, ETH and many more), forex (EUR/USD and major pairs), commodities (gold, crude oil), indices (S&P 500, NASDAQ 100), and stocks (AAPL, NVDA, TSLA and others). Data is pulled from multiple providers — Finnhub, Twelve Data and CoinGecko among them — and surfaced in a single watchlist.',
    },
    {
      q: "What's the difference between public and private communities?",
      a: "Public communities anyone can read and join with one click. Private communities require sending a join request with an optional message — the leader and moderators approve or reject. Once you're in, both behave the same: post, read the feed (pinned posts first), and leave at any time.",
    },
    {
      q: 'Can I run my own community?',
      a: 'Yes. Create one from scratch — name, description, avatar, and public or private. As leader you can approve or reject join requests, expel members, promote moderators, pin posts, and delete the community entirely. Moderators can accept/reject requests and remove inappropriate posts or comments.',
    },
    {
      q: 'How do topics work?',
      a: 'Topics are a Reddit-style forum for specific themes (Macro, Crypto, Trading, etc.). Read sorted by Top or Recent, post with a title and optional body and media, upvote or downvote, and reply to comments with one level of nesting. Pin any topic to your sidebar so it\'s one click away.',
    },
    {
      q: 'Is this investment advice?',
      a: 'No. MarketHub is a publishing and data platform. Members share their own analysis and positions. Nothing on the platform constitutes investment advice. Your trades are yours.',
    },
  ];

  ngAfterViewInit() {
    const els = this.host.nativeElement.querySelectorAll<HTMLElement>(
      '.mh-section, .mh-hero, .mh-finalcta-wrap'
    );
    els.forEach(el => el.classList.add('mh-reveal'));
    this.io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            this.io?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => this.io!.observe(el));
  }

  ngOnDestroy() {
    this.io?.disconnect();
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
    }
  }
}
