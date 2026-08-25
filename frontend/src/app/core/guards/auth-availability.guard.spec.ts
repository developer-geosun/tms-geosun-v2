import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { isObservable, Observable, of } from 'rxjs';
import { authAvailabilityGuard } from './auth-availability.guard';
import { AuthAvailabilityService } from '../services';

describe('authAvailabilityGuard', () => {
  const createRoute = (path: string): ActivatedRouteSnapshot =>
    ({ routeConfig: { path } } as unknown as ActivatedRouteSnapshot);

  it('allows access when auth server is available', (done) => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    const authAvailabilityServiceSpy = jasmine.createSpyObj<AuthAvailabilityService>('AuthAvailabilityService', [
      'checkOnStartup',
      'isAvailable'
    ]);
    authAvailabilityServiceSpy.checkOnStartup.and.returnValue(of(void 0));
    authAvailabilityServiceSpy.isAvailable.and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthAvailabilityService, useValue: authAvailabilityServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authAvailabilityGuard(createRoute('login'), {} as never));

    expect(isObservable(result)).toBeTrue();
    (result as Observable<boolean | UrlTree>).subscribe((value) => {
      expect(value).toBeTrue();
      expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
      done();
    });
  });

  it('redirects to stop-service when auth server is unavailable', (done) => {
    const expectedTree = {} as UrlTree;
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.returnValue(expectedTree);
    const authAvailabilityServiceSpy = jasmine.createSpyObj<AuthAvailabilityService>('AuthAvailabilityService', [
      'checkOnStartup',
      'isAvailable'
    ]);
    authAvailabilityServiceSpy.checkOnStartup.and.returnValue(of(void 0));
    authAvailabilityServiceSpy.isAvailable.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthAvailabilityService, useValue: authAvailabilityServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authAvailabilityGuard(createRoute('login'), {} as never));

    expect(isObservable(result)).toBeTrue();
    (result as Observable<boolean | UrlTree>).subscribe((value) => {
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/stop-service']);
      expect(value).toBe(expectedTree);
      done();
    });
  });

  it('allows stop-service and 404 paths even when auth server is unavailable', () => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    const authAvailabilityServiceSpy = jasmine.createSpyObj<AuthAvailabilityService>('AuthAvailabilityService', [
      'checkOnStartup',
      'isAvailable'
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthAvailabilityService, useValue: authAvailabilityServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const stopServiceResult = TestBed.runInInjectionContext(() =>
      authAvailabilityGuard(createRoute('stop-service'), {} as never)
    );
    const notFoundResult = TestBed.runInInjectionContext(() =>
      authAvailabilityGuard(createRoute('404'), {} as never)
    );

    expect(stopServiceResult).toBeTrue();
    expect(notFoundResult).toBeTrue();
    expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
    expect(authAvailabilityServiceSpy.checkOnStartup).not.toHaveBeenCalled();
  });
});
