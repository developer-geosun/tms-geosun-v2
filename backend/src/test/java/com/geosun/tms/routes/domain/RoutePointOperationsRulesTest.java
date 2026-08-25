package com.geosun.tms.routes.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.geosun.tms.routes.domain.RoutePointOperationsRules.RoutePointWithOperations;
import com.geosun.tms.routes.domain.RoutePointOperationsRules.ValidationError;
import com.geosun.tms.routes.domain.RoutePointOperationsRules.ValidationErrorCode;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/** Юніт-тести правил валідації операцій точок маршруту. */
class RoutePointOperationsRulesTest {

  @Nested
  class Whitelist {

    @Test
    void allowsEmptySetOnAnyPointKind() {
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.START, EnumSet.noneOf(RoutePointOperation.class)))
          .isTrue();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.STOP, EnumSet.noneOf(RoutePointOperation.class)))
          .isTrue();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.BORDER, EnumSet.noneOf(RoutePointOperation.class)))
          .isTrue();
    }

    @Test
    void allowsValidPairsOnNonBorder() {
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.STOP,
                  EnumSet.of(RoutePointOperation.LOADING, RoutePointOperation.UNLOADING)))
          .isTrue();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.STOP,
                  EnumSet.of(RoutePointOperation.LOADING, RoutePointOperation.EXPORT_CUSTOMS)))
          .isTrue();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.FINISH,
                  EnumSet.of(RoutePointOperation.IMPORT_CUSTOMS, RoutePointOperation.UNLOADING)))
          .isTrue();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.STOP,
                  EnumSet.of(RoutePointOperation.UNLOADING, RoutePointOperation.EXPORT_CUSTOMS)))
          .isTrue();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.STOP,
                  EnumSet.of(
                      RoutePointOperation.LOADING,
                      RoutePointOperation.EXPORT_CUSTOMS,
                      RoutePointOperation.UNLOADING)))
          .isTrue();
    }

    @Test
    void rejectsInvalidPairsOnNonBorder() {
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.STOP,
                  EnumSet.of(RoutePointOperation.LOADING, RoutePointOperation.IMPORT_CUSTOMS)))
          .isFalse();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.STOP,
                  EnumSet.of(
                      RoutePointOperation.EXPORT_CUSTOMS, RoutePointOperation.IMPORT_CUSTOMS)))
          .isFalse();
    }

    @Test
    void rejectsSetsLargerThanThree() {
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.STOP,
                  EnumSet.of(
                      RoutePointOperation.LOADING,
                      RoutePointOperation.EXPORT_CUSTOMS,
                      RoutePointOperation.IMPORT_CUSTOMS,
                      RoutePointOperation.UNLOADING)))
          .isFalse();
    }

    @Test
    void rejectsCargoOpsOnBorder() {
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.BORDER, EnumSet.of(RoutePointOperation.LOADING)))
          .isFalse();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.BORDER, EnumSet.of(RoutePointOperation.UNLOADING)))
          .isFalse();
    }

    @Test
    void allowsCustomsCombinationsOnBorder() {
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.BORDER, EnumSet.of(RoutePointOperation.EXPORT_CUSTOMS)))
          .isTrue();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.BORDER, EnumSet.of(RoutePointOperation.IMPORT_CUSTOMS)))
          .isTrue();
      assertThat(
              RoutePointOperationsRules.isOperationSetAllowed(
                  RoutePointKind.BORDER,
                  EnumSet.of(
                      RoutePointOperation.EXPORT_CUSTOMS, RoutePointOperation.IMPORT_CUSTOMS)))
          .isTrue();
    }
  }

  @Nested
  class NoBorderRoutes {

    @Test
    void plainLoadUnloadIsValid() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      assertThat(RoutePointOperationsRules.validateRoute(route)).isNull();
    }

    @Test
    void multipleLoadingsAndUnloadingsValid() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP),
              point(RoutePointKind.STOP, RoutePointOperation.UNLOADING),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      assertThat(RoutePointOperationsRules.validateRoute(route)).isNull();
    }

    @Test
    void middlePointWithLoadingAndUnloadingIsValid() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(
                  RoutePointKind.STOP, RoutePointOperation.LOADING, RoutePointOperation.UNLOADING),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      assertThat(RoutePointOperationsRules.validateRoute(route)).isNull();
    }

    @Test
    void exportCustomsWithoutBorderIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.CUSTOMS_WITHOUT_BORDER);
      assertThat(error.pointIndex()).isEqualTo(1);
    }

    @Test
    void loadingAfterUnloadingWithoutFinalUnloadIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.UNLOADING),
              point(RoutePointKind.FINISH, RoutePointOperation.LOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.UNLOADING_REQUIRED_AFTER_LAST_LOADING);
      assertThat(error.pointIndex()).isEqualTo(2);
    }

    @Test
    void routeWithoutLoadingIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.LOADING_REQUIRED);
    }

    @Test
    void routeWithoutUnloadingIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.FINISH));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.UNLOADING_REQUIRED);
    }
  }

  @Nested
  class WithBorder {

    @Test
    void typicalUaToEuRouteIsValid() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.STOP, RoutePointOperation.IMPORT_CUSTOMS),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      assertThat(RoutePointOperationsRules.validateRoute(route)).isNull();
    }

    @Test
    void loadingAfterImportCustomsIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.STOP, RoutePointOperation.IMPORT_CUSTOMS),
              point(
                  RoutePointKind.FINISH,
                  RoutePointOperation.LOADING,
                  RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.OPERATION_SET_INVALID);
      assertThat(error.pointIndex()).isEqualTo(4);
    }

    @Test
    void secondImportAfterImportCustomsIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.STOP, RoutePointOperation.IMPORT_CUSTOMS),
              point(
                  RoutePointKind.FINISH,
                  RoutePointOperation.IMPORT_CUSTOMS,
                  RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.IMPORT_TOO_MANY);
      assertThat(error.pointIndex()).isEqualTo(4);
    }

    @Test
    void importOnBorderIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              borderWith(RoutePointOperation.EXPORT_CUSTOMS, RoutePointOperation.IMPORT_CUSTOMS),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.OPERATION_SET_INVALID);
      assertThat(error.pointIndex()).isEqualTo(1);
    }

    @Test
    void borderCarryingOnlyExportRequiresLaterImport() {
      List<RoutePointWithOperations> withImport =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              borderWith(RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.STOP),
              point(
                  RoutePointKind.FINISH,
                  RoutePointOperation.IMPORT_CUSTOMS,
                  RoutePointOperation.UNLOADING));
      assertThat(RoutePointOperationsRules.validateRoute(withImport)).isNull();
    }

    @Test
    void loadingDuringTransitIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.STOP, RoutePointOperation.LOADING),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.STOP, RoutePointOperation.IMPORT_CUSTOMS),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.OPERATION_IN_TRANSIT);
      assertThat(error.pointIndex()).isEqualTo(2);
    }

    @Test
    void unloadingDuringTransitIsRejected() {
      // EXPORT перед BORDER, UNLOADING всередині транзиту, IMPORT після BORDER
      // — щоб BORDER-перевірки пройшли і FSM зловила OPERATION_IN_TRANSIT.
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.STOP, RoutePointOperation.UNLOADING),
              point(RoutePointKind.BORDER),
              point(
                  RoutePointKind.FINISH,
                  RoutePointOperation.IMPORT_CUSTOMS,
                  RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.OPERATION_IN_TRANSIT);
      assertThat(error.pointIndex()).isEqualTo(2);
    }

    @Test
    void unclosedCustomsAtEndIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.FINISH));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.UNLOADING_REQUIRED);
    }

    @Test
    void importBeforeBorderIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.IMPORT_CUSTOMS),
              point(RoutePointKind.BORDER, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.OPERATION_SET_INVALID);
    }

    @Test
    void missingExportBeforeBorderIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.STOP, RoutePointOperation.IMPORT_CUSTOMS),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.MISSING_EXPORT_BEFORE_BORDER);
    }

    @Test
    void twoBordersAreRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.STOP, RoutePointOperation.IMPORT_CUSTOMS),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.BORDER_TOO_MANY);
    }

    @Test
    void secondExportIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(
                  RoutePointKind.FINISH,
                  RoutePointOperation.IMPORT_CUSTOMS,
                  RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.EXPORT_TOO_MANY);
      assertThat(error.pointIndex()).isEqualTo(3);
    }

    @Test
    void secondImportIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              point(RoutePointKind.STOP, RoutePointOperation.EXPORT_CUSTOMS),
              point(RoutePointKind.BORDER),
              point(RoutePointKind.STOP, RoutePointOperation.IMPORT_CUSTOMS),
              point(
                  RoutePointKind.FINISH,
                  RoutePointOperation.IMPORT_CUSTOMS,
                  RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.IMPORT_TOO_MANY);
      assertThat(error.pointIndex()).isEqualTo(4);
    }

    @Test
    void cargoOnBorderIsRejected() {
      List<RoutePointWithOperations> route =
          List.of(
              point(RoutePointKind.START, RoutePointOperation.LOADING),
              borderWith(RoutePointOperation.LOADING, RoutePointOperation.UNLOADING),
              point(RoutePointKind.FINISH, RoutePointOperation.UNLOADING));
      ValidationError error = RoutePointOperationsRules.validateRoute(route);
      assertThat(error).isNotNull();
      assertThat(error.code()).isEqualTo(ValidationErrorCode.OPERATION_SET_INVALID);
      assertThat(error.pointIndex()).isEqualTo(1);
    }
  }

  private static RoutePointWithOperations point(RoutePointKind kind, RoutePointOperation... ops) {
    Set<RoutePointOperation> set =
        ops.length == 0 ? EnumSet.noneOf(RoutePointOperation.class) : EnumSet.copyOf(List.of(ops));
    return new RoutePointWithOperations(kind, set);
  }

  private static RoutePointWithOperations borderWith(RoutePointOperation... ops) {
    return point(RoutePointKind.BORDER, ops);
  }
}
