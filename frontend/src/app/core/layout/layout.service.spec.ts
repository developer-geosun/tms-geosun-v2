import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { LAYOUT_QUERIES } from './layout-breakpoints';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  let breakpointSubject: Subject<BreakpointState>;
  let service: LayoutService;

  function emitBreakpoints(active: Partial<Record<string, boolean>>): void {
    breakpointSubject.next({
      matches: Object.values(active).some(Boolean),
      breakpoints: {
        [LAYOUT_QUERIES.handset]: active[LAYOUT_QUERIES.handset] ?? false,
        [LAYOUT_QUERIES.tablet]: active[LAYOUT_QUERIES.tablet] ?? false,
        [LAYOUT_QUERIES.desktop]: active[LAYOUT_QUERIES.desktop] ?? false,
        [LAYOUT_QUERIES.compactSplit]: active[LAYOUT_QUERIES.compactSplit] ?? false
      }
    });
  }

  beforeEach(() => {
    breakpointSubject = new Subject<BreakpointState>();
    TestBed.configureTestingModule({
      providers: [
        LayoutService,
        {
          provide: BreakpointObserver,
          useValue: {
            observe: (): Observable<BreakpointState> => breakpointSubject.asObservable()
          }
        }
      ]
    });
    service = TestBed.inject(LayoutService);
  });

  it('sets handset signal and handset page size', () => {
    emitBreakpoints({
      [LAYOUT_QUERIES.handset]: true,
      [LAYOUT_QUERIES.compactSplit]: true
    });

    expect(service.isHandset()).toBeTrue();
    expect(service.isDesktop()).toBeFalse();
    expect(service.isCompactSplit()).toBeTrue();
    expect(service.handsetPageSize(10, 5)).toBe(5);
  });

  it('sets desktop signal and default page size', () => {
    emitBreakpoints({
      [LAYOUT_QUERIES.desktop]: true
    });

    expect(service.isHandset()).toBeFalse();
    expect(service.isDesktop()).toBeTrue();
    expect(service.isNarrow()).toBeFalse();
    expect(service.handsetPageSize(10, 5)).toBe(10);
  });

  it('sets tablet and compactSplit independently', () => {
    emitBreakpoints({
      [LAYOUT_QUERIES.tablet]: true,
      [LAYOUT_QUERIES.compactSplit]: true
    });

    expect(service.isTablet()).toBeTrue();
    expect(service.isCompactSplit()).toBeTrue();
    expect(service.isHandset()).toBeFalse();
    expect(service.isNarrow()).toBeTrue();
  });
});
