import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

interface MarketRow {
  sym: string;
  name: string;
  px: string;
  chg: string;
  pct: string;
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
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private host: ElementRef<HTMLElement> = inject(ElementRef);

  openFaq = signal(0);

  toggleFaq(i: number) {
    this.openFaq.update(v => (v === i ? -1 : i));
  }

  private io?: IntersectionObserver;

  gainers: MarketRow[] = [
    { sym: 'NVDA',    name: 'NVIDIA · Stock',          px: '227.13',   chg: '+6.36',   pct: '+2.88%' },
    { sym: 'TSLA',    name: 'Tesla · Stock',           px: '449.59',   chg: '+16.13',  pct: '+3.72%' },
    { sym: 'S&P 500', name: 'S&P 500 · Index',         px: '5,847.20', chg: '+18.12',  pct: '+0.31%' },
    { sym: 'XAU',     name: 'Gold spot · Commodity',   px: '2,418.50', chg: '+10.10',  pct: '+0.42%' },
  ];

  losers: MarketRow[] = [
    { sym: 'BTC',    name: 'Bitcoin · Crypto',             px: '79,179',   chg: '−1,304',  pct: '−1.62%' },
    { sym: 'WTI',    name: 'Crude Oil · Commodity',        px: '102.12',   chg: '−1.00',   pct: '−0.97%' },
    { sym: 'ETH',    name: 'Ethereum · Crypto',            px: '2,253.90', chg: '−20.30',  pct: '−0.89%' },
    { sym: 'EURUSD', name: 'Euro / US Dollar · Forex',     px: '1.1710',   chg: '−0.0031', pct: '−0.26%' },
  ];

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
  }
}
