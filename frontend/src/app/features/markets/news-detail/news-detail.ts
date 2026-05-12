import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NewsArticleComponent } from '../market-news/news-article/news-article';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NewsArticleComponent],
  templateUrl: './news-detail.html',
  styleUrl: './news-detail.css',
})
export class NewsDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  article = signal<any | null>(null);
  notFound = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      return;
    }

    let targetUrl: string;
    try {
      targetUrl = decodeURIComponent(atob(id));
    } catch {
      this.notFound.set(true);
      return;
    }

    try {
      const cached = localStorage.getItem('markethub_news_cache');
      if (!cached) {
        this.notFound.set(true);
        return;
      }
      const { date, news } = JSON.parse(cached);
      if (date !== new Date().toDateString() || !Array.isArray(news)) {
        this.notFound.set(true);
        return;
      }
      const match = news.find((n: any) => n && n.url === targetUrl);
      if (!match) {
        this.notFound.set(true);
        return;
      }
      this.article.set(match);
    } catch {
      this.notFound.set(true);
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/community']);
    }
  }
}
