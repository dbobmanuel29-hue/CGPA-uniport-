import { createService } from './adapter.js';
export const paymentService = createService('payment', ['initializePayment', 'getTransactions', 'getSubscription']);