import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SessionPage } from './session.page';
import { SessionRoutingModule } from './session-routing.module';

@NgModule({
  declarations: [SessionPage],
  imports: [
    CommonModule,
    IonicModule,
    SessionRoutingModule
  ]
})
export class SessionPageModule {}

