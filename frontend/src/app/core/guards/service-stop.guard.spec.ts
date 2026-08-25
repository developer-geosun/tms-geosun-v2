import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { serviceStopGuard } from './service-stop.guard';
import { ConfigService } from '../services/config.service';

describe('serviceStopGuard', () => {
  const createRoute = (path: string): ActivatedRouteSnapshot =>
    ({ routeConfig: { path } } as unknown as ActivatedRouteSnapshot);

  it('allows access when service is not stopped', () => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigService, useValue: { isServiceStopped: false } },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = TestBed.runInInjectionContext(() => serviceStopGuard(createRoute('main'), {} as never));

    expect(result).toBeTrue();
    expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
  });

  it('returns UrlTree redirect when service is stopped', () => {
    const expectedTree = {} as UrlTree;
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.returnValue(expectedTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigService, useValue: { isServiceStopped: true } },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = TestBed.runInInjectionContext(() => serviceStopGuard(createRoute('main'), {} as never));

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/stop-service']);
    expect(result).toBe(expectedTree);
  });

  it('allows stop-service and 404 paths even when stopped', () => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ConfigService, useValue: { isServiceStopped: true } },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const stopServiceResult = TestBed.runInInjectionContext(() => serviceStopGuard(createRoute('stop-service'), {} as never));
    const notFoundResult = TestBed.runInInjectionContext(() => serviceStopGuard(createRoute('404'), {} as never));

    expect(stopServiceResult).toBeTrue();
    expect(notFoundResult).toBeTrue();
    expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
  });
});
