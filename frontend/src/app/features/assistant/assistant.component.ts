import { AfterViewChecked, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css'
})
export class AssistantComponent implements AfterViewChecked {
  auth = inject(AuthService);
  private api = inject(ApiService);

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
      await this.api.postStream('/assistant/chat', { messages: history }, {
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
