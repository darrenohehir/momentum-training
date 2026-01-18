import { Component, ViewChild, ElementRef } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { BackupService, ImportValidationResult } from '../../services/backup';
import { ExportPayload } from '../../models';

/** Maximum file size for import (20 MB) */
const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024;

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage {
  /** Reference to the hidden file input for import */
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  /** Export in progress */
  isExporting = false;

  /** Import in progress */
  isImporting = false;

  /** Status message to display */
  statusMessage = '';

  /** Whether status is an error */
  isError = false;

  constructor(
    private backupService: BackupService,
    private alertController: AlertController
  ) {}

  // ============================================
  // Export
  // ============================================

  /**
   * Export all data to a JSON file.
   */
  async exportBackup(): Promise<void> {
    if (this.isExporting) return;

    this.isExporting = true;
    this.clearStatus();

    try {
      await this.backupService.exportToFile();
      this.showStatus('Backup exported successfully.', false);
    } catch (error) {
      console.error('Export failed:', error);
      this.showStatus('Export failed. Please try again.', true);
    } finally {
      this.isExporting = false;
    }
  }

  // ============================================
  // Import
  // ============================================

  /**
   * Trigger the file input to select a backup file.
   */
  selectImportFile(): void {
    if (this.isImporting) return;
    this.fileInput.nativeElement.click();
  }

  /**
   * Handle file selection from the file input.
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    // Reset the input so the same file can be selected again
    input.value = '';

    if (!file) return;

    await this.processImportFile(file);
  }

  /**
   * Process the selected import file.
   */
  private async processImportFile(file: File): Promise<void> {
    this.clearStatus();

    // Step 0: Check file size to avoid freezing on very large files
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      const maxMB = MAX_IMPORT_FILE_SIZE / (1024 * 1024);
      this.showStatus(`File is too large. Maximum size is ${maxMB} MB.`, true);
      return;
    }

    // Step 1: Read and parse the file
    let parsed: unknown;
    try {
      parsed = await this.backupService.readFile(file);
    } catch (error) {
      this.showStatus((error as Error).message, true);
      return;
    }

    // Step 2: Validate the payload
    const validation = this.backupService.validateImportPayload(parsed);
    if (!validation.valid || !validation.payload) {
      this.showStatus(validation.error || 'Invalid backup file.', true);
      return;
    }

    // Step 3: Show confirmation with summary
    const confirmed = await this.confirmImport(validation.payload);
    if (!confirmed) return;

    // Step 4: Perform the import
    await this.executeImport(validation.payload);
  }

  /**
   * Show a confirmation alert before importing.
   */
  private async confirmImport(payload: ExportPayload): Promise<boolean> {
    const summary = this.backupService.getImportSummary(payload);
    const exportDate = new Date(summary.exportedAt).toLocaleDateString();

    const alert = await this.alertController.create({
      header: 'Import Backup',
      subHeader: `Backup from ${exportDate}`,
      message: `This will replace all current data with ${summary.counts.sessions} sessions, ${summary.counts.exercises} exercises, and ${summary.counts.sets} sets. This cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Replace Data',
          role: 'destructive',
          handler: () => true
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive';
  }

  /**
   * Execute the import operation.
   */
  private async executeImport(payload: ExportPayload): Promise<void> {
    this.isImporting = true;

    try {
      await this.backupService.importFromPayload(payload);
      this.showStatus('Backup imported successfully. Reloading...', false);

      // Reload the app to reflect imported data
      // Small delay so user can see the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Import failed:', error);
      // Transaction aborted - changes rolled back automatically
      this.showStatus('Import failed. Changes were rolled back.', true);
      this.isImporting = false;
    }
  }

  // ============================================
  // Status helpers
  // ============================================

  private showStatus(message: string, isError: boolean): void {
    this.statusMessage = message;
    this.isError = isError;

    // Auto-clear success messages after a delay
    if (!isError) {
      setTimeout(() => {
        if (this.statusMessage === message) {
          this.clearStatus();
        }
      }, 5000);
    }
  }

  private clearStatus(): void {
    this.statusMessage = '';
    this.isError = false;
  }
}
