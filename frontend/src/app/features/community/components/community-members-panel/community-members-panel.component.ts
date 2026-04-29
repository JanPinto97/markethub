import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityMember, CommunityRole } from '../../services/community.service';
import { getUsernameColor, getInitial } from '../../../../shared/utils/color.utils';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-community-members-panel',
  standalone: true,
  imports: [RouterLink, MediaUrlPipe],
  templateUrl: './community-members-panel.component.html',
  styleUrl: './community-members-panel.component.css'
})
export class CommunityMembersPanelComponent {
  @Input() members: CommunityMember[] = [];
  @Input() myRole: CommunityRole | null = null;
  @Input() currentUserId = '';
  @Output() expel = new EventEmitter<string>();
  @Output() promote = new EventEmitter<{ userId: string; role: CommunityRole }>();

  openDropdownId = signal<string | null>(null);

  get isLeader(): boolean {
    return this.myRole === 'leader';
  }

  roleLabel(role: CommunityRole): string {
    switch (role) {
      case 'leader': return '👑 Leader';
      case 'moderator': return '🛡 Mod';
      case 'little_whale': return '🐋 Whale';
      default: return 'Member';
    }
  }

  roleClass(role: CommunityRole): string {
    return `role-${role}`;
  }

  canManage(member: CommunityMember): boolean {
    return this.isLeader && member.user.id !== this.currentUserId;
  }

  onExpel(userId: string) {
    if (!confirm('Remove this member from the community?')) return;
    this.expel.emit(userId);
  }

  toggleDropdown(userId: string, event: Event) {
    event.stopPropagation();
    this.openDropdownId.update(v => v === userId ? null : userId);
  }

  onPromote(userId: string, role: CommunityRole) {
    this.openDropdownId.set(null);
    this.promote.emit({ userId, role });
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.openDropdownId()) this.openDropdownId.set(null);
  }

  initialColor(name: string): string {
    return getUsernameColor(name);
  }

  initial(name: string): string {
    return getInitial(name);
  }

  readonly availableRoles: CommunityRole[] = ['moderator', 'little_whale', 'member'];
}
