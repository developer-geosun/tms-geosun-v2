import { Routes } from '@angular/router';
import { serviceStopGuard } from './core/guards/service-stop.guard';
import { authGuard } from './core/guards/auth.guard';
import { authAvailabilityGuard } from './core/guards/auth-availability.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [authAvailabilityGuard, guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [authAvailabilityGuard, guestGuard],
    loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'verify-email',
    canActivate: [authAvailabilityGuard, guestGuard],
    loadComponent: () =>
      import('./pages/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent)
  },
  {
    path: 'forgot-password',
    canActivate: [authAvailabilityGuard, guestGuard],
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    canActivate: [authAvailabilityGuard, guestGuard],
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: 'main',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager', 'driver', 'user'] },
    loadComponent: () => import('./pages/main/main.component').then((m) => m.MainComponent)
  },
  {
    path: 'stop-service',
    loadComponent: () => import('./pages/stop-service/stop-service.component').then((m) => m.StopServiceComponent)
  },
  {
    path: 'route-builder',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['user'] },
    loadComponent: () => import('./pages/route-builder/route-builder.component').then((m) => m.RouteBuilderComponent)
  },
  {
    path: 'routes',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['user'] },
    loadComponent: () => import('./pages/routes/routes.component').then((m) => m.RoutesComponent)
  },
  {
    path: 'my-freight-requests',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['user'] },
    loadComponent: () =>
      import('./pages/my-freight-requests/my-freight-requests.component').then((m) => m.MyFreightRequestsComponent)
  },
  {
    path: 'admin/route-requests',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-route-requests/admin-route-requests.component').then(
        (m) => m.AdminRouteRequestsComponent
      )
  },
  {
    path: 'admin/currencies',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-currencies/admin-currencies.component').then((m) => m.AdminCurrenciesComponent)
  },
  {
    path: 'admin/country-reference',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-country-reference/admin-country-reference.component').then(
        (m) => m.AdminCountryReferenceComponent
      )
  },
  {
    path: 'admin/freight-numeric-scenarios',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-freight-numeric-scenarios/admin-freight-numeric-scenarios.component').then(
        (m) => m.AdminFreightNumericScenariosComponent
      )
  },
  {
    path: 'admin/toll-tariff-sets',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-toll-tariff-sets/admin-toll-tariff-sets.component').then(
        (m) => m.AdminTollTariffSetsComponent
      )
  },
  {
    path: 'admin/users',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./pages/admin-users/admin-users.component').then((m) => m.AdminUsersComponent)
  },
  {
    path: 'admin/document-types',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./pages/admin-document-types/admin-document-types.component').then(
        (m) => m.AdminDocumentTypesComponent
      )
  },
  {
    path: 'admin/file-storage-test',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./pages/admin-file-storage-test/admin-file-storage-test.component').then(
        (m) => m.AdminFileStorageTestComponent
      )
  },
  {
    path: 'admin/vehicles',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-vehicles/admin-vehicles.component').then(
        (m) => m.AdminVehiclesComponent
      )
  },
  {
    path: 'admin/drivers',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-drivers/admin-drivers.component').then((m) => m.AdminDriversComponent)
  },
  {
    path: 'admin/vehicle-combinations',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-vehicle-combinations/admin-vehicle-combinations.component').then(
        (m) => m.AdminVehicleCombinationsComponent
      )
  },
  {
    path: 'admin/trips',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-trips/admin-trips.component').then((m) => m.AdminTripsComponent)
  },
  {
    path: 'admin/trips/new',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-trips/admin-trip-detail.component').then(
        (m) => m.AdminTripDetailComponent
      )
  },
  {
    path: 'admin/trips/:id',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager'] },
    loadComponent: () =>
      import('./pages/admin-trips/admin-trip-detail.component').then(
        (m) => m.AdminTripDetailComponent
      )
  },
  {
    path: 'my-trips',
    canActivate: [authAvailabilityGuard, serviceStopGuard, authGuard],
    data: { roles: ['admin', 'manager', 'driver'] },
    loadComponent: () => import('./pages/my-trips/my-trips.component').then((m) => m.MyTripsComponent)
  },
  {
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent)
  },
  { path: '**', redirectTo: '/404' }
];
