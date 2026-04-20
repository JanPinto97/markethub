import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './community.component.html',
  styleUrl: './community.component.css'
})
export class CommunityComponent {
  auth = inject(AuthService);

  activeTab: 'trending' | 'following' = 'trending';

  setTab(tab: 'trending' | 'following') {
    this.activeTab = tab;
  }
}
