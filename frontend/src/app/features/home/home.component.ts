import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
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
  tags: string[];
  room: number;
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
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private host: ElementRef<HTMLElement> = inject(ElementRef);

  scrolled = signal(false);
  openFaq = signal(0);

  toggleFaq(i: number) {
    this.openFaq.update(v => (v === i ? -1 : i));
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 8);
  }

  private io?: IntersectionObserver;

  gainers: MarketRow[] = [
    { sym: 'NVDA', name: 'NVIDIA Corp',     px: '227.13',   chg: '+6.36',   pct: '2.88%' },
    { sym: 'TSLA', name: 'Tesla, Inc.',     px: '449.59',   chg: '+16.13',  pct: '3.72%' },
    { sym: 'AAPL', name: 'Apple Inc.',      px: '299.86',   chg: '+5.07',   pct: '1.72%' },
    { sym: 'GOLD', name: 'Gold spot (oz)',  px: '2,418.50', chg: '+10.10',  pct: '0.42%' },
  ];

  losers: MarketRow[] = [
    { sym: 'BTC',  name: 'Bitcoin / USD',     px: '79,179',   chg: '−1,304',  pct: '1.62%' },
    { sym: 'CL',   name: 'Crude Oil (WTI)',   px: '102.12',   chg: '−1.00',   pct: '0.97%' },
    { sym: 'ETH',  name: 'Ethereum / USD',    px: '2,253.90', chg: '−20.30',  pct: '0.89%' },
    { sym: 'EUR',  name: 'Euro / US Dollar',  px: '1.1710',   chg: '−0.0031', pct: '0.26%' },
  ];

  voices: Voice[] = [
    {
      quote: 'The replies are the product. I publish a thesis, and within twenty minutes I know what I missed.',
      name: 'Marcus Bell',
      role: 'PM · long/short equity',
      initials: 'MB',
      meta: '4.2K followers · 38 theses',
      accent: 'green',
    },
    {
      quote: 'Bloomberg gives me data. The room gives me what other people think the data means. Different problem.',
      name: 'Priya Anand',
      role: 'Macro strategist',
      initials: 'PA',
      meta: '1.8K followers · 22 theses',
    },
    {
      quote: 'I used to lurk on three group chats and two newsletters. Now I read one feed and I\'m earlier than I was.',
      name: 'Henrik Sørensen',
      role: 'Independent trader',
      initials: 'HS',
      meta: '612 followers · 11 theses',
    },
    {
      quote: 'IA writes the bear case I forgot to write. That alone has saved me from two bad adds this quarter.',
      name: 'Jules Okafor',
      role: 'Sector analyst · semis',
      initials: 'JO',
      meta: '3.1K followers · 27 theses',
      accent: 'dark',
    },
  ];

  posts: Post[] = [
    {
      feature: true,
      eyebrow: 'EARNINGS WEEK',
      author: 'Lena Kovács',
      role: 'Equity Analyst',
      initials: 'LK',
      time: '12 min ago',
      title: 'Why I’m underweight semis going into Q3 — and where I’m wrong.',
      body: 'The consensus has rotated hard, and that’s exactly why I’m fading it. Three positions I’m holding, the one I’m closing, and the data point that would flip me.',
      tags: ['#semis', '#earnings'],
      room: 248,
      replies: 63,
      img: 'assets/landing/photo-candles-bokeh.jpg',
    },
    {
      eyebrow: 'MACRO',
      author: 'Tobias Renn',
      role: 'Rates Trader',
      initials: 'TR',
      time: '38 min ago',
      title: 'A boring CPI is the loudest signal the room isn’t pricing.',
      body: 'Two-year yields told the story before the print landed. Here’s the sequence I’m watching into Jackson Hole.',
      tags: ['#rates', '#macro'],
      room: 162,
      replies: 41,
    },
    {
      eyebrow: 'FX',
      author: 'Aiko Mori',
      role: 'FX Strategist',
      initials: 'AM',
      time: '1 hr ago',
      title: 'Carry isn’t back. It just got lonely.',
      body: 'TWD, KRW and the unwind nobody on the desk wants to name. Reading the cross-asset tape this week.',
      tags: ['#fx', '#asia'],
      room: 94,
      replies: 28,
    },
  ];

  faq: FaqItem[] = [
    {
      q: 'Is this another finfluencer feed?',
      a: 'No. Members publish under their own name with a verified role flair (analyst, PM, independent trader, journalist). Pseudonyms are allowed for readers, never for publishers. Every thesis carries a counter-thesis in the replies — that\'s the whole point.',
    },
    {
      q: 'How real is "real-time"?',
      a: 'Pro members get sub-second quotes across 38 venues, including IEX, NASDAQ, NYSE, LSE, Euronext, TSE, and HKEX. Reader tier is 15-minute delayed — same data, just behind the curtain. Crypto and FX are live on both tiers.',
    },
    {
      q: 'What does the IA assistant actually do?',
      a: 'It reads the room with you. Summarises the strongest bear and bull threads on any ticker, surfaces the analyst whose call moved the conversation, and drafts the questions you should be asking before you size a position. It cites every thread it pulls from.',
    },
    {
      q: 'Can I publish anonymously?',
      a: 'Readers, yes. Publishers, no. The room only works if conviction is attributable — that\'s how counter-theses find their target. Pseudonymous publishing without role verification is the one thing we don\'t ship.',
    },
    {
      q: 'What about regulatory disclosures?',
      a: 'Anyone publishing a thesis on a position they hold is required to disclose it on the post. The platform auto-checks for missing disclosures against linked broker statements (optional on Reader, required on Pro Publisher). Manipulation gets you removed and reported.',
    },
    {
      q: 'Is this investment advice?',
      a: 'No. MarketHub is a publishing platform. Members share their own analysis and positions. Nothing on the platform — including IA output — constitutes investment advice. Your trades are yours.',
    },
  ];

  ngOnInit() {
    this.scrolled.set(window.scrollY > 8);
  }

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
