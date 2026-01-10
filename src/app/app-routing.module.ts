import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

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
    path: 'bodyweight',
    loadChildren: () => import('./pages/bodyweight/bodyweight.module').then(m => m.BodyweightPageModule)
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
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
