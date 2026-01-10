import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StartSessionPage } from './start-session.page';

const routes: Routes = [
  {
    path: '',
    component: StartSessionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StartSessionRoutingModule {}

