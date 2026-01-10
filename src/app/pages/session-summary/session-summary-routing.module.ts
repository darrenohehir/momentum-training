import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SessionSummaryPage } from './session-summary.page';

const routes: Routes = [
  {
    path: '',
    component: SessionSummaryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SessionSummaryRoutingModule {}

