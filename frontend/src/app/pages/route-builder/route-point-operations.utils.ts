import { RoutePointOperation, Waypoint } from './route-builder.models';

/**
 * Дзеркало правил валідації операцій точки маршруту з бекенда
 * (com.geosun.tms.routes.domain.RoutePointOperationsRules).
 *
 * Правила:
 *  - не більше 3 операцій на точці;
 *  - whitelist залежить від типу точки (BORDER vs не-BORDER);
 *  - на маршрут допустимо максимум 1 BORDER-точка;
 *  - якщо BORDER відсутній — заборонені будь-які митні операції;
 *  - якщо BORDER присутній — EXPORT має бути на індексі ≤ b, IMPORT на індексі ≥ b;
 *  - фазова FSM LOAD_PHASE -> CUSTOMS_TRANSIT.
 */

export const MAX_OPS_PER_POINT = 3;
export const MAX_BORDER_POINTS_PER_ROUTE = 1;

export type RoutePointOperationsErrorCode =
  | 'OPERATION_SET_INVALID'
  | 'BORDER_TOO_MANY'
  | 'CUSTOMS_WITHOUT_BORDER'
  | 'LOADING_REQUIRED'
  | 'UNLOADING_REQUIRED'
  | 'UNLOADING_BEFORE_LOADING'
  | 'UNLOADING_REQUIRED_AFTER_LAST_LOADING'
  | 'EXPORT_TOO_MANY'
  | 'IMPORT_TOO_MANY'
  | 'MISSING_EXPORT_BEFORE_BORDER'
  | 'MISSING_IMPORT_AFTER_BORDER'
  | 'IMPORT_BEFORE_EXPORT'
  | 'OPERATION_IN_TRANSIT'
  | 'UNCLOSED_CUSTOMS';

export interface RoutePointOperationsError {
  code: RoutePointOperationsErrorCode;
  pointIndex: number;
}

export interface ValidationPoint {
  isBorder: boolean;
  operations: RoutePointOperation[];
}

const ALLOWED_NON_BORDER: readonly (readonly RoutePointOperation[])[] = [
  [],
  ['LOADING'],
  ['EXPORT_CUSTOMS'],
  ['IMPORT_CUSTOMS'],
  ['UNLOADING'],
  ['LOADING', 'EXPORT_CUSTOMS'],
  ['UNLOADING', 'EXPORT_CUSTOMS'],
  ['LOADING', 'UNLOADING'],
  ['IMPORT_CUSTOMS', 'UNLOADING'],
  ['LOADING', 'EXPORT_CUSTOMS', 'UNLOADING']
];

const ALLOWED_BORDER: readonly (readonly RoutePointOperation[])[] = [
  [],
  ['EXPORT_CUSTOMS'],
  ['IMPORT_CUSTOMS'],
  ['EXPORT_CUSTOMS', 'IMPORT_CUSTOMS']
];

function setsEqual(a: readonly RoutePointOperation[], b: readonly RoutePointOperation[]): boolean {
  const uniqueA = Array.from(new Set(a));
  const uniqueB = Array.from(new Set(b));
  if (uniqueA.length !== uniqueB.length) {
    return false;
  }
  const sortedA = [...uniqueA].sort();
  const sortedB = [...uniqueB].sort();
  return sortedA.every((op, idx) => op === sortedB[idx]);
}

export function isOperationSetAllowed(isBorder: boolean, ops: readonly RoutePointOperation[]): boolean {
  const whitelist = isBorder ? ALLOWED_BORDER : ALLOWED_NON_BORDER;
  return whitelist.some((allowed) => setsEqual(allowed, ops));
}

/** Допустимі набори опцій для побудови UI-чекбоксів. */
export function getAllowedOperationsForPoint(isBorder: boolean): RoutePointOperation[] {
  return isBorder
    ? ['EXPORT_CUSTOMS', 'IMPORT_CUSTOMS']
    : ['LOADING', 'EXPORT_CUSTOMS', 'IMPORT_CUSTOMS', 'UNLOADING'];
}

