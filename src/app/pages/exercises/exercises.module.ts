import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ExercisesPage } from './exercises.page';
import { ExercisesRoutingModule } from './exercises-routing.module';

@NgModule({
  declarations: [ExercisesPage],
  imports: [
    CommonModule,
    IonicModule,
    ExercisesRoutingModule
  ]
})
export class ExercisesPageModule {}



