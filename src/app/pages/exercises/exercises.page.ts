import { Component, OnInit } from '@angular/core';
import { Exercise } from '../../models';
import { DbService } from '../../services/db';

@Component({
  selector: 'app-exercises',
  templateUrl: './exercises.page.html',
  styleUrls: ['./exercises.page.scss'],
  standalone: false
})
export class ExercisesPage implements OnInit {
  /** List of exercises loaded from database */
  exercises: Exercise[] = [];

  /** Loading state flag */
  isLoading = true;

  constructor(private db: DbService) {}

  async ngOnInit(): Promise<void> {
    await this.loadExercises();
  }

  /**
   * Load all exercises from the database.
   */
  private async loadExercises(): Promise<void> {
    this.isLoading = true;
    try {
      this.exercises = await this.db.getAllExercises();
    } catch (error) {
      console.error('Failed to load exercises:', error);
      this.exercises = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Format category for display (capitalize first letter).
   */
  formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
}
