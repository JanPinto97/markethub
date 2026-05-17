import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssistantPopupService } from '../../../core/services/assistant-popup.service';
import { ChatCoreComponent } from '../chat-core/chat-core.component';

@Component({
  selector: 'app-assistant-popup',
  standalone: true,
  imports: [CommonModule, ChatCoreComponent],
  templateUrl: './assistant-popup.component.html',
  styleUrl: './assistant-popup.component.css',
})
export class AssistantPopupComponent {
  popup = inject(AssistantPopupService);

  sessionId = computed(() => this.popup.request()?.sessionId ?? '');
  initialMessage = computed(() => this.popup.request()?.initialMessage);
  attachedContext = computed(() => this.popup.request()?.attachedContext);

  close() {
    this.popup.close();
  }
}
