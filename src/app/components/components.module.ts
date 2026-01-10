import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ExercisePickerComponent } from './exercise-picker/exercise-picker.component';

/**
 * Shared components module.
 * Import this module where components are needed.
 */
@NgModule({
  declarations: [
    ExercisePickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  exports: [
    ExercisePickerComponent
  ]
})
export class ComponentsModule {}

