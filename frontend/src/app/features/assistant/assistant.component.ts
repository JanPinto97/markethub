import { Component, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatCoreComponent } from './chat-core/chat-core.component';
import { randomId } from '../../shared/utils/uuid';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, ChatCoreComponent],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css',
})
export class AssistantComponent {
  @ViewChild('chat') chat?: ChatCoreComponent;

  sessionId = signal(randomId());

  hasMessages(): boolean {
    return (this.chat?.messages() ?? []).length > 0;
  }

  newChat() {
    this.chat?.newChat();
    this.sessionId.set(randomId());
  }
}
