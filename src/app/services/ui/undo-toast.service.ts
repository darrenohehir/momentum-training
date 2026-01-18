import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** Duration the undo toast is shown (ms) */
const UNDO_DURATION_MS = 5000;

/** Options for presenting an undo toast */
export interface UndoToastOptions {
  /** Message shown in the toast (e.g., "Entry deleted") */
  message: string;
  /** Callback invoked when user taps "Undo" */
  onUndo: () => void | Promise<void>;
}

/**
 * Minimal service for displaying undo toasts via Ionic ToastController.
 * 
 * Features:
 * - Shows a bottom toast with an "Undo" button
 * - Dismisses any existing toast before showing a new one (predictable behavior)
 * - Calls the provided onUndo callback when user taps "Undo"
 * - Auto-dismisses after 5 seconds
 */
@Injectable({
  providedIn: 'root'
})
export class UndoToastService {
  /** Reference to the currently displayed toast (if any) */
  private currentToast: HTMLIonToastElement | null = null;

  constructor(private toastController: ToastController) {}

  /**
   * Present an undo toast.
   * Dismisses any existing toast before showing the new one.
   * 
   * @param options - Message and undo callback
   */
  async present(options: UndoToastOptions): Promise<void> {
    // Dismiss any existing toast first (ensures only latest undo is available)
    await this.dismiss();

    const toast = await this.toastController.create({
      message: options.message,
      duration: UNDO_DURATION_MS,
      position: 'bottom',
      buttons: [
        {
          text: 'Undo',
          role: 'cancel',
          handler: () => {
            options.onUndo();
          }
        }
      ]
    });

    this.currentToast = toast;

    // Clear reference when toast is dismissed (by timeout or user action)
    toast.onDidDismiss().then(() => {
      if (this.currentToast === toast) {
        this.currentToast = null;
      }
    });

    await toast.present();
  }

  /**
   * Dismiss the current toast (if any).
   */
  async dismiss(): Promise<void> {
    if (this.currentToast) {
      await this.currentToast.dismiss();
      this.currentToast = null;
    }
  }
}
