/**
 * EduChamp — Email Provider Abstraction Layer
 * Core types shared across all provider implementations.
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;       // plain-text fallback
  replyTo?: string;
  tags?: Record<string, string>; // for tracking (e.g. { template: 'consent_request' })
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  send(payload: EmailPayload, fromAddress: string, fromName: string): Promise<EmailResult>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}
