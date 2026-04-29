import {
  OrderMasterDto,
  OrderDetailRowDto,
} from '../types/types';


export const MOCK_ORDERS: OrderMasterDto[] = [
  {
    id: 1001,
    outletId: 101,
    orderTypeId: 1,
    userName: 'John Doe',
    phoneNo: '9999999999',
    tableNo: '5',
    totalAmount: 600,
    gstamount: 30,
    finalAmount: 630,
    orderStatus: 'Pending',
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_ORDER_DETAILS: OrderDetailRowDto[] = [
  {
    id: 1,
    orderId: 1001,
    menuId: 1,
    itemName: 'Paneer Tikka (Full)',
    quantity: 1,
    basePrice: 250,
    gstamount: 12.5,
    itemTotal: 250,
    totalAmount: 262.5,
  },
  {
    id: 2,
    orderId: 1001,
    menuId: 2,
    itemName: 'Chicken Biryani',
    quantity: 1,
    basePrice: 350,
    gstamount: 17.5,
    itemTotal: 350,
    totalAmount: 367.5,
  },
];
