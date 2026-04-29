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

export interface AdminUserLoginResponse {
  username: string;
  /**
   * Outlets this user may administer. `undefined` = API did not send a list (show all).
   * Empty array = explicitly no outlets.
   */
  adminOutletIds?: number[] | null;
}
export interface MenuCategoryRow {
  id: number;
  outletId: number | null;
  name: string | null;
}

export interface MenuItemRow {
  id: number;
  outletId: number;
  menuCategoryId: number;
  name: string | null;
  description: string | null;
  price: number | null;
  spiceLevel: number | null;
  categoryName: string | null;
}

/** Matches menu item variation rows from the API (`MenuItemVariation` / similar). */
export interface MenuItemVariation {
  id: number;
  itemId: number;
  variationType?: string | null;
  variationName?: string | null;
  isDefault?: boolean | null;
  price: number;
}

/**
 * Item ↔ add-on link from the API (`MappingId`, `ItemId`, `AddOnId`, `Price`).
 * Optional `addOnName` when the menu endpoint includes joined add-on labels.
 */
export interface MenuItemAddOnMapping {
  mappingId: number;
  itemId: number;
  addOnId: number;
  price: number;
  addOnName?: string | null;
}

/**
 * Item ↔ modifier link from the API (e.g. `MappingId`, `ModifierId`, `Price`, SQL `Name` as label).
 */
export interface MenuItemModifierMapping {
  mappingId: number;
  itemId: number;
  modifierId: number;
  price: number;
  /** From joined `Name` / `ModifierName` / etc. */
  modifierName?: string | null;
}

/**
 * Normalized from `GET /api/Menus/ByOutlet/{outletId}` (`OutletMenuMappingDto` or legacy row).
 * `id` is the global menu item id when the API sends `menuItemId` / `MenuItemId`.
 */
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

/** How the guest wants the order fulfilled (drives which detail field we collect). */
export type OrderServiceType = 'dine_in' | 'room_service' | 'take_away';

/**
 * Maps to `OrderMaster.OrderTypeId`. Align these with your `OrderType` (or equivalent) table.
 */
export const ORDER_SERVICE_ORDER_TYPE_IDS: Record<OrderServiceType, number> = {
  dine_in: 1,
  room_service: 2,
  take_away: 3,
};

/** Data collected when the guest places an order (for API or logging). */
export interface OrderSubmitPayload {
  tableNo: string;
}

/** `POST /api/Orders` response (camelCase JSON). */
export interface OrderMasterDto {
  id: number;
  outletId: number;
  orderTypeId: number;
  userName?: string | null;
  /** Matches `OrderMaster.PhoneNo`. */
  phoneNo?: string | null;
  tableNo?: string | null;
  roomNo?: string | null;
  totalAmount?: number | null;
  gstamount?: number | null;
  finalAmount?: number | null;
  orderStatus?: string | null;
  createdAt?: string | null;
}

/** Body for `POST /api/Orders` (camelCase JSON; aligns with `OrderMasterCreateDto`). */
export interface OrderMasterCreateDto {
  outletId: number;
  orderTypeId: number;
  userName?: string | null;
  phoneNo?: string | null;
  tableNo?: string | null;
  roomNo?: string | null;
  totalAmount?: number | null;
  gstamount?: number | null;
  finalAmount?: number | null;
  orderStatus?: string | null;
}

/** Body for `POST /api/OrderDetails` (camelCase JSON). */
export interface OrderDetailCreateDto {
  orderId: number;
  menuId: number;
  itemName?: string | null;
  quantity: number;
  basePrice?: number | null;
  gstamount?: number | null;
  itemTotal?: number | null;
  totalAmount?: number | null;
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

/** `GET/POST /api/Categories` — exact API fields (camelCase). */
export interface CategoryMaster {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  imageUrl: string | null;
}

export interface CategoryMasterCreateDto {
  outletId: number;
  categoryName: string;
  isActive?: boolean;
}

export interface CategoryMasterUpdateDto {
  categoryName: string;
  isActive: boolean;
}

export type MenuCategory = CategoryMaster;

/** Body for `POST /api/Menus/AssignToOutlet` — link a global menu item to an outlet. */
export interface MenuAssignToOutletPayload {
  menuItemId: number;
  outletId: number;
  categoryId?: number;
}

/** Body for POST/PUT menu item APIs (`id` 0 on create). */
export interface MenuItemWritePayload {
  id: number;
  outletId: number;
  itemName: string;
  description: string;
  basePrice: number;
  categoryId: number;
  categoryName: string;
  gstpercent: number;
  isActive: boolean;
  isVeg: boolean;
  spiceLevel: number;
}
