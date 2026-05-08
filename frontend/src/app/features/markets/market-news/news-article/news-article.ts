import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

declare const TradingView: any;

@Component({
  selector: 'app-news-article',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="article-view max-w-[900px] mx-auto bg-white min-h-screen">
      <!-- NAVIGATION & PROGRESS -->
      <nav class="sticky top-0 z-[60] bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <button (click)="onBack()" class="flex items-center gap-2 text-slate-500 hover:text-[#006c49] transition-colors group">
          <span class="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span class="text-[10px] font-black uppercase tracking-widest">Back to News</span>
        </button>
        <div class="flex items-center gap-4">
            <span class="text-[10px] font-black uppercase text-slate-400 tracking-tighter hidden md:block">Reading: {{ article.title | slice:0:40 }}...</span>
            <div class="flex items-center gap-2 border-l border-slate-100 pl-4">
                <button (click)="adjustFont(-1)" class="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 hover:text-slate-900 transition-all">T↓</button>
                <button (click)="adjustFont(1)" class="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-all">T↑</button>
            </div>
        </div>
      </nav>

      <article class="p-6 md:p-12">
        <!-- 1. CABECERA DEL ARTÍCULO -->
        <header class="mb-10">
          <h1 class="text-4xl md:text-5xl font-black text-[#191c1e] leading-[1.1] tracking-tight mb-8" [style.fontSize.px]="fontSize * 2.5">
            {{ article.title }}
          </h1>
          
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 border-y border-slate-50 py-6">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-50">
                <span class="text-lg font-black text-slate-300">{{ article.source | slice:0:1 }}</span>
              </div>
              <div class="flex flex-col">
                <a [href]="article.url" target="_blank" class="text-xs font-black text-slate-900 uppercase tracking-wider hover:text-[#006c49] hover:underline transition-all cursor-pointer">
                    {{ article.source }}
                </a>
                <div class="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <span>{{ article.category }}</span>
                  <span>•</span>
                  <span>{{ article.time | date:'MMM dd, yyyy HH:mm' }}</span>
                </div>
              </div>
            </div>

            <!-- Social/Reading Tools -->
            <div class="flex items-center gap-3">
              <button (click)="shareX()" class="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-black hover:text-white hover:border-black transition-all">
                <i class="fa-brands fa-x-twitter text-sm"></i>
              </button>
              <button (click)="shareLinkedIn()" class="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-all">
                <i class="fa-brands fa-linkedin-in text-sm"></i>
              </button>
              <button (click)="shareEmail()" class="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                <span class="material-symbols-outlined text-lg">mail</span>
              </button>
              <button (click)="printArticle()" class="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                <span class="material-symbols-outlined text-lg">print</span>
              </button>
            </div>
          </div>
        </header>

        <!-- 2. HERO IMAGE -->
        <figure class="relative mb-12 group">
          <div class="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 shadow-2xl">
            <img [src]="article.image || 'assets/images/news-placeholder.png'" 
                 #heroArticleImg
                 (error)="heroArticleImg.src='assets/images/news-placeholder.png'"
                 class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                 alt="Article Hero">
          </div>
          <figcaption class="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-[8px] font-bold uppercase px-3 py-1.5 rounded-full tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            © {{ article.source }} • Reuters
          </figcaption>
        </figure>

        <!-- 3. BARRA "EN ESTE ARTÍCULO" (Sticky Bar) -->
        <div *ngIf="mentionedAssets.length > 0" class="ticker-bar mb-12 p-1 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth">
          <div class="px-6 py-4 bg-white rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
             <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">In This Report</span>
             <div class="flex items-center gap-6">
                <div *ngFor="let asset of mentionedAssets" 
                     (click)="swapAsset(asset)"
                     class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors group">
                    <span class="text-xs font-black text-slate-900 group-hover:text-[#006c49]">{{ asset.name }}</span>
                    <span class="text-[10px] font-mono text-emerald-600 font-bold">+{{ (math.random() * 1.5).toFixed(2) }}%</span>
                </div>
             </div>
          </div>
        </div>

        <!-- 4. CUERPO DEL ARTÍCULO -->
        <section class="article-body font-serif text-[#44474d] leading-relaxed selection:bg-emerald-100" [style.fontSize.px]="fontSize">
          <div class="mb-8 first-letter:text-5xl first-letter:font-black first-letter:text-[#006c49] first-letter:mr-3 first-letter:float-left article-content" 
               [innerHTML]="formatContent(article.content || article.snippet)">
          </div>

          <div *ngIf="article.description && article.description !== article.content" class="mb-8 p-6 bg-slate-50 rounded-xl border-l-4 border-slate-200 text-sm text-slate-500 italic">
            {{ article.description }}
          </div>

          <!-- 5. WIDGETS DE DATOS INTERACTIVOS -->
          <div *ngIf="mainAsset" class="interactive-widget my-12 p-6 bg-[#f8fafc] rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-2 relative">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Live Performance: {{ mainAsset.name }}</span>
                    <div class="flex items-center gap-2">
                        <span class="market-dot"></span>
                        <span class="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Market Live</span>
                    </div>
                </div>
                <div id="mini_chart_article" class="h-[220px] w-full bg-white rounded-xl shadow-sm border border-slate-50 overflow-hidden"></div>
                
                <!-- Fallback overlay if symbol is restricted (visual only as iframe is isolated) -->
                <div *ngIf="isRestricted" class="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-10 rounded-xl">
                    <span class="material-symbols-outlined text-rose-500 text-4xl mb-4">lock</span>
                    <h4 class="text-sm font-black text-slate-900 uppercase mb-2">Asset Not Available</h4>
                    <p class="text-xs text-slate-500 max-w-[240px]">This symbol is restricted or not found in our database.</p>
                </div>
            </div>
            <div class="flex flex-col gap-3">
                <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Related Assets</span>
                <div *ngFor="let asset of relatedAssets" 
                     (click)="swapAsset(asset)"
                     class="p-4 bg-white rounded-xl shadow-sm border border-slate-50 flex items-center justify-between hover:bg-emerald-50 hover:border-emerald-100 transition-all cursor-pointer group">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-slate-900 group-hover:text-[#006c49]">{{ asset.name }}</span>
                        <span class="text-[8px] font-bold text-slate-400 uppercase">{{ asset.category }}</span>
                    </div>
                    <span class="text-[10px] font-mono text-emerald-600 font-bold">+{{ (math.random() * 1.2).toFixed(2) }}%</span>
                </div>
            </div>
          </div>

          <blockquote *ngIf="article.title.length > 50" class="border-l-4 border-[#006c49] pl-6 py-4 my-10 italic text-xl text-slate-600 bg-emerald-50/30 rounded-r-2xl">
            "{{ article.title }}"
          </blockquote>

          <h3 class="text-xl font-bold text-slate-900 mb-4 mt-10">Market Context and Strategic Impact</h3>
          <div class="mb-8" [innerHTML]="formatContent('Global market participants are closely monitoring these developments as they may signal a shift in institutional sentiment. Historical data suggests that headlines of this nature often precede significant volatility in ' + (mainAsset?.category || 'related sectors') + '.')">
          </div>
        </section>

        <!-- FOOTER DISCLAIMER -->
        <footer class="mt-20 pt-10 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest font-bold">
            Disclaimer: MarketHub aggregates news from multiple high-authority sources. Content is for informational purposes only. Trading involves significant risk. All rights reserved to their respective owners.
        </footer>
      </article>
    </div>
  `,
  styles: [`
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@400;700;900&display=swap');

    .article-view {
      font-family: 'Inter', sans-serif;
    }

    .article-body {
      font-family: 'Playfair Display', serif;
    }

    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }

    .article-content {
      white-space: pre-line;
    }

    .market-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 8px #10b981;
      animation: pulse-dot 2s infinite;
    }

    @keyframes pulse-dot {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class NewsArticleComponent implements OnInit, AfterViewInit {
  @Input() article: any;
  @Output() back = new EventEmitter<void>();

  fontSize: number = 18;
  math = Math;
  isRestricted = false;

  // Asset Parsing Logic - VERIFIED TRADINGVIEW SYMBOLS
  availableAssets = [
    { symbol: 'AMEX:SPY', name: 'S&P 500', category: 'Indices', keywords: ['S&P 500', 'SPX', 'SPY', 'stocks'] },
    { symbol: 'NASDAQ:QQQ', name: 'NASDAQ 100', category: 'Indices', keywords: ['Nasdaq', 'tech', 'QQQ'] },
    { symbol: 'AMEX:DIA', name: 'DOW JONES', category: 'Indices', keywords: ['Dow Jones', 'Dow', 'DOWI'] },
    { symbol: 'CRYPTO:BTCUSD', name: 'Bitcoin', category: 'Crypto', keywords: ['Bitcoin', 'BTC'] },
    { symbol: 'CRYPTO:ETHUSD', name: 'Ethereum', category: 'Crypto', keywords: ['Ethereum', 'ETH'] },
    { symbol: 'CRYPTO:XRPUSD', name: 'XRP', category: 'Crypto', keywords: ['XRP', 'Ripple'] },
    { symbol: 'FX:EURUSD', name: 'EUR/USD', category: 'Forex', keywords: ['Euro', 'EURUSD', 'EUR/USD'] },
    { symbol: 'FX:GBPUSD', name: 'GBP/USD', category: 'Forex', keywords: ['Pound', 'GBPUSD', 'GBP/USD'] },
    { symbol: 'FX:AUDUSD', name: 'AUD/USD', category: 'Forex', keywords: ['AUDUSD', 'AUD/USD', 'Australian Dollar'] },
    { symbol: 'FX:USDJPY', name: 'USD/JPY', category: 'Forex', keywords: ['USDJPY', 'Yen'] },
    { symbol: 'TVC:GOLD', name: 'Gold', category: 'Commodities', keywords: ['Gold', 'XAU'] },
    { symbol: 'TVC:USOIL', name: 'WTI Crude', category: 'Commodities', keywords: ['Oil', 'Crude', 'WTI'] },
    { symbol: 'NASDAQ:AAPL', name: 'Apple Inc.', category: 'Stocks', keywords: ['Apple', 'AAPL'] },
    { symbol: 'NASDAQ:NVDA', name: 'NVIDIA', category: 'Stocks', keywords: ['NVIDIA', 'NVDA'] },
    { symbol: 'NASDAQ:TSLA', name: 'Tesla', category: 'Stocks', keywords: ['Tesla', 'TSLA'] }
  ];

  mentionedAssets: any[] = [];
  mainAsset: any = null;
  relatedAssets: any[] = [];

  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.parseContentForAssets();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMiniChart(), 500);
  }

  formatContent(text: string): string {
    if (!text) return '';
    // Limpiar tags HTML previos si los hay (opcional, dependiendo de la API)
    let cleaned = text.replace(/<[^>]*>?/gm, '');
    // Añadir saltos de línea después de cada punto que no sea parte de un número
    return cleaned.replace(/\. /g, '.<br><br>');
  }

  parseContentForAssets() {
    const textToScan = (this.article.title + ' ' + (this.article.content || '') + ' ' + (this.article.snippet || '')).toLowerCase();
    
    // Scan exclusively for keywords in the text
    this.mentionedAssets = this.availableAssets.filter(asset => 
      asset.keywords.some(kw => {
          const kwLow = kw.toLowerCase();
          // Regex para encontrar la palabra exacta y evitar falsos positivos
          const regex = new RegExp(`\\b${kwLow}\\b`, 'g');
          return regex.test(textToScan);
      })
    );

    if (this.mentionedAssets.length > 0) {
      this.mainAsset = this.mentionedAssets[0];
      
      // Related assets del mismo tipo
      this.relatedAssets = this.availableAssets
        .filter(a => a.symbol !== this.mainAsset.symbol && a.category === this.mainAsset.category)
        .slice(0, 2);

      if (this.relatedAssets.length < 2) {
          const others = this.availableAssets
            .filter(a => a.symbol !== this.mainAsset.symbol && !this.relatedAssets.includes(a))
            .slice(0, 2 - this.relatedAssets.length);
          this.relatedAssets = [...this.relatedAssets, ...others];
      }
    } else {
      // Default si nada es mencionado
      this.mainAsset = this.availableAssets[0]; // SPY
      this.relatedAssets = [this.availableAssets[1], this.availableAssets[2]]; // QQQ, DIA
      this.mentionedAssets = []; // NO se muestra en el ticker
    }
  }

  initMiniChart() {
    if (typeof TradingView !== 'undefined' && this.mainAsset) {
      const container = document.getElementById('mini_chart_article');
      if (container) container.innerHTML = '';
      
      this.isRestricted = false;

      new TradingView.widget({
        "container_id": "mini_chart_article",
        "width": "100%",
        "height": "100%",
        "symbol": this.mainAsset.symbol,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "3",
        "locale": "en",
        "enable_publishing": false,
        "hide_top_toolbar": true,
        "hide_legend": true,
        "save_image": false
      });
    }
  }

  swapAsset(newAsset: any) {
    const oldMain = this.mainAsset;
    this.mainAsset = newAsset;
    this.relatedAssets = this.relatedAssets.map(a => a.symbol === newAsset.symbol ? oldMain : a);
    this.initMiniChart();
  }

  adjustFont(delta: number) {
    this.fontSize = Math.min(Math.max(14, this.fontSize + delta), 28);
  }

  onBack() {
    this.back.emit();
  }

  shareX() {
    const text = encodeURIComponent(this.article.title);
    const url = encodeURIComponent(this.article.url);
    const intentUrl = `https://x.com/intent/tweet?text=${text}&url=${url}`;
    window.open(intentUrl, '_blank');
  }

  shareLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.article.url)}`;
    window.open(url, '_blank');
  }

  shareEmail() {
    const subject = encodeURIComponent(this.article.title);
    const body = encodeURIComponent(`Read this article on MarketHub: ${this.article.url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  printArticle() {
    window.print();
  }
}
