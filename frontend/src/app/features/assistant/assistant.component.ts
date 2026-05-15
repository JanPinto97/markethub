import { AfterViewChecked, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
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

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('inputArea') inputArea?: ElementRef<HTMLTextAreaElement>;

  messages = signal<ChatMessage[]>([]);
  draft = signal('');
  maxChars = 4000;

  hasMessages = computed(() => this.messages().length > 0);
  remaining = computed(() => this.maxChars - this.draft().length);
  canSend = computed(() => {
    const v = this.draft().trim();
    return this.auth.isAuthenticated() && v.length > 0 && v.length <= this.maxChars;
  });

  suggestions = [
    { title: 'What is CPI?', subtitle: 'Explain the consumer price index and its market impact' },
    { title: 'Summarize today\'s markets', subtitle: 'Give me a quick overview of what moved' },
    { title: 'How does the Fed affect rates?', subtitle: 'Monetary policy 101' },
    { title: 'What is a stop-loss?', subtitle: 'Risk management basics' }
  ];

  private shouldScroll = false;

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

  send() {
    if (!this.canSend()) return;
    const text = this.draft().trim();
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      createdAt: Date.now()
    };
    this.messages.update(arr => [...arr, msg]);
    this.draft.set('');
    this.shouldScroll = true;
    const ta = this.inputArea?.nativeElement;
    if (ta) ta.style.height = 'auto';
  }

  newChat() {
    this.messages.set([]);
    this.draft.set('');
  }
}
