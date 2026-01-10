import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { StartSessionPage } from './start-session.page';
import { StartSessionRoutingModule } from './start-session-routing.module';

@NgModule({
  declarations: [StartSessionPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StartSessionRoutingModule
  ]
})
export class StartSessionPageModule {}

