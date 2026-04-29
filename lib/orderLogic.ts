
import { getMenuTax } from '../hooks/useTax';
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
  let linePrice = Number(line.item.unitPrice) || 0;
  if (line.variationId) {
    const vObj = (line.item as any).variations?.find((x: any) => x.id === line.variationId);
    if (vObj) linePrice = Number(vObj.unitPrice) || 0;
  }
  
  let addonTotal = 0;
  const aids = line.selectedAddOnMappingIds ?? [];
  if (aids.length > 0) {
    const set = new Set(aids);
    const addons = (line.item as any).addOns ?? [];
    for (const a of addons) {
      if (set.has(a.id)) {
        addonTotal += a.isFree ? 0 : (Number(a.addOnPrice) || 0);
      }
    }
  }
  
  let modifierTotal = 0;
  const mids = line.selectedModifierMappingIds ?? [];
  if (mids.length > 0) {
    const mset = new Set(mids);
    const modifiers = (line.item as any).modifiers ?? [];
    for (const m of modifiers) {
      if (mset.has(m.id)) {
        modifierTotal += m.isChargeable ? (Number(m.priceAdjustment) || 0) : 0;
      }
    }
  }

  const base = linePrice + addonTotal + modifierTotal;
  const tax = getMenuTax(line.itemId, Number((line.item as any).gstpercent) || 0);
  const qty = line.qty;

  if (tax.inc) {
    const lineTotal = base * qty;
    const preTax = lineTotal / (1 + tax.pct / 100);
    const gstLine = lineTotal - preTax;
    return { baseUnit: base, preTaxLine: preTax, gstLine, lineTotal };
  } else {
    const preTax = base * qty;
    const gstLine = preTax * (tax.pct / 100);
    const lineTotal = preTax + gstLine;
    return { baseUnit: base, preTaxLine: preTax, gstLine, lineTotal };
  }
}

function formatReceiptLineName(line: CartLine): string {
  const parts: string[] = [line.item.name ?? ''];
  if (line.variationId) {
    const vObj = (line.item as any).variations?.find((x: any) => x.id === line.variationId);
    if (vObj) parts.push(`(${vObj.variantItemName})`);
  }
  const aids = line.selectedAddOnMappingIds ?? [];
  if (aids.length > 0) {
    const set = new Set(aids);
    const addons = (line.item as any).addOns ?? [];
    for (const a of addons) {
      if (set.has(a.id)) {
        parts.push(`+ ${a.addOnMenuName}`);
      }
    }
  }
  const mids = line.selectedModifierMappingIds ?? [];
  if (mids.length > 0) {
    const mset = new Set(mids);
    const modifiers = (line.item as any).modifiers ?? [];
    for (const m of modifiers) {
      if (mset.has(m.id)) {
        parts.push(`+ ${m.name}`);
      }
    }
  }
  return parts.join(' ');
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
      itemName: formatReceiptLineName(line),
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

