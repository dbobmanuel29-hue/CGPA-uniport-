import { createService } from './adapter.js';
export const notificationService = createService('notification', ['getNotifications', 'markAsRead', 'markAllAsRead', 'deleteNotification']);