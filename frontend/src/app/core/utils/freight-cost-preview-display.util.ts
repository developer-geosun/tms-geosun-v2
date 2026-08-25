import {
  CostPreviewContractResponse,
  FreightCostCalculationContractDto
} from '../api/freight-cost-calculations-contracts.model';

/** Рядок зведеної таблиці витрат (UAH + валюта пропозиції). */
export interface NbuCostTableRow {
  labelKey: string;
  uah: number | null;
  proposal: number | null;
  emphasis?: 'subtotal' | 'total';
}

export interface NbuCostPreviewDisplay {
  calculationDate: string;
  proposalCurrency: string;
  nbuRateDate: string | null;
  proposalRatePerUnit: number | null;
  rows: NbuCostTableRow[];
}

interface FreightCostBreakdownJson {
  fuelCostUah?: number;
  perDiemUah?: number;
  tollsUah?: number;
  directCostUah?: number;
  driverCostUah?: number;
  costBeforeMarginUah?: number;
  marginUah?: number;
  totalUah?: number;
  totalProposalAmount?: number;
  proposalCurrency?: string;
  nbuRates?: {
    rateDate?: string;
    proposalRatePerUnit?: number;
  };
}

export type NbuCostPreviewSource = CostPreviewContractResponse | FreightCostCalculationContractDto;

/** Будує дані для таблиці з відповіді cost-preview або збереженого розрахунку. */
export function buildNbuCostPreviewDisplay(source: NbuCostPreviewSource): NbuCostPreviewDisplay {
  const breakdown = parseBreakdown(source.breakdown);
  const proposalCurrency = (source.proposalCurrency || breakdown.proposalCurrency || 'EUR')
    .trim()
    .toUpperCase();
  const proposalRate = breakdown.nbuRates?.proposalRatePerUnit ?? null;
  const convert = (uah: number | null | undefined): number | null => {
    if (uah == null || proposalRate == null || proposalRate <= 0) {
      return null;
    }
    return roundMoney(uah / proposalRate);
  };

  const fuelUah = num(breakdown.fuelCostUah);
  const perDiemUah = num(breakdown.perDiemUah);
  const tollsUah = num(breakdown.tollsUah);
  const directUah = num(source.directCostUah ?? breakdown.directCostUah);
  const driverUah = num(source.driverCostUah ?? breakdown.driverCostUah);
  const beforeMarginUah = num(source.costBeforeMarginUah ?? breakdown.costBeforeMarginUah);
  const marginUah = num(source.marginUah ?? breakdown.marginUah);
  const totalUah = num(source.totalUah ?? breakdown.totalUah);
  const totalProposal = num(source.totalProposalAmount ?? breakdown.totalProposalAmount);

  const rows: NbuCostTableRow[] = [
    {
      labelKey: 'pages.adminRouteRequests.nbuRowFuel',
      uah: fuelUah,
      proposal: convert(fuelUah)
    },
    {
      labelKey: 'pages.adminRouteRequests.nbuRowPerDiem',
      uah: perDiemUah,
      proposal: convert(perDiemUah)
    },
    {
      labelKey: 'pages.adminRouteRequests.nbuRowTolls',
      uah: tollsUah,
      proposal: convert(tollsUah)
    },
    {
      labelKey: 'pages.adminRouteRequests.nbuRowDirectCost',
      uah: directUah,
      proposal: convert(directUah),
      emphasis: 'subtotal'
    },
    {
      labelKey: 'pages.adminRouteRequests.nbuRowDriverSalary',
      uah: driverUah,
      proposal: convert(driverUah)
    },
    {
      labelKey: 'pages.adminRouteRequests.nbuRowCostBeforeMargin',
      uah: beforeMarginUah,
      proposal: convert(beforeMarginUah),
      emphasis: 'subtotal'
    },
    {
      labelKey: 'pages.adminRouteRequests.nbuRowMargin',
      uah: marginUah,
      proposal: convert(marginUah)
    },
    {
      labelKey: 'pages.adminRouteRequests.nbuRowFreightTotal',
      uah: totalUah,
      proposal: totalProposal ?? convert(totalUah),
      emphasis: 'total'
    }
  ];

  return {
    calculationDate: source.calculationDate,
    proposalCurrency,
    nbuRateDate: breakdown.nbuRates?.rateDate ?? null,
    proposalRatePerUnit: proposalRate,
    rows
  };
}

function parseBreakdown(raw: unknown): FreightCostBreakdownJson {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  return raw as FreightCostBreakdownJson;
}

function num(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
