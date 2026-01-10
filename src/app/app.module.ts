import { APP_INITIALIZER, NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DbInitService } from './services/db';

/**
 * Factory function for APP_INITIALIZER.
 * Ensures database is initialized and seeded before app starts.
 */
function initializeApp(dbInit: DbInitService): () => Promise<void> {
  return () => dbInit.initialize();
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [DbInitService],
      multi: true
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
