/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MenuItem {
  name: string;
  price: number;
  category: string;
  description: string;
}

export interface Order {
  orderId: string;
  timestamp: string;
  name: string;
  drink: string;
  sugar: string;
  ice: string;
  quantity: number;
  totalPrice: number;
}

export interface Stats {
  totalCups: number;
  totalIncome: number;
  uniquePeople: number;
  popularDrink: string;
}

export interface AggregatedOrder {
  drinkName: string;
  sugar: string;
  ice: string;
  quantity: number;
  price: number;
}
