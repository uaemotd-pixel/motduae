export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message?: string;
  createdAt?: string;
  read?: boolean;
  orderId?: string;
};

