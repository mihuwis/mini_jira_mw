export interface AppNotification {
  id: string;
  recipientId: string;
  taskId: string;
  projectId: string;
  title: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  isRead: boolean;
}