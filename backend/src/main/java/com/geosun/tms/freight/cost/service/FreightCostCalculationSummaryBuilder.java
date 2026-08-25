package com.geosun.tms.freight.cost.service;

import com.geosun.tms.freight.cost.domain.DriverSalaryBasis;
import com.geosun.tms.freight.cost.dto.response.FreightCostCalculationSummaryDto;
import com.geosun.tms.freight.cost.dto.response.TollCountryLineDto;
import com.geosun.tms.routes.domain.Route;
import com.geosun.tms.routes.domain.RoutePoint;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class FreightCostCalculationSummaryBuilder {

  /** Формує україномовний текстовий звіт згідно ТЗ §7.1. */
  public String build(FreightCostCalculationSummaryDto data) {
    return build(data, null, null);
  }

  /** Формує звіт з опційним переліком точок маршруту та доїзду. */
  public String build(
      FreightCostCalculationSummaryDto data,
      Route route,
      FreightRouteLengthService.StartPoint startPoint) {
    StringBuilder sb = new StringBuilder();
    sb.append("=== Розрахунок собівартості рейсу ===\n");
    sb.append("Дата розрахунку: ").append(data.calculationDate()).append('\n');
    sb.append("Сценарій: ").append(data.scenarioName()).append('\n');
    sb.append("Валюта пропозиції: ").append(data.proposalCurrency()).append("\n\n");

    sb.append("--- Вхідні дані ---\n");
    sb.append("L_total: ").append(km(data.lTotalKm())).append(" км\n");
    sb.append("L_empty: ").append(km(data.lEmptyKm())).append(" км\n");
    sb.append("L_loaded: ").append(km(data.lLoadedKm())).append(" км\n");
    sb.append("Доїзд до першої точки: ").append(km(data.preRouteEmptyKm())).append(" км\n");
    sb.append("Сезон: ").append(data.seasonUsed()).append('\n');
    if (data.lengthFallbackUsed()) {
      sb.append("Примітка: застосовано fallback 15% порожній / 85% завантажений.\n");
    }
    sb.append('\n');

    appendRoutePoints(sb, route, startPoint, data.preRouteEmptyKm());

    sb.append("--- Курси НБУ (дата знімка ").append(data.nbuRateDate()).append(") ---\n");
    sb.append("EUR/UAH: ").append(money(data.eurRatePerUnit())).append('\n');
    sb.append("USD/UAH: ").append(money(data.usdRatePerUnit())).append('\n');
    sb.append("Кросс-курс до ")
        .append(data.proposalCurrency())
        .append(": UAH ÷ ")
        .append(money(data.proposalRatePerUnit()))
        .append(" = ")
        .append(data.proposalCurrency())
        .append('\n');
    sb.append('\n');

    sb.append("--- Паливо ---\n");
    sb.append("Порожній: ").append(liters(data.fuelLitersEmpty())).append(" л\n");
    sb.append("Завантажений: ").append(liters(data.fuelLitersLoaded())).append(" л\n");
    sb.append("Разом паливо: ").append(money(data.fuelCostUah())).append(" UAH\n\n");

    sb.append("--- Добові ---\n");
    sb.append("Днів: ").append(data.perDiemDays()).append('\n');
    sb.append("Сума: ").append(money(data.perDiemEur())).append(" EUR = ");
    sb.append(money(data.perDiemUah())).append(" UAH\n\n");

    sb.append("--- Дороги ---\n");
    for (TollCountryLineDto line : data.tollLines()) {
      sb.append(line.countryCode()).append(": ");
      sb.append(km(line.distanceKm())).append(" км, ");
      if (line.tollType() != null) {
        sb.append(line.tollType()).append(" ");
        sb.append(money(line.rate()));
        if (line.fixedDays() != null) {
          sb.append(" × ").append(line.fixedDays()).append(" дн.");
        }
      } else if (line.defaultEuFallback()) {
        sb.append("EU fallback 0.10 EUR/км");
      } else {
        sb.append("без тарифу");
      }
      sb.append(" → ").append(money(line.amountEur())).append(" EUR = ");
      sb.append(money(line.amountUah())).append(" UAH\n");
    }
    sb.append("Разом дороги: ").append(money(data.tollsUah())).append(" UAH\n\n");

    sb.append("--- Прямі витрати ---\n");
    sb.append("DirectCost: ").append(money(data.directCostUah())).append(" UAH\n\n");

    sb.append("--- ЗП та маржа ---\n");
    sb.append("База ЗП: ").append(DriverSalaryBasis.PERCENT_OF_FINAL_FREIGHT).append('\n');
    sb.append("ЗП: ").append(percent(data.driverSalaryPercent())).append("% → ");
    sb.append(money(data.driverCostUah())).append(" UAH\n");
    sb.append("S (до маржі): ").append(money(data.costBeforeMarginUah())).append(" UAH\n");
    if (data.marginPercent() != null) {
      sb.append("Маржа: ").append(percent(data.marginPercent())).append("% → ");
    } else {
      sb.append("Маржа (FIXED_PER_TRIP, у валюті пропозиції): ");
    }
    sb.append(money(data.marginUah())).append(" UAH\n");
    sb.append("T (разом UAH): ").append(money(data.totalUah())).append(" UAH\n\n");

    sb.append("--- Пропозиція клієнту ---\n");
    sb.append(money(data.totalProposalAmount()))
        .append(' ')
        .append(data.proposalCurrency())
        .append('\n');
    return sb.toString();
  }

  private static void appendRoutePoints(
      StringBuilder sb,
      Route route,
      FreightRouteLengthService.StartPoint startPoint,
      BigDecimal preRouteEmptyKm) {
    if (route == null || route.getPoints() == null || route.getPoints().isEmpty()) {
      return;
    }
    List<RoutePoint> points =
        route.getPoints().stream()
            .sorted(Comparator.comparing((@NonNull RoutePoint point) -> point.getPointOrder()))
            .toList();
    sb.append("--- Точки маршруту ---\n");
    if (startPoint != null) {
      sb.append("0. Точка 0: ")
          .append(pointLabel(startPoint.address(), startPoint.lat(), startPoint.lng()));
      sb.append(" → ").append(km(preRouteEmptyKm)).append(" км\n");
    }
    for (int i = 0; i < points.size(); i++) {
      RoutePoint point = points.get(i);
      int displayOrder = point.getPointOrder() == null ? i + 1 : point.getPointOrder();
      sb.append(displayOrder)
          .append(". ")
          .append(point.getPointType() == null ? "?" : point.getPointType().name())
          .append(": ")
          .append(
              pointLabel(
                  point.getAddress(),
                  point.getLat() == null ? null : point.getLat().doubleValue(),
                  point.getLng() == null ? null : point.getLng().doubleValue()));
      if (i < points.size() - 1) {
        BigDecimal segmentKm = point.getSegmentDistanceKmToNext();
        if (segmentKm != null && segmentKm.signum() > 0) {
          sb.append(" → ").append(km(segmentKm)).append(" км");
        } else {
          sb.append(" → — км");
        }
      }
      sb.append('\n');
    }
    sb.append('\n');
  }

  private static String pointLabel(String address, Double lat, Double lng) {
    if (StringUtils.hasText(address)) {
      return address.trim();
    }
    if (lat != null && lng != null) {
      return lat + ", " + lng;
    }
    return "без адреси";
  }

  private static String km(java.math.BigDecimal value) {
    return value.setScale(3, RoundingMode.HALF_UP).toPlainString();
  }

  private static String liters(java.math.BigDecimal value) {
    return value.setScale(3, RoundingMode.HALF_UP).toPlainString();
  }

  private static String money(java.math.BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
  }

  private static String percent(java.math.BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
  }
}
