import { routes } from './app.routes';
describe('app routes', () => {
  it('redirects default path to login page', () => {
    const defaultRoute = routes.find((route) => route.path === '');

    expect(defaultRoute?.redirectTo).toBe('/login');
    expect(defaultRoute?.pathMatch).toBe('full');
  });

  it('uses lazy loaded components for app pages', () => {
    const loginRoute = routes.find((route) => route.path === 'login');
    const registerRoute = routes.find((route) => route.path === 'register');
    const forgotPasswordRoute = routes.find((route) => route.path === 'forgot-password');
    const resetPasswordRoute = routes.find((route) => route.path === 'reset-password');
    const mainRoute = routes.find((route) => route.path === 'main');
    const stopServiceRoute = routes.find((route) => route.path === 'stop-service');
    const notFoundRoute = routes.find((route) => route.path === '404');

    expect(loginRoute?.loadComponent).toBeDefined();
    expect(registerRoute?.loadComponent).toBeDefined();
    expect(forgotPasswordRoute?.loadComponent).toBeDefined();
    expect(resetPasswordRoute?.loadComponent).toBeDefined();
    expect(mainRoute?.loadComponent).toBeDefined();
    expect(stopServiceRoute?.loadComponent).toBeDefined();
    expect(notFoundRoute?.loadComponent).toBeDefined();
    expect(loginRoute?.component).toBeUndefined();
    expect(registerRoute?.component).toBeUndefined();
    expect(mainRoute?.component).toBeUndefined();
    expect(stopServiceRoute?.component).toBeUndefined();
    expect(notFoundRoute?.component).toBeUndefined();
    expect(mainRoute?.canActivate?.length).toBeGreaterThan(0);
  });
});