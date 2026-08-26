package com.geosun.tms.reference.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.geosun.tms.reference.domain.VehicleDocumentStatus;
import com.geosun.tms.reference.domain.VehicleDocumentType;
import com.geosun.tms.reference.domain.VehicleType;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;

class VehicleDocumentRulesTest {

  @Test
  void requiredTypes_semiTractor_includesWhiteCertAndTachograph() {
    Set<VehicleDocumentType> types =
        VehicleDocumentRules.requiredTypes(VehicleType.SEMI_TRACTOR, true);
    assertThat(types)
        .contains(
            VehicleDocumentType.THIRD_PARTY_LIABILITY,
            VehicleDocumentType.GREEN_CARD,
            VehicleDocumentType.TECHNICAL_INSPECTION,
            VehicleDocumentType.WHITE_CERTIFICATE,
            VehicleDocumentType.TACHOGRAPH_VERIFICATION)
        .doesNotContain(VehicleDocumentType.REFRIGERATOR_VERIFICATION);
  }

  @Test
  void requiredTypes_trailerWithFridge_includesRefrigerator() {
    Set<VehicleDocumentType> types =
        VehicleDocumentRules.requiredTypes(VehicleType.SEMI_TRAILER, true);
    assertThat(types)
        .contains(
            VehicleDocumentType.THIRD_PARTY_LIABILITY,
            VehicleDocumentType.GREEN_CARD,
            VehicleDocumentType.TECHNICAL_INSPECTION,
            VehicleDocumentType.REFRIGERATOR_VERIFICATION)
        .doesNotContain(
            VehicleDocumentType.WHITE_CERTIFICATE, VehicleDocumentType.TACHOGRAPH_VERIFICATION);
  }

  @Test
  void requiredTypes_trailerWithoutFridge_excludesRefrigerator() {
    Set<VehicleDocumentType> types =
        VehicleDocumentRules.requiredTypes(VehicleType.SEMI_TRAILER, false);
    assertThat(types).doesNotContain(VehicleDocumentType.REFRIGERATOR_VERIFICATION);
  }

  @Test
  void statusOf_expiredExpiringValid() {
    LocalDate today = LocalDate.of(2026, 8, 26);
    assertThat(VehicleDocumentRules.statusOf(today.minusDays(1), today))
        .isEqualTo(VehicleDocumentStatus.EXPIRED);
    assertThat(VehicleDocumentRules.statusOf(today.plusDays(10), today))
        .isEqualTo(VehicleDocumentStatus.EXPIRING_SOON);
    assertThat(VehicleDocumentRules.statusOf(today.plusDays(30), today))
        .isEqualTo(VehicleDocumentStatus.EXPIRING_SOON);
    assertThat(VehicleDocumentRules.statusOf(today.plusDays(31), today))
        .isEqualTo(VehicleDocumentStatus.VALID);
    assertThat(VehicleDocumentRules.statusOf(null, today)).isEqualTo(VehicleDocumentStatus.MISSING);
  }
}
