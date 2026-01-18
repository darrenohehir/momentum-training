import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController } from '@ionic/angular';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false
})
export class TabsPage {
  constructor(
    private actionSheetController: ActionSheetController,
    private router: Router
  ) {}

  /**
   * Open the quick-add action sheet from the FAB.
   * Provides quick access to create flows without cluttering tabs.
   */
  async openQuickAdd(): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: 'Quick Add',
      buttons: [
        {
          text: 'Start session',
          icon: 'barbell-outline',
          handler: () => {
            this.router.navigate(['/start-session']);
          }
        },
        {
          text: 'Log bodyweight',
          icon: 'scale-outline',
          handler: () => {
            this.router.navigate(['/bodyweight']);
          }
        },
        {
          text: 'Log food',
          icon: 'restaurant-outline',
          handler: () => {
            this.router.navigate(['/food']);
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close-outline'
        }
      ]
    });

    await actionSheet.present();
  }
}
