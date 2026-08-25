import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    localStorage.clear();
    translateServiceSpy = jasmine.createSpyObj<TranslateService>('TranslateService', ['setDefaultLang', 'use']);

    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: translateServiceSpy }]
    });
  });

  it('sets default language on startup', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.currentLanguage).toBe('uk');
    expect(translateServiceSpy.setDefaultLang).toHaveBeenCalledWith('uk');
    expect(translateServiceSpy.use).toHaveBeenCalledWith('uk');
    expect(document.documentElement.lang).toBe('uk');
  });

  it('falls back to default when unsupported language is provided', () => {
    const service = TestBed.inject(LanguageService);

    service.setLanguage('de' as never);

    expect(service.currentLanguage).toBe('uk');
    expect(localStorage.getItem('app-language')).toBe('uk');
  });
});
