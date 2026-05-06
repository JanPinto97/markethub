import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { getUsernameColor, getInitial } from '../../utils/color.utils';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MediaUrlPipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  auth = inject(AuthService);

  getUsernameColor = getUsernameColor;
  getInitial = getInitial;
}
