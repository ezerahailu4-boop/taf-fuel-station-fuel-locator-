import type { FuelStatus } from "@/lib/fuel/enums";

export const NOTIFICATION_TYPES = [
  "FUEL_AVAILABLE",
  "FUEL_UNAVAILABLE",
  "ANNOUNCEMENT",
  "MAINTENANCE",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const DELIVERY_STATUSES = [
  "PENDING",
  "SENT",
  "FAILED",
  "BLOCKED",
  "SKIPPED",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface SubscriptionDTO {
  id: string;
  userId: string;
  stationId: string;
  fuelTypeId: string;
  isActive: boolean;
  createdAt: string;
  station?: {
    id: string;
    name: string;
    branchName: string;
    address: string;
    city: string;
    area: string | null;
  };
  fuelType?: {
    id: string;
    slug: string;
    nameEn: string;
    nameAm: string;
    icon: string;
  };
}

export interface InAppNotificationDTO {
  id: string;
  notificationId: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  stationId: string | null;
  fuelTypeId: string | null;
  stationBranchName?: string | null;
}

export interface PendingDeliveryRow {
  id: string;
  notificationId: string;
  userId: string;
  attempts: number;
  telegramUserId: bigint;
  preferredLocale: string;
  notification: {
    type: NotificationType;
    titleEn: string;
    titleAm: string;
    bodyEn: string;
    bodyAm: string;
    stationId: string | null;
    fuelTypeId: string | null;
  };
}

export interface CreateSubscriptionInput {
  userId: string;
  stationId: string;
  fuelTypeId: string;
}

export interface SubscriptionRepo {
  upsert(input: CreateSubscriptionInput): Promise<SubscriptionDTO>;
  remove(userId: string, idOrPair: string | { stationId: string; fuelTypeId: string }): Promise<boolean>;
  listByUser(userId: string): Promise<SubscriptionDTO[]>;
  findSubscribersForFuel(stationId: string, fuelTypeId: string): Promise<Array<{
    userId: string;
    telegramUserId: bigint;
    preferredLocale: string;
  }>>;
}

export interface EnqueueNotificationInput {
  type: NotificationType;
  titleEn: string;
  titleAm: string;
  bodyEn: string;
  bodyAm: string;
  stationId?: string;
  fuelTypeId?: string;
  createdById?: string;
  recipients: Array<{
    userId: string;
    telegramUserId?: bigint;
    preferredLocale?: string;
  }>;
}

export interface NotificationRepo {
  enqueue(input: EnqueueNotificationInput): Promise<{ notificationId: string; deliveryCount: number }>;
  findRecentAlert(stationId: string, fuelTypeId: string, windowMinutes: number): Promise<boolean>;
  getPendingDeliveries(batchSize: number): Promise<PendingDeliveryRow[]>;
  updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    options?: { error?: string | null; nextAttemptAt?: Date; sentAt?: Date; incrementAttempts?: boolean }
  ): Promise<void>;
  listInAppByUser(userId: string, page?: number, pageSize?: number): Promise<{ items: InAppNotificationDTO[]; total: number; unreadCount: number }>;
  markInAppRead(userId: string, inAppId: string): Promise<boolean>;
  markAllInAppRead(userId: string): Promise<number>;
  countUnreadInApp(userId: string): Promise<number>;
}

// Telegram Bot Webhook Types
export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramLocation {
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  location?: TelegramLocation;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: Array<Array<{ text: string; request_location?: boolean }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}
