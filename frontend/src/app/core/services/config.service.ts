import { Injectable } from '@angular/core';
import { APP_CONFIG, AppConfig } from '../../shared/constants/app.constants';
import { environment } from '../../../environments/environment';

/**
 * Сервіс для управління конфігурацією додатку
 * Надає доступ до констант та налаштувань
 */
@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  // Runtime-конфігурація має пріоритет над значеннями за замовчуванням
  readonly config: AppConfig = this.getRuntimeConfig();
  
  // Налаштування середовища
  readonly environment = environment;

  /**
   * Базовий URL backend API.
   * Runtime (__APP_CONFIG__.apiUrl) має пріоритет над environment.apiUrl.
   */
  get apiUrl(): string {
    const fromRuntime =
      typeof this.config.apiUrl === 'string' ? this.config.apiUrl.trim() : '';
    if (fromRuntime.length > 0) {
      return fromRuntime.replace(/\/+$/, '');
    }
    return (this.environment.apiUrl || '').replace(/\/+$/, '');
  }

  /**
   * Отримує URL для Telegram (для toolbar)
   */
  get telegramUrl(): string {
    const phoneDigits = this.config.phoneNumber.replace(/[^0-9]/g, '');
    return `https://t.me/+${phoneDigits}`;
  }

  /**
   * Отримує URL для WhatsApp (для toolbar)
   */
  get whatsAppUrl(): string {
    return `https://wa.me/${this.config.phoneNumberForWhatsApp}`;
  }

  /**
   * Отримує URL для Viber (для toolbar)
   */
  get viberUrl(): string {
    return `viber://chat?number=${encodeURIComponent(this.config.phoneNumber)}`;
  }

  /**
   * Отримує URL для Telegram розробника (для footer)
   */
  get developerTelegramUrl(): string {
    const phoneDigits = this.config.developerPhoneNumber.replace(/[^0-9]/g, '');
    return `https://t.me/+${phoneDigits}`;
  }

  /**
   * Отримує URL для WhatsApp розробника (для footer)
   */
  get developerWhatsAppUrl(): string {
    return `https://wa.me/${this.config.developerPhoneNumberForWhatsApp}`;
  }

  /**
   * Отримує URL для Viber розробника (для footer)
   */
  get developerViberUrl(): string {
    return `viber://chat?number=${encodeURIComponent(this.config.developerPhoneNumber)}`;
  }

  /**
   * Отримує URL для Facebook (для toolbar)
   */
  get facebookUrl(): string {
    return this.config.facebookUrl;
  }

  /**
   * Отримує URL для Facebook розробника (для footer)
   */
  get developerFacebookUrl(): string {
    return this.config.developerFacebookUrl;
  }

  /**
   * Отримує URL для LinkedIn розробника (для footer)
   */
  get developerLinkedInUrl(): string {
    return this.config.linkedinUrl;
  }

  /**
   * Отримує URL логотипу
   */
  get logoUrl(): string {
    return this.config.logoUrl;
  }

  /**
   * Перевіряє, чи зупинено сервіс
   * При true всі сторінки редиректять на /stop-service
   */
  get isServiceStopped(): boolean {
    return this.config.isServiceStopped;
  }

  private getRuntimeConfig(): AppConfig {
    const runtimeConfig = this.readRuntimeConfig();
    return {
      ...APP_CONFIG,
      ...runtimeConfig
    };
  }

  private readRuntimeConfig(): Partial<AppConfig> {
    if (typeof window === 'undefined') {
      return {};
    }

    const candidate = (window as Window & { __APP_CONFIG__?: unknown }).__APP_CONFIG__;
    if (!candidate || typeof candidate !== 'object') {
      return {};
    }

    return candidate as Partial<AppConfig>;
  }
}

