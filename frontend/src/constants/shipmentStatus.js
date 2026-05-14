export const SHIPMENT_STATUS_LABEL_UK = {
  created: 'Створено',
  assigned: 'Призначено',
  in_transit: 'В дорозі',
  delivered: 'Доставлено',
};

export function shipmentStatusLabel(code) {
  return SHIPMENT_STATUS_LABEL_UK[code] ?? code;
}

export function shipmentStatusBadgeClass(code) {
  const base =
    'inline-flex max-w-full items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-medium';
  switch (code) {
    case 'created':
      return `${base} bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200`;
    case 'assigned':
      return `${base} bg-yellow-50 text-yellow-900 ring-1 ring-inset ring-yellow-200`;
    case 'in_transit':
      return `${base} bg-orange-50 text-orange-950 ring-1 ring-inset ring-orange-200`;
    case 'delivered':
      return `${base} bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200`;
    default:
      return `${base} bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200`;
  }
}
