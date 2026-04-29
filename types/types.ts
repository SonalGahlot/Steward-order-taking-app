export interface Outlet {
  id: number;
  name: string;
  firmName: string;
  address: string;
  email: string;
  phone: string;
  website: string | null;
  logoPath: string | null;
  tagLine: string | null;
  topHeader: string | null;
  footer: string | null;
  outletType: number;
  noOfTables: number;
  maxTableCapacity: number;
  isActive: boolean;
  freeze: boolean;
  isTaxable: boolean;
  isRoomService: boolean;
  allowNegativeStock: boolean;
  allowSplitBill: boolean;
  allowVoidWithoutApproval: boolean;
  isEnableAutoSettlement: boolean;
  isEnableTouchInterface: boolean;
  isKotauto: boolean;
  isMaintainKotsystem: boolean;
  kotgroupingEnabled: boolean;
  isOptionalSteward: boolean;
  isPrepaidCardSystem: boolean;
  isPrintWalletBalInInvoice: boolean;
  isShowComboItemInBill: boolean;
  isShowComboItemInKot: boolean;
  isApplicableExtraChargeOnDineIn: boolean;
  isApplicableExtraChargeOnTakeAway: boolean;
  isApplicableExtraChargeOnHomeDelivery: boolean;
  isModifyExtraChargeAmountOnDineIn: boolean;
  isModifyExtraChargeAmountOnTakeAway: boolean;
  isModifyExtraChargeAmountOnHomeDelivery: boolean;
  extraChargePerOnDineIn: number;
  extraChargePerOnTakeAway: number;
  extraChargePerOnHomeDelivery: number;
  extraChargeCaptionOnDineIn: string | null;
  extraChargeCaptionOnTakeAway: string | null;
  extraChargeCaptionOnHomeDelivery: string | null;
  kotno: number;
  kotprefix: string | null;
  kotpostfix: string | null;
  kotseparator: string;
  autoPaymodeId: number | null;
  prepaidPaymodeId: number | null;
  defaultStoreId: number | null;
  foodSessionRequired: boolean;
  createdDate: string; // ISO string
  updatedDate: string | null;
}

/** Payload for `POST /adminUser` (matches API columns). */
export interface AdminUserLoginPayload {
  username: string;
  password: string;
}
export interface TableMaster {
  id: number;
  outletId: number;
  outletName: string;
  sectionId: number;
  sectionName: string;
  tableCode: string;
  tableCaption: string;
  capacity: number;
  shape: number;
  isActive: boolean;
}

export interface MenuTypeMaster {
  id: number;
  name: string;
  isActive: boolean;
}

export interface CategoryMaster {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  imageUrl: string | null;
}

export interface AdminUserLoginResponse {
  username: string;
}

export interface MenuByOutletItem {
  id: number;
  code: string;
  menuCategoryId: number;
  menuTypeId: number;
  name: string;
  description: string;
  unitPrice: number;
  costPrice: number;
  expressPrice: number | null;
  onlinePrice: number | null;
  unitId: number;
  isNonVeg: boolean;
  spicyLevel: number;
  isCombo: boolean;
  isAddOnOnly: boolean;
  isDiscountable: boolean;
  maxDiscount: number | null;
  freeze: boolean;
  displayOrder: number;
  kotgroup: number;
  estimatedServeTime: number;
  barCode: string | null;
  hsncode: string;
  imageUrl: string | null;
  linkAccId: number | null;
  disLinkAccId: number | null;
  tags: string | null;
  allergens: string | null;
  createdBy: number | null;
  createdTime: string | null;
  modifyBy: number | null;
  modifyTime: string | null;
}

export interface OrderSubmitPayload {
  tableNo: string;
}


/** `GET /api/OrderDetails/ByOrder/{orderId}` — line items for receipt (admin). */
export interface OrderDetailRowDto {
  id?: number;
  orderId?: number;
  menuId?: number;
  itemName?: string | null;
  quantity: number;
  basePrice?: number | null;
  gstamount?: number | null;
  itemTotal?: number | null;
  totalAmount?: number | null;
}

/**
 * Order slip shown after checkout or as a preview before the API runs.
 * `orderId` is null on the preview slip; set after the order is created.
 */
export interface GuestOrderReceipt {
  orderId: number | null;
  outletName: string;
  finalAmount: number;
  totalAmount: number;
  gstAmount: number;
  payload: OrderSubmitPayload;
  lines: { itemName: string; qty: number; lineTotal: number }[];
}

/** One row in the guest cart (per outlet), with a menu snapshot for stable labels. */
export interface CartLine {
  outletId: number;
  tableNo?: string | null;
  itemId: number;
  /** Chosen menu variation when `item.variations` is non-empty; otherwise `null`. */
  variationId: number | null;
  /**
   * Selected `MenuItemAddOnMapping.mappingId` values (pre-tax add-on prices summed in totals).
   * Empty when no add-ons; order is ignored — equality uses sorted ids.
   */
  selectedAddOnMappingIds: number[];
  /**
   * Selected `MenuItemModifierMapping.mappingId` values (pre-tax modifier prices summed in totals).
   */
  selectedModifierMappingIds: number[];
  qty: number;
  item: MenuByOutletItem;
}

