import { Component, inject, signal, OnInit, ViewChild, ElementRef, HostListener, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CommunityService, CommunityPrivateDetail,
  CommunityMember, CommunityRole, JoinRequest
} from '../../services/community.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-community-private-details',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe],
  templateUrl: './community-private-details.component.html',
  styleUrl: './community-private-details.component.css'
})
export class CommunityPrivateDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);
  private svc = inject(CommunityService);
  private toast = inject(ToastService);

  @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;

  communityId = '';
  community = signal<CommunityPrivateDetail | null>(null);
  loading = signal(true);
  error = signal(false);

  // Inline editing
  editingName = signal(false);
  editingDescription = signal(false);
  nameDraft = signal('');
  descriptionDraft = signal('');
  savingName = signal(false);
  savingDescription = signal(false);
  nameError = signal<string | null>(null);
  descriptionError = signal<string | null>(null);
  savingAvatar = signal(false);

  // Confirm dialogs
  showLeaveConfirm = signal(false);
  showDeleteConfirm = signal(false);
  leaving = signal(false);

  // Selected join request modal
  selectedRequest = signal<JoinRequest | null>(null);

  // Promote dropdown
  openPromoteId = signal<string | null>(null);

  readonly availableRoles: CommunityRole[] = ['moderator', 'little_whale', 'member'];

  ngOnInit() {
    this.communityId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.communityId) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loadCommunity();
  }

  private loadCommunity() {
    this.loading.set(true);
    this.error.set(false);
    this.svc.getCommunityPrivate(this.communityId).subscribe({
      next: (c) => {
        if (!c.isMember) {
          this.router.navigate(['/community/p', this.communityId]);
          return;
        }
        this.community.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  retry() { this.loadCommunity(); }

  goBack() {
    this.router.navigate(['/community/p', this.communityId]);
  }

  // ── Role helpers ──

  isLeader = computed(() => this.community()?.myRole === 'leader');
  isModerator = computed(() => this.community()?.myRole === 'moderator');
  canViewRequests = computed(() => this.isLeader() || this.isModerator());
  canLeave = computed(() => {
    const r = this.community()?.myRole;
    return r === 'moderator' || r === 'member' || r === 'little_whale';
  });

  roleLabel(role: CommunityRole): string {
    switch (role) {
      case 'leader': return '👑 Leader';
      case 'moderator': return '🛡 Mod';
      case 'little_whale': return '🐋 Whale';
      default: return 'Member';
    }
  }

  roleClass(role: CommunityRole): string { return `role-${role}`; }

  canManage(member: CommunityMember): boolean {
    return this.isLeader() && member.user.id !== this.currentUserId && member.role !== 'leader';
  }

  // ── Inline edit: name ──

  startEditName() {
    if (!this.isLeader()) return;
    const c = this.community();
    if (!c) return;
    this.nameDraft.set(c.name);
    this.nameError.set(null);
    this.editingName.set(true);
  }

  cancelEditName() {
    this.editingName.set(false);
    this.nameError.set(null);
  }

  saveName() {
    const name = this.nameDraft().trim();
    if (!name || name.length < 3 || name.length > 50) {
      this.nameError.set('Name must be 3-50 characters');
      return;
    }
    const c = this.community();
    if (!c || name === c.name) {
      this.editingName.set(false);
      return;
    }
    this.savingName.set(true);
    this.nameError.set(null);
    this.svc.updateCommunityPrivate(this.communityId, { name }).subscribe({
      next: () => {
        this.community.update(v => v ? { ...v, name } : v);
        this.savingName.set(false);
        this.editingName.set(false);
        this.toast.show('Community name updated.', 'success');
      },
      error: (err) => {
        this.savingName.set(false);
        this.nameError.set(err?.error?.message || 'Could not update name.');
      }
    });
  }

  onNameInput(event: Event) {
    this.nameDraft.set((event.target as HTMLInputElement).value);
  }

  // ── Inline edit: description ──

  startEditDescription() {
    if (!this.isLeader()) return;
    const c = this.community();
    if (!c) return;
    this.descriptionDraft.set(c.description || '');
    this.descriptionError.set(null);
    this.editingDescription.set(true);
  }

  cancelEditDescription() {
    this.editingDescription.set(false);
    this.descriptionError.set(null);
  }

  saveDescription() {
    const description = this.descriptionDraft();
    if (description.length > 300) {
      this.descriptionError.set('Description max 300 characters');
      return;
    }
    const c = this.community();
    if (!c || description === (c.description || '')) {
      this.editingDescription.set(false);
      return;
    }
    this.savingDescription.set(true);
    this.descriptionError.set(null);
    this.svc.updateCommunityPrivate(this.communityId, { description }).subscribe({
      next: () => {
        this.community.update(v => v ? { ...v, description } : v);
        this.savingDescription.set(false);
        this.editingDescription.set(false);
        this.toast.show('Description updated.', 'success');
      },
      error: (err) => {
        this.savingDescription.set(false);
        this.descriptionError.set(err?.error?.message || 'Could not update description.');
      }
    });
  }

  onDescriptionInput(event: Event) {
    const ta = event.target as HTMLTextAreaElement;
    let val = ta.value;
    if (val.length > 300) val = val.slice(0, 300);
    this.descriptionDraft.set(val);
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }

  // ── Avatar upload ──

  triggerAvatarPicker() {
    if (!this.isLeader()) return;
    this.avatarInput?.nativeElement.click();
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!imageTypes.includes(file.type)) {
      this.toast.show('Unsupported image type.', 'error');
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toast.show('Image too large (max 10MB).', 'error');
      input.value = '';
      return;
    }
    this.savingAvatar.set(true);
    this.svc.updateCommunityPrivateAvatar(this.communityId, file).subscribe({
      next: (res) => {
        this.community.update(v => v ? { ...v, avatar: res.avatar } : v);
        this.savingAvatar.set(false);
        this.toast.show('Avatar updated.', 'success');
      },
      error: (err) => {
        this.savingAvatar.set(false);
        this.toast.show(err?.error?.message || 'Could not upload avatar.', 'error');
      }
    });
    input.value = '';
  }

  // ── Leave ──

  onLeaveClick() { this.showLeaveConfirm.set(true); }
  cancelLeave() { this.showLeaveConfirm.set(false); }

  get isLastMember(): boolean {
    const c = this.community();
    return !!c && c.memberCount <= 1 && c.isMember;
  }

  confirmLeave() {
    this.showLeaveConfirm.set(false);
    if (this.leaving()) return;
    this.leaving.set(true);
    this.svc.leaveCommunityPrivate(this.communityId).subscribe({
      next: () => {
        this.leaving.set(false);
        this.svc.communityMembershipChanged$.next({ id: this.communityId, action: 'left' });
        this.toast.show('Left community.', 'success');
        this.router.navigate(['/community']);
      },
      error: () => {
        this.leaving.set(false);
        this.toast.show('Could not leave community.', 'error');
      }
    });
  }

  // ── Delete ──

  onDeleteClick() { this.showDeleteConfirm.set(true); }
  cancelDelete() { this.showDeleteConfirm.set(false); }

  confirmDelete() {
    this.showDeleteConfirm.set(false);
    this.svc.deleteCommunityPrivate(this.communityId).subscribe({
      next: () => {
        this.svc.communityMembershipChanged$.next({ id: this.communityId, action: 'left' });
        this.toast.show('Community deleted.', 'success');
        this.router.navigate(['/community']);
      },
      error: () => {
        this.toast.show('Could not delete community.', 'error');
      }
    });
  }

  // ── Members actions ──

  togglePromote(userId: string, event: Event) {
    event.stopPropagation();
    this.openPromoteId.update(v => v === userId ? null : userId);
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.openPromoteId()) this.openPromoteId.set(null);
  }

  onExpel(userId: string) {
    if (!confirm('Remove this member from the community?')) return;
    this.svc.expelMember(this.communityId, userId).subscribe({
      next: () => {
        this.community.update(c => {
          if (!c || !c.members) return c;
          return {
            ...c,
            members: c.members.filter(m => m.user.id !== userId),
            memberCount: c.memberCount - 1
          };
        });
        this.toast.show('Member removed.', 'success');
      },
      error: () => this.toast.show('Could not remove member.', 'error')
    });
  }

  onPromote(userId: string, role: CommunityRole) {
    this.openPromoteId.set(null);
    this.svc.changeMemberRole(this.communityId, userId, role).subscribe({
      next: () => {
        this.community.update(c => {
          if (!c || !c.members) return c;
          return {
            ...c,
            members: c.members.map(m => m.user.id === userId ? { ...m, role } : m)
          };
        });
        this.toast.show('Role updated.', 'success');
      },
      error: () => this.toast.show('Could not update role.', 'error')
    });
  }

  // ── Pending requests ──

  openRequest(req: JoinRequest) { this.selectedRequest.set(req); }
  closeRequest() { this.selectedRequest.set(null); }

  @HostListener('document:keydown.escape')
  onEscape() { this.closeRequest(); }

  acceptRequest(requestId: string) {
    this.closeRequest();
    this.svc.acceptRequest(this.communityId, requestId).subscribe({
      next: () => {
        const c = this.community();
        if (!c) return;
        const req = c.pendingRequests?.find(r => r._id === requestId);
        this.community.update(v => {
          if (!v) return v;
          const updated = {
            ...v,
            pendingRequests: (v.pendingRequests || []).filter(r => r._id !== requestId),
            memberCount: v.memberCount + 1,
          };
          if (req && updated.members) {
            updated.members = [...updated.members, {
              user: { id: req.user.id, username: req.user.username, avatar: req.user.avatar },
              role: 'member' as CommunityRole
            }];
          }
          return updated;
        });
        this.toast.show('Request accepted.', 'success');
      },
      error: () => this.toast.show('Could not accept request.', 'error')
    });
  }

  rejectRequest(requestId: string) {
    this.closeRequest();
    this.svc.rejectRequest(this.communityId, requestId).subscribe({
      next: () => {
        this.community.update(v => v ? {
          ...v,
          pendingRequests: (v.pendingRequests || []).filter(r => r._id !== requestId)
        } : v);
        this.toast.show('Request rejected.', 'success');
      },
      error: () => this.toast.show('Could not reject request.', 'error')
    });
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

  get currentUserId(): string {
    return this.auth.currentUser()?.id || '';
  }

  initialColor(name: string): string { return getUsernameColor(name); }
  initial(name: string): string { return getInitial(name); }
}
