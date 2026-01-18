import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BodyweightPage } from './bodyweight.page';
import { BodyweightRoutingModule } from './bodyweight-routing.module';

@NgModule({
  declarations: [BodyweightPage],
  imports: [
    CommonModule,
    IonicModule,
    BodyweightRoutingModule
  ]
})
export class BodyweightPageModule {}



