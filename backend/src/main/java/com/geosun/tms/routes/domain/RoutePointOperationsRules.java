package com.geosun.tms.routes.domain;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Правила валідації операцій точок маршруту.
 *
 * <p>Перевіряє:
 *
 * <ul>
 *   <li>per-point whitelist (різний для BORDER vs не-BORDER);
 *   <li>глобальні правила про BORDER (рівно 0 або 1 BORDER на маршрут, пов'язана з наявністю
 *       митних операцій);
 *   <li>фазову FSM {@code LOAD_PHASE -> CUSTOMS_TRANSIT -> UNLOAD_ONLY}.
 * </ul>
 */
public final class RoutePointOperationsRules {

  /** Максимальна кількість операцій на одній точці. */
  public static final int MAX_OPS_PER_POINT = 3;

  /** Максимальна кількість BORDER-точок на маршрут. */
  public static final int MAX_BORDER_POINTS_PER_ROUTE = 1;

  /** Whitelist допустимих наборів операцій на не-BORDER точці (START/STOP/FINISH). */
  private static final Set<Set<RoutePointOperation>> ALLOWED_NON_BORDER =
      Set.of(
          EnumSet.noneOf(RoutePointOperation.class),
          EnumSet.of(RoutePointOperation.LOADING),
          EnumSet.of(RoutePointOperation.EXPORT_CUSTOMS),
          EnumSet.of(RoutePointOperation.IMPORT_CUSTOMS),
          EnumSet.of(RoutePointOperation.UNLOADING),
          EnumSet.of(RoutePointOperation.LOADING, RoutePointOperation.UNLOADING),
          EnumSet.of(RoutePointOperation.LOADING, RoutePointOperation.EXPORT_CUSTOMS),
          EnumSet.of(RoutePointOperation.UNLOADING, RoutePointOperation.EXPORT_CUSTOMS),
          EnumSet.of(RoutePointOperation.IMPORT_CUSTOMS, RoutePointOperation.UNLOADING),
          EnumSet.of(
              RoutePointOperation.LOADING,
              RoutePointOperation.EXPORT_CUSTOMS,
              RoutePointOperation.UNLOADING));

  /** Whitelist допустимих наборів операцій на BORDER-точці (вантажні операції заборонені). */
  private static final Set<Set<RoutePointOperation>> ALLOWED_BORDER =
      Set.of(
          EnumSet.noneOf(RoutePointOperation.class),
          EnumSet.of(RoutePointOperation.EXPORT_CUSTOMS),
          EnumSet.of(RoutePointOperation.IMPORT_CUSTOMS),
          EnumSet.of(RoutePointOperation.EXPORT_CUSTOMS, RoutePointOperation.IMPORT_CUSTOMS));

  private RoutePointOperationsRules() {}

  /** Чи входить набір операцій до whitelist для заданого типу точки. */
  public static boolean isOperationSetAllowed(RoutePointKind kind, Set<RoutePointOperation> ops) {
    Set<RoutePointOperation> normalized =
        ops.isEmpty() ? EnumSet.noneOf(RoutePointOperation.class) : EnumSet.copyOf(ops);
    Set<Set<RoutePointOperation>> whitelist =
        kind == RoutePointKind.BORDER ? ALLOWED_BORDER : ALLOWED_NON_BORDER;
    return whitelist.contains(normalized);
  }

