import { Routes } from '@angular/router';

export const routes: Routes = [
  // Landing page for non-authenticated users.
  // Once auth is implemented (Phase 2), authenticated users
  // will be redirected from / to /markets
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'markets',
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
