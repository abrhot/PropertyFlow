import type { MaintenanceStatus, PaymentStatus } from '@propertyflow/constants';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function maintenanceTone(status: MaintenanceStatus): Tone {
  switch (status) {
    case 'VERIFIED':
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
    case 'ASSIGNED':
    case 'APPROVED':
      return 'info';
    case 'SUBMITTED':
    case 'AWAITING_VERIFICATION':
      return 'warning';
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function paymentTone(status: PaymentStatus): Tone {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'LATE':
    case 'FAILED':
      return 'danger';
    case 'REFUNDED':
      return 'info';
    default:
      return 'neutral';
  }
}
