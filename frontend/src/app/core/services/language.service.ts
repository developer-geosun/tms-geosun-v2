import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export type Language = 'uk' | 'en' | 'ru';

/**
 * Сервіс для управління мовою інтерфейсу
 */
@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANGUAGE_KEY = 'app-language';
  private readonly SUPPORTED_LANGUAGES: Language[] = ['uk', 'en', 'ru'];
  private readonly DEFAULT_LANGUAGE: Language = 'uk';
  
  private readonly translateService = inject(TranslateService);
  private readonly languageState = signal<Language>(this.getInitialLanguage());
  readonly language = this.languageState.asReadonly();
  readonly isDefaultLanguage = computed(() => this.languageState() === this.DEFAULT_LANGUAGE);
  readonly language$: Observable<Language> = toObservable(this.language);

  constructor() {
    // Налаштовуємо TranslateService
    this.translateService.setDefaultLang(this.DEFAULT_LANGUAGE);
    this.setLanguage(this.languageState());
  }

  /**
   * Отримує поточну мову
   */
  get currentLanguage(): Language {
    return this.languageState();
  }

  /**
   * Встановлює мову інтерфейсу
   */
  setLanguage(nextLanguage: Language): void {
    const language = this.SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : this.DEFAULT_LANGUAGE;

    this.languageState.set(language);
    this.translateService.use(language);
    this.updateHtmlLang(language);
    this.saveLanguage(language);
  }

  /**
   * Отримує початкову мову (з localStorage або за замовчуванням)
   */
  private getInitialLanguage(): Language {
    // Перевіряємо localStorage
    const saved = localStorage.getItem(this.LANGUAGE_KEY);
    if (saved && this.SUPPORTED_LANGUAGES.includes(saved as Language)) {
      return saved as Language;
    }

    // Завжди повертаємо мову за замовчуванням (українську)
    return this.DEFAULT_LANGUAGE;
  }

  /**
   * Оновлює атрибут lang в <html>
   */
  private updateHtmlLang(language: Language): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', language);
    }
  }

  /**
   * Зберігає мову в localStorage
   */
  private saveLanguage(language: Language): void {
    localStorage.setItem(this.LANGUAGE_KEY, language);
  }
}

