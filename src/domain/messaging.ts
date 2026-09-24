import type { Role } from "@prisma/client";

/**
 * Wer darf wem eine Direktnachricht schreiben? Schüler dürfen bewusst
 * *nicht* untereinander schreiben (kein unbeaufsichtigter Peer-Chat über
 * die Verwaltungs-App) — nur an Mitarbeiter/Admin. Mitarbeiter und Admin
 * dürfen an jede Rolle schreiben, auch an sich selbst ist über die Prüfung
 * hinaus einfach nutzlos, aber nicht extra verboten (kein Sicherheitsrisiko).
 */
export function canSendMessageTo(
  senderRole: Role,
  recipientRole: Role,
): boolean {
  if (senderRole === "STUDENT") {
    return recipientRole === "STAFF" || recipientRole === "ADMIN";
  }
  return true;
}

export interface ConversationSummaryInput {
  partnerId: string;
  senderId: string;
  recipientId: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface ConversationSummary {
  partnerId: string;
  lastMessageAt: Date;
  unreadCount: number;
}

/**
 * Fasst eine Liste von Nachrichten (aus Sicht eines Nutzers, `partnerId`
 * bereits auf die jeweils andere Seite der Konversation aufgelöst) zu einer
 * Konversationsübersicht zusammen — eine Zeile pro Gesprächspartner,
 * sortiert nach letzter Aktivität.
 */
export function summarizeConversations(
  currentUserId: string,
  messages: ConversationSummaryInput[],
): ConversationSummary[] {
  const byPartner = new Map<string, ConversationSummary>();

  for (const message of messages) {
    const existing = byPartner.get(message.partnerId);
    const isUnreadForCurrentUser =
      message.recipientId === currentUserId && message.readAt === null;

    if (!existing) {
      byPartner.set(message.partnerId, {
        partnerId: message.partnerId,
        lastMessageAt: message.createdAt,
        unreadCount: isUnreadForCurrentUser ? 1 : 0,
      });
      continue;
    }

    if (message.createdAt > existing.lastMessageAt) {
      existing.lastMessageAt = message.createdAt;
    }
    if (isUnreadForCurrentUser) {
      existing.unreadCount += 1;
    }
  }

  return Array.from(byPartner.values()).sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
  );
}
