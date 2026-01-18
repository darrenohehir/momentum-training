import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SettingsPage } from './settings.page';
import { SettingsRoutingModule } from './settings-routing.module';

@NgModule({
  declarations: [SettingsPage],
  imports: [
    CommonModule,
    IonicModule,
    SettingsRoutingModule
  ]
})
export class SettingsPageModule {}



