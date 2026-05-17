import { AfterViewChecked, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { MarketsContextService } from '../../core/services/markets-context.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  streaming?: boolean;
  error?: boolean;
}

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css'
})
export class AssistantComponent implements AfterViewChecked {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private marketsContext = inject(MarketsContextService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('inputArea') inputArea?: ElementRef<HTMLTextAreaElement>;

  messages = signal<ChatMessage[]>([]);
  draft = signal('');
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  maxChars = 4000;

  hasMessages = computed(() => this.messages().length > 0);
  remaining = computed(() => this.maxChars - this.draft().length);
  canSend = computed(() => {
    const v = this.draft().trim();
    return this.auth.isAuthenticated() && !this.loading() && v.length > 0 && v.length <= this.maxChars;
  });

  suggestions = [
    { title: 'What is CPI?', subtitle: 'Explain the consumer price index and its market impact' },
    { title: 'Summarize today\'s markets', subtitle: 'Give me a quick overview of what moved' },
    { title: 'How does the Fed affect rates?', subtitle: 'Monetary policy 101' },
    { title: 'What is a stop-loss?', subtitle: 'Risk management basics' }
  ];

  private shouldScroll = false;
  private abortCtrl?: AbortController;

  renderMarkdown(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.markdownToHtml(text || ''));
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private renderInline(s: string): string {
    const linkRe = /\[([^\]]+)\]\(([^\s)]+)\)/g;
    const autoUrlRe = /(^|[\s(])((?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?'"])/g;
    const parts: string[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(s)) !== null) {
      if (m.index > last) parts.push(this.renderInlineNoLinks(s.slice(last, m.index)));
      parts.push(this.buildAnchor(m[1], m[2]));
      last = linkRe.lastIndex;
    }
    if (last < s.length) parts.push(this.renderInlineNoLinks(s.slice(last)));
    let out = parts.join('');
    out = out.replace(autoUrlRe, (_, pre, url) => `${pre}${this.buildAnchor(url, url, true)}`);
    return out;
  }

  private renderInlineNoLinks(s: string): string {
    let out = this.escapeHtml(s);
    out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
    out = out.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
    return out;
  }

  private buildAnchor(label: string, url: string, isAuto = false): string {
    const safeUrl = this.escapeHtml(url);
    const safeLabel = isAuto ? this.escapeHtml(label) : this.renderInlineNoLinks(label);
    const cls = 'assistant-link';
    const isInternal = url.startsWith('/');
    if (isInternal) {
      return `<a class="${cls}" data-internal="1" href="${safeUrl}">${safeLabel}</a>`;
    }
    return `<a class="${cls}" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
  }

  private markdownToHtml(src: string): string {
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    const html: string[] = [];
    let i = 0;
    const flushParagraph = (buf: string[]) => {
      if (!buf.length) return;
      const joined = buf.join('\n').trim();
      if (joined) html.push(`<p>${this.renderInline(joined).replace(/\n/g, '<br>')}</p>`);
      buf.length = 0;
    };
    let paraBuf: string[] = [];

    while (i < lines.length) {
      const line = lines[i];

      if (/^\s*$/.test(line)) {
        flushParagraph(paraBuf);
        i++;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushParagraph(paraBuf);
        const level = heading[1].length;
        html.push(`<h${level}>${this.renderInline(heading[2])}</h${level}>`);
        i++;
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        flushParagraph(paraBuf);
        const items: string[] = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
          i++;
        }
        html.push(`<ul>${items.map(it => `<li>${this.renderInline(it)}</li>`).join('')}</ul>`);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        flushParagraph(paraBuf);
        const items: string[] = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
          i++;
        }
        html.push(`<ol>${items.map(it => `<li>${this.renderInline(it)}</li>`).join('')}</ol>`);
        continue;
      }

      paraBuf.push(line);
      i++;
    }
    flushParagraph(paraBuf);
    return html.join('');
  }

  onMessageClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest('a[data-internal="1"]') as HTMLAnchorElement | null;
    if (!anchor) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const href = anchor.getAttribute('href');
    if (href) this.router.navigateByUrl(href);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  onInput(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    this.draft.set(ta.value);
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  pickSuggestion(text: string) {
    this.draft.set(text);
    setTimeout(() => {
      const ta = this.inputArea?.nativeElement;
      if (ta) {
        ta.focus();
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
      }
    });
  }

  async send() {
    if (!this.canSend()) return;
    const text = this.draft().trim();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      createdAt: Date.now()
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: '',
      createdAt: Date.now(),
      streaming: true
    };
    this.messages.update(arr => [...arr, userMsg, assistantMsg]);
    this.draft.set('');
    this.errorMsg.set(null);
    this.loading.set(true);
    this.shouldScroll = true;
    const ta = this.inputArea?.nativeElement;
    if (ta) ta.style.height = 'auto';

    const history = this.messages()
      .filter(m => m.id !== assistantMsg.id && !m.error)
      .map(m => ({ role: m.role, content: m.text }));

    this.abortCtrl = new AbortController();

    try {
      const marketContext = this.marketsContext.hasAny() ? this.marketsContext.snapshot() : undefined;
      await this.api.postStream('/assistant/chat', { messages: history, marketContext }, {
        signal: this.abortCtrl.signal,
        onChunk: (chunk) => {
          this.messages.update(arr => arr.map(m =>
            m.id === assistantMsg.id ? { ...m, text: m.text + chunk } : m
          ));
          this.shouldScroll = true;
        }
      });
      this.messages.update(arr => arr.map(m =>
        m.id === assistantMsg.id ? { ...m, streaming: false } : m
      ));
    } catch (err: any) {
      const message = err?.message || 'Failed to reach the assistant. Please try again.';
      this.errorMsg.set(message);
      this.messages.update(arr => arr.map(m =>
        m.id === assistantMsg.id
          ? { ...m, streaming: false, error: true, text: m.text || message }
          : m
      ));
    } finally {
      this.loading.set(false);
      this.shouldScroll = true;
    }
  }

  newChat() {
    if (this.loading()) {
      this.abortCtrl?.abort();
    }
    this.messages.set([]);
    this.draft.set('');
    this.errorMsg.set(null);
    this.loading.set(false);
  }
}
