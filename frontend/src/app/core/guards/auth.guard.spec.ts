import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const createRoute = (roles?: string[]): ActivatedRouteSnapshot =>
    ({ data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot);

  it('redirects unauthenticated users to login', () => {
    const expectedTree = {} as UrlTree;
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.returnValue(expectedTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authGuard(createRoute(), {} as never));

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(expectedTree);
  });

  it('redirects to main when role is not allowed', () => {
    const expectedTree = {} as UrlTree;
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.returnValue(expectedTree);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            hasAnyRole: () => false
          }
        },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authGuard(createRoute(['admin']), {} as never));

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/main']);
    expect(result).toBe(expectedTree);
  });

  it('allows access when authenticated and role matches', () => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            hasAnyRole: () => true
          }
        },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = TestBed.runInInjectionContext(() => authGuard(createRoute(['admin']), {} as never));

    expect(result).toBeTrue();
    expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
  });
});
