import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BodyweightPage } from './bodyweight.page';

const routes: Routes = [
  {
    path: '',
    component: BodyweightPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BodyweightRoutingModule {}

