import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SessionPage } from './session.page';
import { SessionRoutingModule } from './session-routing.module';
import { ComponentsModule } from '../../components/components.module';

@NgModule({
  declarations: [SessionPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SessionRoutingModule,
    ComponentsModule
  ]
})
export class SessionPageModule {}

