import { Component, Output, EventEmitter, inject, signal, HostListener, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityService, CommunityPublic, CommunityPrivate } from '../../services/community.service';
import { ToastService } from '../../../../core/services/toast.service';
import { trapFocus } from '../../../../shared/utils/focus-trap.utils';

@Component({
  selector: 'app-create-community-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-community-modal.component.html',
  styleUrl: './create-community-modal.component.css'
})
export class CreateCommunityModalComponent implements AfterViewInit, OnDestroy {
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<{ community: CommunityPublic | CommunityPrivate; type: 'public' | 'private' }>();

  @ViewChild('modalContainer') modalContainer!: ElementRef<HTMLElement>;

  private svc = inject(CommunityService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private releaseFocusTrap?: () => void;

  name = signal('');
  description = signal('');
  avatarUrl = signal('');
  type = signal<'public' | 'private'>('public');
  submitting = signal(false);
  nameError = signal<string | null>(null);
  generalError = signal<string | null>(null);

  ngAfterViewInit() {
    this.releaseFocusTrap = trapFocus(this.modalContainer.nativeElement);
  }

  ngOnDestroy() {
    this.releaseFocusTrap?.();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  close() {
    if (this.submitting()) return;
    this.closed.emit();
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onNameInput(value: string) {
    this.name.set(value);
    this.nameError.set(null);
  }

  onDescInput(value: string) {
    if (value.length <= 300) {
      this.description.set(value);
    }
  }

  onAvatarInput(value: string) {
    this.avatarUrl.set(value);
  }

  get canSubmit(): boolean {
    const n = this.name().trim();
    return n.length >= 3 && n.length <= 50 && !this.submitting();
  }

  submit() {
    const n = this.name().trim();
    if (n.length < 3 || n.length > 50) {
      this.nameError.set('Name must be between 3 and 50 characters.');
      return;
    }
    if (this.submitting()) return;

    this.submitting.set(true);
    this.nameError.set(null);
    this.generalError.set(null);

    const data = {
      name: n,
      ...(this.description().trim() ? { description: this.description().trim() } : {}),
      ...(this.avatarUrl().trim() ? { avatar: this.avatarUrl().trim() } : {})
    };

    const obs = this.type() === 'public'
      ? this.svc.createCommunityPublic(data)
      : this.svc.createCommunityPrivate(data);

    obs.subscribe({
      next: (community) => {
        this.submitting.set(false);
        this.toast.show('Community created successfully.', 'success');
        this.created.emit({ community, type: this.type() });
        this.closed.emit();

        if (this.type() === 'public') {
          this.router.navigate(['/community/c', (community as CommunityPublic).id]);
        } else {
          console.log('Private community created, /community/p/:id route pending');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        if (err?.status === 409) {
          this.nameError.set('A community with this name already exists.');
        } else {
          this.generalError.set(err?.error?.message || 'Could not create community. Please try again.');
        }
      }
    });
  }
}
