import { Injectable, signal } from '@angular/core';
import { randomId } from '../../shared/utils/uuid';

export interface AttachedField {
  label: string;
  value: string;
}

export interface AttachedContextCard {
  title: string;
  subtitle?: string;
  fields: AttachedField[];
  data?: any;
}

export interface AssistantPopupRequest {
  initialMessage?: string;
  attachedContext?: AttachedContextCard;
  sessionId: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantPopupService {
  readonly isOpen = signal(false);
  readonly request = signal<AssistantPopupRequest | null>(null);

  open(opts: { initialMessage?: string; attachedContext?: AttachedContextCard }) {
    this.request.set({
      initialMessage: opts.initialMessage,
      attachedContext: opts.attachedContext,
      sessionId: randomId(),
    });
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }
}
