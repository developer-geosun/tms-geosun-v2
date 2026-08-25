import {
  isOperationSetAllowed,
  validateRouteOperations,
  ValidationPoint
} from './route-point-operations.utils';

describe('route-point-operations.utils', () => {
  describe('whitelist', () => {
    it('allows valid pairs on non-border', () => {
      expect(isOperationSetAllowed(false, ['IMPORT_CUSTOMS', 'UNLOADING'])).toBe(true);
      expect(isOperationSetAllowed(false, ['LOADING', 'UNLOADING'])).toBe(true);
    });

    it('rejects forbidden pairs on non-border', () => {
      expect(isOperationSetAllowed(false, ['EXPORT_CUSTOMS', 'IMPORT_CUSTOMS'])).toBe(false);
      expect(isOperationSetAllowed(false, ['LOADING', 'IMPORT_CUSTOMS'])).toBe(false);
    });

    it('allows export with cargo operations on non-border', () => {
      expect(isOperationSetAllowed(false, ['LOADING', 'EXPORT_CUSTOMS'])).toBe(true);
      expect(isOperationSetAllowed(false, ['UNLOADING', 'EXPORT_CUSTOMS'])).toBe(true);
      expect(isOperationSetAllowed(false, ['LOADING', 'EXPORT_CUSTOMS', 'UNLOADING'])).toBe(true);
    });

    it('allows customs combos on border, rejects cargo on border', () => {
      expect(isOperationSetAllowed(true, ['EXPORT_CUSTOMS'])).toBe(true);
      expect(isOperationSetAllowed(true, ['IMPORT_CUSTOMS'])).toBe(true);
      expect(isOperationSetAllowed(true, ['EXPORT_CUSTOMS', 'IMPORT_CUSTOMS'])).toBe(true);
      expect(isOperationSetAllowed(true, ['LOADING'])).toBe(false);
      expect(isOperationSetAllowed(true, ['UNLOADING'])).toBe(false);
      expect(isOperationSetAllowed(true, ['LOADING', 'UNLOADING'])).toBe(false);
    });

    it('rejects sets larger than 3', () => {
      expect(
        isOperationSetAllowed(false, ['LOADING', 'EXPORT_CUSTOMS', 'IMPORT_CUSTOMS', 'UNLOADING'])
      ).toBe(false);
    });
  });

  describe('validateRouteOperations', () => {
    it('accepts plain load -> unload route without border', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: [] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      expect(validateRouteOperations(route)).toBeNull();
    });

    it('accepts loading and unloading on same point', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING', 'UNLOADING'] },
        { isBorder: false, operations: [] }
      ];
      expect(validateRouteOperations(route)).toBeNull();
    });

    it('accepts typical UA->EU route with border', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: [] },
        { isBorder: false, operations: ['EXPORT_CUSTOMS'] },
        { isBorder: true, operations: [] },
        { isBorder: false, operations: ['IMPORT_CUSTOMS'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      expect(validateRouteOperations(route)).toBeNull();
    });

    it('rejects import on border even with export', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: true, operations: ['EXPORT_CUSTOMS', 'IMPORT_CUSTOMS'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      const result = validateRouteOperations(route);
      expect(result?.code).toBe('OPERATION_SET_INVALID');
      expect(result?.pointIndex).toBe(1);
    });

    it('rejects more than one export-customs point on border route', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['EXPORT_CUSTOMS'] },
        { isBorder: true, operations: ['EXPORT_CUSTOMS', 'IMPORT_CUSTOMS'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      const result = validateRouteOperations(route);
      expect(result?.code).toBe('EXPORT_TOO_MANY');
      expect(result?.pointIndex).toBe(2);
    });

    it('rejects more than one import-customs point on border route', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: true, operations: ['EXPORT_CUSTOMS', 'IMPORT_CUSTOMS'] },
        { isBorder: false, operations: ['IMPORT_CUSTOMS', 'UNLOADING'] }
      ];
      const result = validateRouteOperations(route);
      expect(result?.code).toBe('IMPORT_TOO_MANY');
      expect(result?.pointIndex).toBe(2);
    });

    it('rejects customs without border', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['EXPORT_CUSTOMS'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      expect(validateRouteOperations(route)?.code).toBe('CUSTOMS_WITHOUT_BORDER');
    });

    it('rejects two borders', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['EXPORT_CUSTOMS'] },
        { isBorder: true, operations: [] },
        { isBorder: true, operations: [] },
        { isBorder: false, operations: ['IMPORT_CUSTOMS', 'UNLOADING'] }
      ];
      expect(validateRouteOperations(route)?.code).toBe('BORDER_TOO_MANY');
    });

    it('rejects missing import after border', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['EXPORT_CUSTOMS'] },
        { isBorder: true, operations: [] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      expect(validateRouteOperations(route)?.code).toBe('MISSING_IMPORT_AFTER_BORDER');
    });

    it('rejects missing export before border', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: true, operations: [] },
        { isBorder: false, operations: ['IMPORT_CUSTOMS'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      expect(validateRouteOperations(route)?.code).toBe('MISSING_EXPORT_BEFORE_BORDER');
    });

    it('rejects export before first loading point', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['EXPORT_CUSTOMS'] },
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: true, operations: [] },
        { isBorder: false, operations: ['IMPORT_CUSTOMS'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      const result = validateRouteOperations(route);
      expect(result?.code).toBe('OPERATION_SET_INVALID');
      expect(result?.pointIndex).toBe(0);
    });

    it('rejects export after border point', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: true, operations: [] },
        { isBorder: false, operations: ['EXPORT_CUSTOMS'] },
        { isBorder: false, operations: ['IMPORT_CUSTOMS', 'UNLOADING'] }
      ];
      const result = validateRouteOperations(route);
      expect(result?.code).toBe('OPERATION_SET_INVALID');
      expect(result?.pointIndex).toBe(2);
    });

    it('rejects loading inside customs transit', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['EXPORT_CUSTOMS'] },
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: true, operations: [] },
        { isBorder: false, operations: ['IMPORT_CUSTOMS', 'UNLOADING'] }
      ];
      const result = validateRouteOperations(route);
      expect(result?.code).toBe('OPERATION_IN_TRANSIT');
      expect(result?.pointIndex).toBe(2);
    });

    it('rejects loading after last unloading without following unloading', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['UNLOADING'] },
        { isBorder: false, operations: ['LOADING'] }
      ];
      const result = validateRouteOperations(route);
      expect(result?.code).toBe('UNLOADING_REQUIRED_AFTER_LAST_LOADING');
      expect(result?.pointIndex).toBe(2);
    });

    it('rejects cargo ops on border', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: true, operations: ['LOADING', 'UNLOADING'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      const result = validateRouteOperations(route);
      expect(result?.code).toBe('OPERATION_SET_INVALID');
      expect(result?.pointIndex).toBe(1);
    });

    it('rejects route without loading', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: [] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      expect(validateRouteOperations(route)?.code).toBe('LOADING_REQUIRED');
    });

    it('rejects route without unloading', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: [] }
      ];
      expect(validateRouteOperations(route)?.code).toBe('UNLOADING_REQUIRED');
    });

    it('allows multiple loading points', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      expect(validateRouteOperations(route)).toBeNull();
    });

    it('allows multiple unloading points', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['LOADING'] },
        { isBorder: false, operations: ['UNLOADING'] },
        { isBorder: false, operations: ['UNLOADING'] }
      ];
      expect(validateRouteOperations(route)).toBeNull();
    });

    it('rejects unloading before loading', () => {
      const route: ValidationPoint[] = [
        { isBorder: false, operations: ['UNLOADING'] },
        { isBorder: false, operations: ['LOADING'] }
      ];
      expect(validateRouteOperations(route)?.code).toBe('UNLOADING_BEFORE_LOADING');
    });
  });
});
