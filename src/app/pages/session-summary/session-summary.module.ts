import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SessionSummaryPage } from './session-summary.page';
import { SessionSummaryRoutingModule } from './session-summary-routing.module';

@NgModule({
  declarations: [SessionSummaryPage],
  imports: [
    CommonModule,
    IonicModule,
    SessionSummaryRoutingModule
  ]
})
export class SessionSummaryPageModule {}

