export const ACTIVE_SHIPMENT_STATUSES = ['created', 'assigned', 'in_transit'];

export const ACTIVE_SHIPMENT_IN_SQL = ACTIVE_SHIPMENT_STATUSES.map(() => '?').join(', ');
