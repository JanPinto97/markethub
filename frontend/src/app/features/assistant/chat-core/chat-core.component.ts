import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { MarketsContextService } from '../../../core/services/markets-context.service';
import { AttachedContextCard } from '../../../core/services/assistant-popup.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  streaming?: boolean;
  error?: boolean;
  pending?: string;
}

export interface ChatSuggestion {
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-chat-core',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat-core.component.html',
  styleUrl: './chat-core.component.css',
})
export class ChatCoreComponent implements AfterViewChecked, OnInit, OnChanges {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private marketsContext = inject(MarketsContextService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  @Input() sessionId: string | null = null;
  @Input() initialMessage?: string;
  @Input() attachedContext?: AttachedContextCard;
  @Input() showWelcome = true;
  @Input() showSuggestions = true;
  @Input() showHint = true;
  @Input() welcomeTitle = 'How can I help with the markets today?';
  @Input() welcomeSubtitle =
    'Ask about an asset, a news article, an economic release, or anything happening in the community.';
  @Input() placeholder = 'Ask anything about markets, news, posts, or releases…';
  @Input() suggestions: ChatSuggestion[] = [
    { title: 'What is CPI?', subtitle: 'Explain the consumer price index and its market impact' },
    { title: "Summarize today's markets", subtitle: 'Give me a quick overview of what moved' },
    { title: 'How does the Fed affect rates?', subtitle: 'Monetary policy 101' },
    { title: 'What is a stop-loss?', subtitle: 'Risk management basics' },
  ];

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

  private shouldScroll = false;
  private abortCtrl?: AbortController;
  private autoSentForSession: string | null = null;
  private typingRafId: number | null = null;
  private typingMsgId: string | null = null;
  private streamDone = false;
  private lastTypingTs = 0;
  private typingCarry = 0;
  private readonly charsPerSecond = 115;

  ngOnInit() {
    this.maybeAutoSend();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['sessionId'] || changes['initialMessage'] || changes['attachedContext']) {
      this.maybeAutoSend();
    }
  }

  private maybeAutoSend() {
    if (!this.initialMessage) return;
    if (!this.sessionId || this.autoSentForSession === this.sessionId) return;
    if (!this.auth.isAuthenticated()) return;
    this.autoSentForSession = this.sessionId;
    this.messages.set([]);
    this.draft.set(this.initialMessage);
    setTimeout(() => {
      const ta = this.inputArea?.nativeElement;
      if (ta) {
        ta.focus();
        const len = ta.value.length;
        try { ta.setSelectionRange(len, len); } catch {}
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
      }
    }, 0);
  }

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
    const paraBuf: string[] = [];
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*$/.test(line)) { flushParagraph(paraBuf); i++; continue; }
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushParagraph(paraBuf);
        const level = heading[1].length;
        html.push(`<h${level}>${this.renderInline(heading[2])}</h${level}>`);
        i++; continue;
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
      createdAt: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: '',
      createdAt: Date.now(),
      streaming: true,
      pending: '',
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
    this.startTyping(assistantMsg.id);

    try {
      const marketContext = this.marketsContext.hasAny() ? this.marketsContext.snapshot() : undefined;
      const attachedContext = this.attachedContext
        ? {
            title: this.attachedContext.title,
            subtitle: this.attachedContext.subtitle,
            fields: this.attachedContext.fields,
            data: this.attachedContext.data,
          }
        : undefined;

      await this.api.postStream(
        '/assistant/chat',
        { messages: history, marketContext, attachedContext },
        {
          signal: this.abortCtrl.signal,
          onChunk: (chunk) => {
            this.messages.update(arr =>
              arr.map(m =>
                m.id === assistantMsg.id ? { ...m, pending: (m.pending || '') + chunk } : m
              )
            );
          },
        }
      );
      this.streamDone = true;
    } catch (err: any) {
      const message = err?.message || 'Failed to reach the assistant. Please try again.';
      this.errorMsg.set(message);
      this.stopTyping();
      this.messages.update(arr =>
        arr.map(m =>
          m.id === assistantMsg.id
            ? {
                ...m,
                text: (m.text || '') + (m.pending || '') || message,
                pending: '',
                streaming: false,
                error: true,
              }
            : m
        )
      );
    } finally {
      this.loading.set(false);
      this.shouldScroll = true;
    }
  }

  private startTyping(messageId: string) {
    this.stopTyping();
    this.typingMsgId = messageId;
    this.streamDone = false;
    this.lastTypingTs = 0;
    this.typingCarry = 0;
    const tick = (ts: number) => {
      if (this.typingMsgId !== messageId) return;
      if (!this.lastTypingTs) this.lastTypingTs = ts;
      const dt = ts - this.lastTypingTs;
      this.lastTypingTs = ts;

      // Fractional accumulator: real chars-per-second regardless of frame rate.
      this.typingCarry += (dt / 1000) * this.charsPerSecond;
      let baseCount = Math.floor(this.typingCarry);
      if (baseCount > 0) this.typingCarry -= baseCount;

      let finished = false;
      this.messages.update(arr =>
        arr.map(m => {
          if (m.id !== messageId) return m;
          const pending = m.pending || '';
          if (!pending.length) {
            if (this.streamDone) {
              finished = true;
              return { ...m, streaming: false, pending: '' };
            }
            return m;
          }
          // Mild catch-up only if we're falling far behind, capped at 2× speed.
          const maxStep = Math.ceil((dt / 1000) * this.charsPerSecond * 2);
          let take = baseCount;
          if (pending.length > 400) take = Math.min(maxStep, Math.max(baseCount, 2));
          take = Math.min(pending.length, take);
          if (take <= 0) return m;
          const next = m.text + pending.slice(0, take);
          const rest = pending.slice(take);
          if (this.streamDone && !rest.length) {
            finished = true;
            return { ...m, text: next, pending: '', streaming: false };
          }
          return { ...m, text: next, pending: rest };
        })
      );
      this.shouldScroll = true;
      if (finished) {
        this.stopTyping();
        return;
      }
      this.typingRafId = requestAnimationFrame(tick);
    };
    this.typingRafId = requestAnimationFrame(tick);
  }

  private stopTyping() {
    if (this.typingRafId !== null) {
      cancelAnimationFrame(this.typingRafId);
      this.typingRafId = null;
    }
    this.typingMsgId = null;
    this.typingCarry = 0;
  }

  newChat() {
    if (this.loading()) this.abortCtrl?.abort();
    this.stopTyping();
    this.streamDone = false;
    this.messages.set([]);
    this.draft.set('');
    this.errorMsg.set(null);
    this.loading.set(false);
    this.autoSentForSession = null;
  }
}
