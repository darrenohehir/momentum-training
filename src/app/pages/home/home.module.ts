import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HomePage } from './home.page';
import { HomeRoutingModule } from './home-routing.module';

@NgModule({
  declarations: [HomePage],
  imports: [
    CommonModule,
    IonicModule,
    HomeRoutingModule
  ]
})
export class HomePageModule {}



