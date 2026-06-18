export const QuoteStatus = {
    DRAFT: 'draft',
    SENT: 'sent',
    VIEWED: 'viewed',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected'
} as const;

export type QuoteStatusType = typeof QuoteStatus[keyof typeof QuoteStatus];

export const PaymentStatus = {
    UNPAID: 'unpaid',
    PAID_HALF: 'paid_half',
    PAID_FULL: 'paid_full' // Wait, check what it is used in DB
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];
