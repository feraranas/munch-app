import { QRSession } from '../services/api';

export type TablePayState = 'none' | 'active' | 'partial' | 'paid';

export function tablePayState(session: Pick<QRSession, 'has_order' | 'paid_item_ids' | 'order'>): TablePayState {
  if (!session.has_order || !session.order) {
    return 'none';
  }
  const items = session.order.items || [];
  if (items.length === 0) {
    return 'active';
  }
  const paid = new Set(session.paid_item_ids || []);
  const paidCount = items.filter((item) => paid.has(item.menuId)).length;
  if (paidCount === 0) {
    // Legacy whole-check charge stored status=paid with no item_ids.
    return session.order.status === 'paid' ? 'paid' : 'active';
  }
  if (paidCount >= items.length) {
    return 'paid';
  }
  return 'partial';
}

export function paidItemCount(session: Pick<QRSession, 'paid_item_ids' | 'order'>): number {
  const paid = new Set(session.paid_item_ids || []);
  return (session.order?.items || []).filter((item) => paid.has(item.menuId)).length;
}

export function remainingTotal(session: Pick<QRSession, 'paid_item_ids' | 'order'>): number {
  const paid = new Set(session.paid_item_ids || []);
  return (session.order?.items || []).reduce((sum, item) => {
    if (paid.has(item.menuId)) {
      return sum;
    }
    const toppings = item.toppings?.reduce((t, topping) => t + topping.price, 0) || 0;
    return sum + (item.price + toppings) * (item.qty || 1);
  }, 0);
}