export function validateRouteOperations(points: readonly ValidationPoint[]): RoutePointOperationsError | null {
  if (!points || points.length === 0) {
    return null;
  }

  // 1. Per-point whitelist
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point.operations.length > MAX_OPS_PER_POINT) {
      return { code: 'OPERATION_SET_INVALID', pointIndex: i };
    }
    if (!isOperationSetAllowed(point.isBorder, point.operations)) {
      return { code: 'OPERATION_SET_INVALID', pointIndex: i };
    }
  }

  // 2. Глобальні правила про BORDER
  let borderCount = 0;
  let borderIndex = -1;
  for (let i = 0; i < points.length; i++) {
    if (points[i].isBorder) {
      borderCount++;
      borderIndex = i;
    }
  }

  if (borderCount > MAX_BORDER_POINTS_PER_ROUTE) {
    return { code: 'BORDER_TOO_MANY', pointIndex: -1 };
  }

  // 3. Базові правила маршруту: щонайменше 1 LOADING і щонайменше 1 UNLOADING.
  const loadingIndices: number[] = [];
  const unloadingIndices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const ops = points[i].operations;
    if (ops.includes('LOADING')) {
      loadingIndices.push(i);
    }
    if (ops.includes('UNLOADING')) {
      unloadingIndices.push(i);
    }
  }
  if (loadingIndices.length === 0) {
    return { code: 'LOADING_REQUIRED', pointIndex: 0 };
  }
  if (unloadingIndices.length === 0) {
    return { code: 'UNLOADING_REQUIRED', pointIndex: points.length - 1 };
  }
  if (unloadingIndices[0] < loadingIndices[0]) {
    return { code: 'UNLOADING_BEFORE_LOADING', pointIndex: unloadingIndices[0] };
  }
  const lastLoadingIndex = loadingIndices[loadingIndices.length - 1];
  const lastUnloadingIndex = unloadingIndices[unloadingIndices.length - 1];
  if (lastUnloadingIndex < lastLoadingIndex) {
    return { code: 'UNLOADING_REQUIRED_AFTER_LAST_LOADING', pointIndex: lastLoadingIndex };
  }

  const hasAnyCustoms = points.some(
    (p) => p.operations.includes('EXPORT_CUSTOMS') || p.operations.includes('IMPORT_CUSTOMS')
  );

  if (borderCount === 0) {
    if (hasAnyCustoms) {
      const idx = points.findIndex(
        (p) => p.operations.includes('EXPORT_CUSTOMS') || p.operations.includes('IMPORT_CUSTOMS')
      );
      return { code: 'CUSTOMS_WITHOUT_BORDER', pointIndex: idx };
    }
  } else {
    const exportIndices: number[] = [];
    const importIndices: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const ops = points[i].operations;
      if (ops.includes('EXPORT_CUSTOMS')) {
        exportIndices.push(i);
      }
      if (ops.includes('IMPORT_CUSTOMS')) {
        importIndices.push(i);
      }
    }
    if (exportIndices.length > 1) {
      return { code: 'EXPORT_TOO_MANY', pointIndex: exportIndices[1] };
    }
    if (importIndices.length > 1) {
      return { code: 'IMPORT_TOO_MANY', pointIndex: importIndices[1] };
    }
    const firstLoadingIndex = loadingIndices[0];
    if (exportIndices.length === 1) {
      const exportIndex = exportIndices[0];
      if (exportIndex < firstLoadingIndex || exportIndex > borderIndex) {
        return { code: 'OPERATION_SET_INVALID', pointIndex: exportIndex };
      }
    }
    if (importIndices.length === 1) {
      const importIndex = importIndices[0];
      if (importIndex <= borderIndex) {
        return { code: 'OPERATION_SET_INVALID', pointIndex: importIndex };
      }
    }
    let exportBeforeOrAtBorder = false;
    let importAfterBorder = false;
    for (let i = 0; i < points.length; i++) {
      const ops = points[i].operations;
      if (i <= borderIndex && ops.includes('EXPORT_CUSTOMS')) {
        exportBeforeOrAtBorder = true;
      }
      if (i > borderIndex && ops.includes('IMPORT_CUSTOMS')) {
        importAfterBorder = true;
      }
    }
    if (!exportBeforeOrAtBorder) {
      return { code: 'MISSING_EXPORT_BEFORE_BORDER', pointIndex: borderIndex };
    }
    if (!importAfterBorder) {
      return { code: 'MISSING_IMPORT_AFTER_BORDER', pointIndex: borderIndex };
    }
  }

  // 4. Фазова FSM
  type Phase = 'LOAD_PHASE' | 'CUSTOMS_TRANSIT';
  let phase: Phase = 'LOAD_PHASE';

  for (let i = 0; i < points.length; i++) {
    const ops = points[i].operations;
    const hasLoading = ops.includes('LOADING');
    const hasExport = ops.includes('EXPORT_CUSTOMS');
    const hasImport = ops.includes('IMPORT_CUSTOMS');
    const hasUnloading = ops.includes('UNLOADING');

    switch (phase) {
      case 'LOAD_PHASE':
        if (hasImport && !hasExport) {
          return { code: 'IMPORT_BEFORE_EXPORT', pointIndex: i };
        }
        if (hasExport && !hasImport) {
          phase = 'CUSTOMS_TRANSIT';
        }
        break;
      case 'CUSTOMS_TRANSIT':
        if (hasLoading || hasExport || (hasUnloading && !hasImport)) {
          return { code: 'OPERATION_IN_TRANSIT', pointIndex: i };
        }
        if (hasImport) {
          phase = 'LOAD_PHASE';
        }
        break;
    }
  }

  if (phase === 'CUSTOMS_TRANSIT') {
    return { code: 'UNCLOSED_CUSTOMS', pointIndex: points.length - 1 };
  }
  return null;
}

/** Швидкий хелпер: валідація з масиву Waypoint. */
export function validateWaypointOperations(waypoints: readonly Waypoint[]): RoutePointOperationsError | null {
  return validateRouteOperations(
    waypoints.map((wp) => ({ isBorder: wp.isBorder, operations: wp.operations ?? [] }))
  );
}

/**
 * Чи варто додавати операцію до поточного набору. Перевіряє:
 *  - ліміт 3 операцій;
 *  - whitelist для цього типу точки.
 * Повертає null якщо додавання валідне, інакше — код проблеми.
 */
export function checkSetOperationsForPoint(
  isBorder: boolean,
  ops: readonly RoutePointOperation[]
): RoutePointOperationsErrorCode | null {
  if (ops.length > MAX_OPS_PER_POINT) {
    return 'OPERATION_SET_INVALID';
  }
  if (!isOperationSetAllowed(isBorder, ops)) {
    return 'OPERATION_SET_INVALID';
  }
  return null;
}