  /**
   * Виконати повну валідацію маршруту. Точки очікуються відсортованими за {@code order}.
   *
   * @return перший знайдений код помилки, або {@code null} якщо все гаразд.
   */
  public static ValidationError validateRoute(List<RoutePointWithOperations> points) {
    if (points == null || points.isEmpty()) {
      return null;
    }

    // 1. Per-point whitelist
    for (int i = 0; i < points.size(); i++) {
      RoutePointWithOperations point = points.get(i);
      Set<RoutePointOperation> ops = point.operations();
      if (ops.size() > MAX_OPS_PER_POINT) {
        return new ValidationError(ValidationErrorCode.OPERATION_SET_INVALID, i);
      }
      if (!isOperationSetAllowed(point.kind(), ops)) {
        return new ValidationError(ValidationErrorCode.OPERATION_SET_INVALID, i);
      }
    }

    // 2. Глобальні правила про BORDER
    int borderCount = 0;
    int borderIndex = -1;
    for (int i = 0; i < points.size(); i++) {
      if (points.get(i).kind() == RoutePointKind.BORDER) {
        borderCount++;
        borderIndex = i;
      }
    }
    if (borderCount > MAX_BORDER_POINTS_PER_ROUTE) {
      return new ValidationError(ValidationErrorCode.BORDER_TOO_MANY, -1);
    }

    // 3. Базові правила маршруту: щонайменше 1 LOADING і щонайменше 1 UNLOADING.
    int firstLoadingIndex = -1;
    int lastLoadingIndex = -1;
    int firstUnloadingIndex = -1;
    int lastUnloadingIndex = -1;
    for (int i = 0; i < points.size(); i++) {
      Set<RoutePointOperation> ops = points.get(i).operations();
      if (ops.contains(RoutePointOperation.LOADING)) {
        if (firstLoadingIndex < 0) {
          firstLoadingIndex = i;
        }
        lastLoadingIndex = i;
      }
      if (ops.contains(RoutePointOperation.UNLOADING)) {
        if (firstUnloadingIndex < 0) {
          firstUnloadingIndex = i;
        }
        lastUnloadingIndex = i;
      }
    }
    if (firstLoadingIndex < 0) {
      return new ValidationError(ValidationErrorCode.LOADING_REQUIRED, 0);
    }
    if (firstUnloadingIndex < 0) {
      return new ValidationError(ValidationErrorCode.UNLOADING_REQUIRED, points.size() - 1);
    }
    if (firstUnloadingIndex < firstLoadingIndex) {
      return new ValidationError(ValidationErrorCode.UNLOADING_BEFORE_LOADING, firstUnloadingIndex);
    }
    if (lastUnloadingIndex < lastLoadingIndex) {
      return new ValidationError(
          ValidationErrorCode.UNLOADING_REQUIRED_AFTER_LAST_LOADING, lastLoadingIndex);
    }

    boolean hasAnyCustoms =
        points.stream()
            .anyMatch(
                point ->
                    point.operations().contains(RoutePointOperation.EXPORT_CUSTOMS)
                        || point.operations().contains(RoutePointOperation.IMPORT_CUSTOMS));

    if (borderCount == 0) {
      if (hasAnyCustoms) {
        for (int i = 0; i < points.size(); i++) {
          Set<RoutePointOperation> ops = points.get(i).operations();
          if (ops.contains(RoutePointOperation.EXPORT_CUSTOMS)
              || ops.contains(RoutePointOperation.IMPORT_CUSTOMS)) {
            return new ValidationError(ValidationErrorCode.CUSTOMS_WITHOUT_BORDER, i);
          }
        }
      }
    } else {
      // borderCount == 1
      int exportCount = 0;
      int importCount = 0;
      int secondExportIndex = -1;
      int secondImportIndex = -1;
      int exportIndex = -1;
      int importIndex = -1;

      boolean exportBeforeOrAtBorder = false;
      boolean importAfterBorder = false;
      for (int i = 0; i < points.size(); i++) {
        Set<RoutePointOperation> ops = points.get(i).operations();
        if (ops.contains(RoutePointOperation.EXPORT_CUSTOMS)) {
          exportCount++;
          if (exportIndex < 0) {
            exportIndex = i;
          }
          if (exportCount == 2) {
            secondExportIndex = i;
          }
        }
        if (ops.contains(RoutePointOperation.IMPORT_CUSTOMS)) {
          importCount++;
          if (importIndex < 0) {
            importIndex = i;
          }
          if (importCount == 2) {
            secondImportIndex = i;
          }
        }
        if (i <= borderIndex && ops.contains(RoutePointOperation.EXPORT_CUSTOMS)) {
          exportBeforeOrAtBorder = true;
        }
        if (i > borderIndex && ops.contains(RoutePointOperation.IMPORT_CUSTOMS)) {
          importAfterBorder = true;
        }
      }
      if (secondExportIndex >= 0) {
        return new ValidationError(ValidationErrorCode.EXPORT_TOO_MANY, secondExportIndex);
      }
      if (secondImportIndex >= 0) {
        return new ValidationError(ValidationErrorCode.IMPORT_TOO_MANY, secondImportIndex);
      }
      if (exportIndex >= 0 && (exportIndex < firstLoadingIndex || exportIndex > borderIndex)) {
        return new ValidationError(ValidationErrorCode.OPERATION_SET_INVALID, exportIndex);
      }
      if (importIndex >= 0 && importIndex <= borderIndex) {
        return new ValidationError(ValidationErrorCode.OPERATION_SET_INVALID, importIndex);
      }
      if (!exportBeforeOrAtBorder) {
        return new ValidationError(ValidationErrorCode.MISSING_EXPORT_BEFORE_BORDER, borderIndex);
      }
      if (!importAfterBorder) {
        return new ValidationError(ValidationErrorCode.MISSING_IMPORT_AFTER_BORDER, borderIndex);
      }
    }

    // 4. Фазова FSM
    Phase phase = Phase.LOAD_PHASE;
    for (int i = 0; i < points.size(); i++) {
      Set<RoutePointOperation> ops = points.get(i).operations();
      boolean hasLoading = ops.contains(RoutePointOperation.LOADING);
      boolean hasExport = ops.contains(RoutePointOperation.EXPORT_CUSTOMS);
      boolean hasImport = ops.contains(RoutePointOperation.IMPORT_CUSTOMS);
      boolean hasUnloading = ops.contains(RoutePointOperation.UNLOADING);

      switch (phase) {
        case LOAD_PHASE -> {
          if (hasImport && !hasExport) {
            return new ValidationError(ValidationErrorCode.IMPORT_BEFORE_EXPORT, i);
          }
          if (hasExport && !hasImport) {
            phase = Phase.CUSTOMS_TRANSIT;
          }
        }
        case CUSTOMS_TRANSIT -> {
          if (hasLoading || hasExport || (hasUnloading && !hasImport)) {
            return new ValidationError(ValidationErrorCode.OPERATION_IN_TRANSIT, i);
          }
          if (hasImport) {
            phase = Phase.UNLOAD_ONLY;
          }
        }
        case UNLOAD_ONLY -> {
          // Після точки розмитнення дозволяємо лише розвантаження.
          if (hasLoading || hasExport || hasImport) {
            return new ValidationError(ValidationErrorCode.OPERATION_SET_INVALID, i);
          }
        }
      }
    }
    if (phase == Phase.CUSTOMS_TRANSIT) {
      return new ValidationError(ValidationErrorCode.UNCLOSED_CUSTOMS, points.size() - 1);
    }
    return null;
  }

