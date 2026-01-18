import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FoodPage } from './food.page';
import { FoodRoutingModule } from './food-routing.module';

@NgModule({
  declarations: [FoodPage],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FoodRoutingModule
  ]
})
export class FoodPageModule {}
