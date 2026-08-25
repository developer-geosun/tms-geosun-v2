import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewEncapsulation
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService, Theme } from '../../core/services/theme.service';
import { ConfigService } from '../../core/services/config.service';
import { LanguageService, Language } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { SocialIconComponent } from '../../shared/components/social-icon/social-icon.component';
import { UserRole } from '../../shared/models';

/**
 * Компонент панелі інструментів (toolbar)
 */
@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatButtonToggleModule,
    TranslateModule,
    LogoComponent,
    SocialIconComponent
  ]
})
export class ToolbarComponent {
  private readonly themeService = inject(ThemeService);
  readonly configService = inject(ConfigService);
  private readonly translateService = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /** Після NavigationEnd — щоб OnPush оновлював клас активного маршруту */
  private readonly navigationUrl = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.navigationUrl.set(this.router.url));
  }

  readonly currentLanguage = this.languageService.language;
  readonly currentTheme = this.themeService.theme;
  readonly isLogoIconsOpen = signal(false);
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly navigationItems = [
    {
      route: '/main',
      labelKey: 'navigation.main',
      icon: 'home',
      roles: ['admin', 'manager', 'employee', 'user'] as const
    },
    {
      route: '/route-builder',
      labelKey: 'pages.routeBuilder.newRoute',
      icon: 'add',
      roles: ['user'] as const
    },
    {
      route: '/routes',
      labelKey: 'navigation.routes',
      icon: 'route',
      roles: ['user'] as const
    },
    {
      route: '/my-freight-requests',
      labelKey: 'navigation.myFreightRequests',
      icon: 'local_shipping',
      roles: ['user'] as const
    },
    {
      route: '/admin/route-requests',
      labelKey: 'navigation.adminRouteRequests',
      roles: ['admin', 'manager'] as const
    },
    {
      route: '/admin/currencies',
      labelKey: 'navigation.adminCurrencies',
      roles: ['admin', 'manager'] as const
    },
    {
      route: '/admin/country-reference',
      labelKey: 'navigation.adminCountryReference',
      roles: ['admin', 'manager'] as const
    },
    {
      route: '/admin/freight-numeric-scenarios',
      labelKey: 'navigation.adminFreightNumericScenarios',
      roles: ['admin', 'manager'] as const
    },
    {
      route: '/admin/toll-tariff-sets',
      labelKey: 'navigation.adminTollTariffSets',
      roles: ['admin', 'manager'] as const
    }
  ];
  
  // Доступні мови
  languages: { code: Language; label: string }[] = [
    { code: 'uk', label: 'UA' },
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' }
  ];

  themes: { code: Theme; label: string }[] = [
    { code: 'azure-blue', label: 'Azure & Blue' },
    { code: 'rose-red', label: 'Rose & Red' },
    { code: 'magenta-violet', label: 'Magenta & Violet' },
    { code: 'cyan-orange', label: 'Cyan & Orange' }
  ];

  /**
   * Змінює тему інтерфейсу
   */
  changeTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  /**
   * Змінює мову інтерфейсу
   */
  changeLanguage(language: Language): void {
    this.languageService.setLanguage(language);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateTo(route: string): void {
    if (route === '/route-builder') {
      this.router.navigate([route], {
        queryParams: {
          mode: 'create',
          routeId: null
        }
      });
      return;
    }
    this.router.navigate([route]);
  }

  isRouteActive(route: string): boolean {
    this.navigationUrl();
    const url = this.router.url;
    return url === route || url.startsWith(`${route}/`) || url.startsWith(`${route}?`);
  }

  /**
   * Інлайн-стилі для активного пункту навігаційного mat-menu: MDC перебиває звичайний CSS,
   * а інлайн background/color мають вищий пріоритет за стилі з класів (без !important).
   * Ті самі токени, що й у .nav-button--active (on-primary-container / primary-container).
   */
  navMenuActiveStyles(route: string): Record<string, string> | null {
    if (!this.isRouteActive(route)) {
      return null;
    }
    return {
      'background-color': 'var(--mat-sys-on-primary-container)',
      color: 'var(--mat-sys-primary-container)',
      '--mat-menu-item-label-text-color': 'var(--mat-sys-primary-container)',
      '--mat-menu-item-icon-color': 'var(--mat-sys-primary-container)',
      '--mat-menu-item-hover-state-layer-color': 'color-mix(in srgb, var(--mat-sys-primary-container) 18%, transparent)',
      '--mat-menu-item-focus-state-layer-color': 'color-mix(in srgb, var(--mat-sys-primary-container) 26%, transparent)'
    };
  }

  canAccess(allowedRoles: readonly UserRole[]): boolean {
    return this.authService.hasAnyRole(allowedRoles);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login'])
    });
  }

  toggleLogoIcons(event: Event): void {
    event.stopPropagation();
    this.isLogoIconsOpen.update((isOpen) => !isOpen);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isLogoIconsOpen()) {
      return;
    }

    const clickedElement = event.target as Node | null;
    if (!clickedElement) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(clickedElement)) {
      this.isLogoIconsOpen.set(false);
    }
  }

  /**
   * Отримує локалізовану назву секції мови у меню налаштувань
   */
  getLanguageSectionTitle(): string {
    return this.getSettingsSectionTitle('settings.languageSection');
  }

  /**
   * Отримує локалізовану назву секції теми у меню налаштувань
   */
  getThemeSectionTitle(): string {
    return this.getSettingsSectionTitle('settings.themeSection');
  }

  private getSettingsSectionTitle(key: 'settings.languageSection' | 'settings.themeSection'): string {
    const translated = this.translateService.instant(key);
    if (translated !== key) {
      return translated;
    }

    const fallbackByLanguage: Record<Language, Record<'settings.languageSection' | 'settings.themeSection', string>> = {
      uk: {
        'settings.languageSection': 'Мова',
        'settings.themeSection': 'Тема'
      },
      en: {
        'settings.languageSection': 'Language',
        'settings.themeSection': 'Theme'
      },
      ru: {
        'settings.languageSection': 'Язык',
        'settings.themeSection': 'Тема'
      }
    };

    return fallbackByLanguage[this.currentLanguage()][key];
  }
}

