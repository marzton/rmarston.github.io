// Shared TypeScript types for goldshore-core.
// Import as: import type { GoldshoreEvent, User } from "@goldshore/types";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export type UserRole = "admin" | "member" | "viewer";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Events (goldshore-events queue payload)
// ---------------------------------------------------------------------------
export type EventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "email.bounce"
  | "email.complaint";

export interface GoldshoreEvent<T = Record<string, unknown>> {
  type: EventType;
  timestamp: string;
  data: T;
}

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------
export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
