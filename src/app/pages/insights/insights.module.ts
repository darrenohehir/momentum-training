import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { InsightsPage } from './insights.page';
import { InsightsRoutingModule } from './insights-routing.module';

@NgModule({
  declarations: [InsightsPage],
  imports: [
    CommonModule,
    IonicModule,
    InsightsRoutingModule
  ]
})
export class InsightsPageModule {}

