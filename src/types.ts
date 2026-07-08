/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string; // e.g., "admin", "casa101", "casa204"
  house: string; // e.g., "Casa 101" or "Admin"
  role: 'resident' | 'admin' | 'vigilante';
  email: string;
  isActive?: boolean;
  isTemporaryPassword?: boolean;
}

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  house: string;
  userEmail: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationHours: number;
  guestsCount: number;
  proofFileName: string;
  proofFileUrl: string; // base64 data-URL or relative URL
  status: ReservationStatus;
  createdAt: string;
  rejectionReason?: string;
}

export type VisitorPassStatus = 'active' | 'used' | 'expired';

export interface VisitorAccessLog {
  timestamp: string;
  action: 'approved' | 'rejected';
  guardId: string;
  guardName: string;
  notes?: string;
}

export interface VisitorPass {
  id: string;
  userId: string;
  userName: string;
  house: string;
  firstName: string;
  lastName: string;
  entryDate: string; // YYYY-MM-DD
  maxEntries: number; // e.g. 1 or many
  entriesUsed: number;
  peopleCount: number;
  passCode: string; // e.g. KK-XXXXXX
  status: VisitorPassStatus;
  createdAt: string;
  logs: VisitorAccessLog[];
}

export interface EmailNotification {
  id: string;
  reservationId: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  sentAt: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface VigilancePayment {
  id: string;
  userId: string;
  userName: string;
  house: string;
  userEmail: string;
  months: string[]; // e.g. ["Enero 2026", "Febrero 2026"]
  amount: number;
  correlative: string; // REC-2026-XXXX
  passCode: string; // Unique receipt code
  transactionReference: string;
  proofFileName: string;
  proofFileUrl: string; // Base64 data-URL or file representation
  status: PaymentStatus;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface HousePaymentStatus {
  house: string;
  status: 'al_dia' | 'mora';
  pendingMonthsCount: number;
  pendingMonths: string[];
  paidMonths: string[];
}
