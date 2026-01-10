import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DbService } from '../../services/db';
import { Exercise, ExerciseCategory, EquipmentType } from '../../models';

/**
 * View mode for the exercise picker.
 */
type PickerView = 'list' | 'create';

@Component({
  selector: 'app-exercise-picker',
  templateUrl: './exercise-picker.component.html',
  styleUrls: ['./exercise-picker.component.scss'],
  standalone: false
})
export class ExercisePickerComponent implements OnInit {
  /** All exercises from DB */
  exercises: Exercise[] = [];

  /** Filtered exercises based on search */
  filteredExercises: Exercise[] = [];

  /** Search query */
  searchQuery = '';

  /** Loading state */
  isLoading = true;

  /** Current view mode */
  view: PickerView = 'list';

  // New exercise form fields
  newExerciseName = '';
  newExerciseCategory: ExerciseCategory = 'other';
  newExerciseEquipment: EquipmentType = 'other';

  /** Category options for the form */
  categoryOptions: { value: ExerciseCategory; label: string }[] = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'arms', label: 'Arms' },
    { value: 'legs', label: 'Legs' },
    { value: 'core', label: 'Core' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'other', label: 'Other' }
  ];

  /** Equipment options for the form */
  equipmentOptions: { value: EquipmentType; label: string }[] = [
    { value: 'barbell', label: 'Barbell' },
    { value: 'dumbbell', label: 'Dumbbell' },
    { value: 'cable', label: 'Cable' },
    { value: 'machine', label: 'Machine' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'other', label: 'Other' }
  ];

  constructor(
    private modalController: ModalController,
    private db: DbService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadExercises();
  }

  /**
   * Load all exercises from database.
   */
  async loadExercises(): Promise<void> {
    this.isLoading = true;
    try {
      this.exercises = await this.db.getAllExercises();
      this.filterExercises();
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Filter exercises based on search query.
   */
  filterExercises(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredExercises = [...this.exercises];
    } else {
      this.filteredExercises = this.exercises.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        ex.category.toLowerCase().includes(query)
      );
    }
  }

  /**
   * Handle search input changes.
   */
  onSearchChange(): void {
    this.filterExercises();
  }

  /**
   * Select an exercise and dismiss the modal.
   */
  selectExercise(exercise: Exercise): void {
    this.modalController.dismiss({ exercise, isNew: false });
  }

  /**
   * Switch to create exercise view.
   */
  showCreateForm(): void {
    // Pre-fill name with search query if user searched for something
    this.newExerciseName = this.searchQuery;
    this.view = 'create';
  }

  /**
   * Go back to list view.
   */
  cancelCreate(): void {
    this.view = 'list';
    this.resetCreateForm();
  }

  /**
   * Reset the create form fields.
   */
  private resetCreateForm(): void {
    this.newExerciseName = '';
    this.newExerciseCategory = 'other';
    this.newExerciseEquipment = 'other';
  }

  /**
   * Create a new exercise and select it.
   */
  async createExercise(): Promise<void> {
    const name = this.newExerciseName.trim();
    if (!name) return;

    const now = new Date().toISOString();
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name,
      category: this.newExerciseCategory,
      equipmentType: this.newExerciseEquipment,
      createdAt: now,
      updatedAt: now
    };

    try {
      await this.db.addExercise(newExercise);
      // Dismiss with the new exercise
      this.modalController.dismiss({ exercise: newExercise, isNew: true });
    } catch (error) {
      console.error('Failed to create exercise:', error);
      // TODO: Show error toast
    }
  }

  /**
   * Check if create form is valid.
   */
  get isCreateFormValid(): boolean {
    return this.newExerciseName.trim().length > 0;
  }

  /**
   * Dismiss the modal without selection.
   */
  dismiss(): void {
    this.modalController.dismiss(null);
  }

  /**
   * Format category for display.
   */
  formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

