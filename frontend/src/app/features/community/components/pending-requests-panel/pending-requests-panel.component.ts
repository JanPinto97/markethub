import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { JoinRequest } from '../../services/community.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';

@Component({
  selector: 'app-pending-requests-panel',
  standalone: true,
  imports: [],
  templateUrl: './pending-requests-panel.component.html',
  styleUrl: './pending-requests-panel.component.css'
})
export class PendingRequestsPanelComponent {
  @Input() requests: JoinRequest[] = [];
  @Output() accept = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();

  selectedRequest = signal<JoinRequest | null>(null);

  openDetail(req: JoinRequest) {
    this.selectedRequest.set(req);
  }

  closeDetail() {
    this.selectedRequest.set(null);
  }

  onAccept(requestId: string) {
    this.closeDetail();
    this.accept.emit(requestId);
  }

  onReject(requestId: string) {
    this.closeDetail();
    this.reject.emit(requestId);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeDetail();
  }

  relativeTime(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  initialColor(name: string): string {
    return getUsernameColor(name);
  }

  initial(name: string): string {
    return getInitial(name);
  }
}
