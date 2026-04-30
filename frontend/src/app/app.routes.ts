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
    path: 'community/c/:id',
    loadComponent: () => import('./features/community/pages/community-public-detail/community-public-detail.component')
      .then(m => m.CommunityPublicDetailComponent)
  },
  {
    path: 'community/p/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/community/pages/community-private-detail/community-private-detail.component')
      .then(m => m.CommunityPrivateDetailComponent)
  },
  {
    path: 'community/t/:slug',
    loadComponent: () => import('./features/community/pages/topic-detail/topic-detail.component')
      .then(m => m.TopicDetailComponent)
  },
  {
    path: 'community/t/:slug/p/:postId',
    loadComponent: () => import('./features/community/pages/post-reddit-detail/post-reddit-detail.component')
      .then(m => m.PostRedditDetailComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'profile/:username',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent)
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
  }
];
