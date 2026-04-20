import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    // NOTE: markets is visible to everyone in the final design, but write actions
    // require login. For now we gate the whole route as a placeholder — refine
    // when the markets feature is implemented.
    path: 'markets',
    // canActivate: [authGuard],
    loadComponent: () => import('./features/markets/markets.component').then(m => m.MarketsComponent)
  },
  {
    path: 'community',
    loadComponent: () => import('./features/community/community.component').then(m => m.CommunityComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  }
];