  /** Внутрішнє представлення фази FSM. */
  private enum Phase {
    LOAD_PHASE,
    CUSTOMS_TRANSIT,
    UNLOAD_ONLY
  }

  /** Адаптер для алгоритму валідації — пара (тип точки, набір операцій). */
  public record RoutePointWithOperations(RoutePointKind kind, Set<RoutePointOperation> operations) {
    public RoutePointWithOperations {
      operations = operations == null ? EnumSet.noneOf(RoutePointOperation.class) : operations;
    }
  }

  /** Результат однієї невдалої перевірки. */
  public record ValidationError(ValidationErrorCode code, int pointIndex) {}

  /** Стабільні коди помилок валідації для API. */
  public enum ValidationErrorCode {
    OPERATION_SET_INVALID,
    BORDER_TOO_MANY,
    CUSTOMS_WITHOUT_BORDER,
    LOADING_REQUIRED,
    UNLOADING_REQUIRED,
    UNLOADING_BEFORE_LOADING,
    UNLOADING_REQUIRED_AFTER_LAST_LOADING,
    EXPORT_TOO_MANY,
    IMPORT_TOO_MANY,
    MISSING_EXPORT_BEFORE_BORDER,
    MISSING_IMPORT_AFTER_BORDER,
    IMPORT_BEFORE_EXPORT,
    OPERATION_IN_TRANSIT,
    UNCLOSED_CUSTOMS
  }
}
