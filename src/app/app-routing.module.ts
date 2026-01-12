import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { environment } from '../environments/environment';

const routes: Routes = [
  // Tabs-based navigation (primary)
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  // Non-tab routes (navigated programmatically)
  {
    path: 'start-session',
    loadChildren: () => import('./pages/start-session/start-session.module').then(m => m.StartSessionPageModule)
  },
  {
    path: 'session',
    loadChildren: () => import('./pages/session/session.module').then(m => m.SessionPageModule)
  },
  {
    path: 'session/:id',
    loadChildren: () => import('./pages/session/session.module').then(m => m.SessionPageModule)
  },
  {
    path: 'session/:id/summary',
    loadChildren: () => import('./pages/session-summary/session-summary.module').then(m => m.SessionSummaryPageModule)
  },
  {
    path: 'bodyweight',
    loadChildren: () => import('./pages/bodyweight/bodyweight.module').then(m => m.BodyweightPageModule)
  },
  // History detail (read-only session view)
  {
    path: 'history/:id',
    loadChildren: () => import('./pages/history-detail/history-detail.module').then(m => m.HistoryDetailPageModule)
  },
  // Default redirect to tabs/home
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
      useHash: environment.useHashRouting
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
