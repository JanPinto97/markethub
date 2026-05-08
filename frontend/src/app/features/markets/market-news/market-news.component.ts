import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NewsArticleComponent } from './news-article/news-article';

@Component({
  selector: 'app-market-news',
  standalone: true,
  imports: [CommonModule, DatePipe, NewsArticleComponent],
  templateUrl: './market-news.component.html',
  styleUrls: ['./market-news.component.css']
})
export class MarketNewsComponent implements OnInit {
  // API Keys
  private finnhubKey = 'd7jo9s9r01qu1n4fg3pgd7jo9s9r01qu1n4fg3q0';
  private newsDataKey = 'pub_51b0bb5e9a054ff19dbd2272f643fef5';
  private marketauxKey = 'TUzZlehn8kwZmGgBBbQW4Rmzds6ZRYLwwRdd8VO1';
  private tiingoKey = '07705bf17ddd89eb11ea83b95d01042a522162a9';

  private rapidApiKey = '1e856b26f1msh7ff07161e81308ep1bec53jsn7edd8d75b995';
  private rapidApiHost = 'yahoo-finance15.p.rapidapi.com';

  activeCategory: string = 'All News';
  categories: string[] = ['All News', 'Stock Markets', 'Currencies', 'Cryptocurrencies', 'Commodities', 'Economy'];
  
