import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const createRoute = (roles?: string[]): ActivatedRouteSnapshot =>
    ({ data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot);

  const createState = (url: string): RouterStateSnapshot =>
    ({ url } as unknown as RouterStateSnapshot);

  const sessionReady = {
    whenSessionRestored: () => Promise.resolve()
  };

  it('redirects unauthenticated users to login with returnUrl', async () => {
    const expectedTree = {} as UrlTree;
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.returnValue(expectedTree);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { ...sessionReady, isAuthenticated: () => false, hasAnyRole: () => false }
        },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = await TestBed.runInInjectionContext(() =>
      authGuard(createRoute(), createState('/admin/users'))
    );

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin/users' }
    });
    expect(result).toBe(expectedTree);
  });

  it('redirects to main when role is not allowed', async () => {
    const expectedTree = {} as UrlTree;
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.returnValue(expectedTree);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            ...sessionReady,
            isAuthenticated: () => true,
            hasAnyRole: () => false
          }
        },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = await TestBed.runInInjectionContext(() =>
      authGuard(createRoute(['admin']), createState('/admin/users'))
    );

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/main']);
    expect(result).toBe(expectedTree);
  });

  it('allows access when authenticated and role matches', async () => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            ...sessionReady,
            isAuthenticated: () => true,
            hasAnyRole: () => true
          }
        },
        { provide: Router, useValue: routerSpy }
      ]
    });

    const result = await TestBed.runInInjectionContext(() =>
      authGuard(createRoute(['admin']), createState('/admin/users'))
    );

    expect(result).toBeTrue();
    expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
  });
});
