
import {
  formatReceiptLineName,
  getCartLineUnitPreTaxTotal,
} from './menuVariations';
import type {
  CartLine,
  GuestOrderReceipt,
  OrderSubmitPayload,
  OrderDetailRowDto,
} from '../types/types';

function lineTotalsForCartLine(line: CartLine): {
  baseUnit: number;
  preTaxLine: number;
  gstLine: number;
  lineTotal: number;
} {
  const base = getCartLineUnitPreTaxTotal(
    line.item,
    line.variationId ?? null,
    line.selectedAddOnMappingIds ?? [],
    line.selectedModifierMappingIds ?? [],
  );
  const gstPct = Number((line.item as any).gstpercent) || 0;
  const qty = line.qty;
  const preTax = base * qty;
  const gstLine = preTax * (gstPct / 100);
  const lineTotal = preTax + gstLine;
  return { baseUnit: base, preTaxLine: preTax, gstLine, lineTotal };
}

function guestReceiptTotalsFromLines(lines: CartLine[]): {
  receiptLines: GuestOrderReceipt['lines'];
  totalPreTax: number;
  totalGst: number;
  finalAmount: number;
} {
  let totalPreTax = 0;
  let totalGst = 0;
  let finalAmount = 0;
  const receiptLines: GuestOrderReceipt['lines'] = [];
  for (const line of lines) {
    const { preTaxLine, gstLine, lineTotal } = lineTotalsForCartLine(line);
    totalPreTax += preTaxLine;
    totalGst += gstLine;
    finalAmount += lineTotal;
    receiptLines.push({
      itemName: formatReceiptLineName(
        line.item,
        line.variationId ?? null,
        line.selectedAddOnMappingIds ?? [],
        line.selectedModifierMappingIds ?? [],
      ),
      qty: line.qty,
      lineTotal,
    });
  }
  return { receiptLines, totalPreTax, totalGst, finalAmount };
}

export function buildGuestOrderPreview(
  outletName: string,
  lines: CartLine[],
  payload: OrderSubmitPayload,
): GuestOrderReceipt {
  if (lines.length === 0) {
    throw new Error('Cart is empty.');
  }
  const { receiptLines, totalPreTax, totalGst, finalAmount } =
    guestReceiptTotalsFromLines(lines);
  return {
    orderId: null,
    outletName,
    finalAmount,
    totalAmount: totalPreTax,
    gstAmount: totalGst,
    payload,
    lines: receiptLines,
  };
}

export async function placeGuestOrder(
  outletId: number,
  outletName: string,
  lines: CartLine[],
  payload: OrderSubmitPayload,
): Promise<GuestOrderReceipt> {
  if (lines.length === 0) {
    throw new Error('Cart is empty.');
  }
  const { receiptLines, totalPreTax, totalGst, finalAmount } =
    guestReceiptTotalsFromLines(lines);
  return {
    orderId: Math.floor(Math.random() * 10000) + 1000,
    outletName,
    finalAmount,
    totalAmount: totalPreTax,
    gstAmount: totalGst,
    payload,
    lines: receiptLines,
  };
}