  fullNews: any[] = [];
  filteredNews: any[] = [];
  isLoading: boolean = true;
  selectedArticle: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.checkPersistence();
    this.loadAllNews();
  }

  checkPersistence() {
    try {
      const saved = localStorage.getItem('markethub_news_cache');
      if (saved) {
        const { date, news } = JSON.parse(saved);
        if (date === new Date().toDateString() && Array.isArray(news) && news.length > 0) {
          this.fullNews = news;
          this.filterNews();
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      }
    } catch (e) {
      console.warn("Error recuperando caché de noticias", e);
    }
  }

  savePersistence() {
    try {
      localStorage.setItem('markethub_news_cache', JSON.stringify({
        date: new Date().toDateString(),
        news: this.fullNews
      }));
    } catch (e) {
      console.warn("Error guardando caché de noticias", e);
    }
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
    this.filterNews();
  }

  filterNews() {
    if (this.activeCategory === 'All News') {
      this.filteredNews = this.fullNews;
    } else {
      const target = this.activeCategory.toLowerCase();
      this.filteredNews = this.fullNews.filter(n => {
        const cat = (n.category || '').toLowerCase();
        const title = (n.title || '').toLowerCase();
        const snippet = (n.snippet || '').toLowerCase();
        const fullText = title + ' ' + snippet;

        // STOCK MARKETS: Precisión extrema para Acciones, Índices y ETFs
        if (target.includes('stock')) {
          const isEquityCat = cat === 'stock markets' || cat === 'stocks' || cat === 'equity';
          
          const hasEquityKeywords = /\b(stock|shares|equity|etf|fund|index|s&p|nasdaq|dow|nikkei|dax|ftse|shares)\b/i.test(fullText);
          
          // No permitir que Forex (AUDUSD, EURUSD) entre aquí a menos que mencione explícitamente acciones/indices
          return isEquityCat || hasEquityKeywords;
        }

        if (target.includes('currency') || target.includes('forex')) {
          return cat.includes('currency') || cat.includes('forex') || 
                 fullText.includes('usd') || fullText.includes('eur') || fullText.includes('forex') || 
                 fullText.includes('pair');
        }

        if (target.includes('crypto')) {
          return cat.includes('crypto') || cat.includes('bitcoin') || 
                 fullText.includes('crypto') || fullText.includes('btc') || fullText.includes('eth') || 
                 fullText.includes('token');
        }

        if (target.includes('commodit')) {
          return cat.includes('commodit') || cat.includes('gold') || cat.includes('oil') || 
                 fullText.includes('gold') || fullText.includes('oil') || fullText.includes('wti') || 
                 fullText.includes('silver') || fullText.includes('commodity');
        }

        if (target.includes('economy')) {
          return cat.includes('economy') || cat.includes('macro') || cat.includes('central bank') || 
                 fullText.includes('fed') || fullText.includes('inflation') || fullText.includes('gdp');
        }
        
        return cat.includes(target) || fullText.includes(target);
      });
    }
    this.cdr.detectChanges();
  }

  loadAllNews() {
    if (this.fullNews.length === 0) {
      this.isLoading = true;
    }

    const rapidHeaders = {
      'x-rapidapi-key': this.rapidApiKey,
      'x-rapidapi-host': this.rapidApiHost
    };

    const sources = {
      finnhub_gen: this.http.get(`https://finnhub.io/api/v1/news?category=general&token=${this.finnhubKey}`).pipe(catchError(() => of([]))),
      finnhub_forex: this.http.get(`https://finnhub.io/api/v1/news?category=forex&token=${this.finnhubKey}`).pipe(catchError(() => of([]))),
      finnhub_crypto: this.http.get(`https://finnhub.io/api/v1/news?category=crypto&token=${this.finnhubKey}`).pipe(catchError(() => of([]))),
      newsData: this.http.get(`https://newsdata.io/api/1/news?apikey=${this.newsDataKey}&q=finance,crypto,forex,gold&language=en`).pipe(catchError(() => of({ results: [] }))),
      marketaux: this.http.get(`https://api.marketaux.com/v1/news/all?language=en&api_token=${this.marketauxKey}`).pipe(catchError(() => of({ data: [] }))),
      tiingo: this.http.get(`https://api.tiingo.com/tiingo/news?token=${this.tiingoKey}`).pipe(catchError(() => of([]))),
      yahoo: this.http.get(`https://yahoo-finance15.p.rapidapi.com/api/v1/markets/news?ticker=AAPL,TSLA,BTC-USD,EURUSD=X`, { headers: rapidHeaders }).pipe(catchError(() => of({ body: [] })))
    };

    forkJoin(sources).subscribe((res: any) => {
      let combined: any[] = [];

      // Normalize Yahoo Finance
      if (res.yahoo?.body) {
        combined = [...combined, ...res.yahoo.body.map((n: any) => ({
          title: n.title,
          source: n.source || 'Yahoo Finance',
          time: new Date(n.pubDate).getTime(),
          image: null,
          url: n.link,
          snippet: n.description,
          category: 'Stock Markets',
          isPro: true
        }))];
      }

      // Normalize Finnhub General -> Economy/Stocks
      if (Array.isArray(res.finnhub_gen)) {
        combined = [...combined, ...res.finnhub_gen.map((n: any) => ({
          title: n.headline,
          source: n.source,
          time: n.datetime * 1000,
          image: n.image,
          url: n.url,
          snippet: n.summary,
          category: 'Economy',
          isPro: Math.random() > 0.9
        }))];
      }

      // Normalize Finnhub Forex -> Currencies
      if (Array.isArray(res.finnhub_forex)) {
        combined = [...combined, ...res.finnhub_forex.map((n: any) => ({
          title: n.headline,
          source: n.source,
          time: n.datetime * 1000,
          image: n.image,
          url: n.url,
          snippet: n.summary,
          category: 'Currencies',
          isPro: false
        }))];
      }

      // Normalize Finnhub Crypto -> Cryptocurrencies
      if (Array.isArray(res.finnhub_crypto)) {
        combined = [...combined, ...res.finnhub_crypto.map((n: any) => ({
          title: n.headline,
          source: n.source,
          time: n.datetime * 1000,
          image: n.image,
          url: n.url,
          snippet: n.summary,
          category: 'Cryptocurrencies',
          isPro: false
        }))];
      }

      // Normalize NewsData
      if (res.newsData?.results) {
        combined = [...combined, ...res.newsData.results.map((n: any) => {
          let cat = 'Stock Markets';
          const t = n.title.toLowerCase();
          if (t.includes('crypto') || t.includes('bitcoin') || t.includes('btc')) cat = 'Cryptocurrencies';
          if (t.includes('forex') || t.includes('usd') || t.includes('euro')) cat = 'Currencies';
          if (t.includes('gold') || t.includes('oil') || t.includes('wti')) cat = 'Commodities';
          
          return {
            title: n.title,
            source: n.source_id,
            time: new Date(n.pubDate).getTime(),
            image: n.image_url,
            url: n.link,
            snippet: n.description,
            category: cat,
            isPro: false
          };
        })];
      }

      // Normalize Marketaux
      if (res.marketaux?.data) {
        combined = [...combined, ...res.marketaux.data.map((n: any) => ({
          title: n.title,
          source: n.source,
          time: new Date(n.published_at).getTime(),
          image: n.image_url,
          url: n.url,
          snippet: n.description,
          category: 'Stock Markets',
          isPro: false
        }))];
      }

      // Normalize Tiingo
      if (Array.isArray(res.tiingo)) {
        combined = [...combined, ...res.tiingo.map((n: any) => ({
          title: n.title,
          source: n.sourceName,
          time: new Date(n.publishedDate).getTime(),
          image: null,
          url: n.url,
          snippet: n.description,
          category: 'Cryptocurrencies',
          isPro: true
        }))];
      }

      // Ordenar y guardar
      this.fullNews = combined
        .filter(n => this.isFinancialRelevant(n))
        .sort((a, b) => b.time - a.time);
      
      this.savePersistence();
      this.filterNews();
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  private isFinancialRelevant(n: any): boolean {
    const text = (n.title + ' ' + (n.snippet || '')).toLowerCase();
    
    // Blacklist: Términos que gritan "no es finanzas"
    const blacklist = [
      'fruit', 'recipe', 'hello', 'prediction', 'wwe', 'backlash', 'show', 'entertainment',
      'lifestyle', 'travel', 'fashion', 'sport', 'football', 'soccer', 'celebrity'
    ];

    if (blacklist.some(word => text.includes(word))) return false;

    // Whitelist: Términos que confirman que es finanzas
    const whitelist = [
      'market', 'stock', 'invest', 'fed', 'bank', 'inflation', 'gdp', 'economy',
      'currency', 'forex', 'usd', 'eur', 'gold', 'oil', 'wti', 'commodit',
      'crypto', 'bitcoin', 'btc', 'eth', 'price', 'trade', 'finance', 'report',
      'earnings', 'dividend', 'share', 'bond', 'yield', 'rate', 'central bank',
      'wall street', 'nasdaq', 'sp 500', 'dow jones', 'recession'
    ];

    return whitelist.some(word => text.includes(word));
  }

  openArticle(news: any) {
    this.selectedArticle = news;
    // Añadir estado al historial para que el botón "Atrás" funcione internamente
    history.pushState({ view: 'article' }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: any) {
    // Si hay un artículo abierto y el usuario da a "Atrás", lo cerramos
    if (this.selectedArticle) {
      this.selectedArticle = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backToList() {
    this.selectedArticle = null;
    // Si volvemos manualmente, quitamos el estado del historial para no dejar basura
    if (history.state?.view === 'article') {
        history.back();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openUrl(url: string) {
    if (url) window.open(url, '_blank');
  }
}
