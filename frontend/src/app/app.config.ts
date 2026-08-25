import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, importProvidersFrom, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor, ngrokSkipInterceptor } from './core/interceptors';
import { AuthService, TranslatedMatPaginatorIntl } from './core/services';

// Фабрика для завантаження перекладів з assets
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

function sessionVerifyInitializerFactory(): () => Promise<void> {
  return async () => {
    const authService = inject(AuthService);
    await firstValueFrom(authService.verifySessionOnStartup());
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'uk' },
    { provide: MatPaginatorIntl, useClass: TranslatedMatPaginatorIntl },
    provideRouter(routes),
    provideHttpClient(withInterceptors([ngrokSkipInterceptor, authInterceptor])),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: sessionVerifyInitializerFactory,
      multi: true
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        },
        defaultLanguage: 'uk'
      })
    )
  ]
};
