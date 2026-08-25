import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    TestBed.configureTestingModule({});
  });

  it('sets default theme when nothing is stored', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.currentTheme).toBe('azure-blue');
    expect(document.body.classList.contains('theme-azure-blue')).toBeTrue();
  });

  it('updates theme signal and persists selected value', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('rose-red');

    expect(service.currentTheme).toBe('rose-red');
    expect(localStorage.getItem('app-theme')).toBe('rose-red');
    expect(document.body.classList.contains('theme-rose-red')).toBeTrue();
  });
});
