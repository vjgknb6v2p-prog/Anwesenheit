import type { Role } from "@prisma/client";
import { canSendMessageTo, summarizeConversations } from "@/domain/messaging";
import { db } from "@/lib/db";

export interface ConversationPartner {
  id: string;
  name: string;
  role: Role;
  lastMessageAt: Date;
  unreadCount: number;
  lastMessagePreview: string;
}

/**
 * Konversationsübersicht für die Inbox eines Nutzers — eine Zeile pro
 * Gesprächspartner, neueste zuerst. Ein Rundruf (`broadcastGroupId` gesetzt)
 * erscheint für den Empfänger wie eine normale Konversation mit dem
 * Absender; die Sonderkennzeichnung "Rundruf" übernimmt die UI anhand von
 * `broadcastGroupId` auf der einzelnen Nachricht.
 */
export async function getConversationsForUser(
  userId: string,
): Promise<ConversationPartner[]> {
  const messages = await db.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
      recipient: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });

  const partnerInfo = new Map<
    string,
    { name: string; role: Role; preview: string; at: Date }
  >();

  const summaries = summarizeConversations(
    userId,
    messages.map((message) => {
      const partner =
        message.senderId === userId ? message.recipient : message.sender;
      if (!partnerInfo.has(partner.id)) {
        partnerInfo.set(partner.id, {
          name: `${partner.firstName} ${partner.lastName}`,
          role: partner.role,
          preview: message.body,
          at: message.createdAt,
        });
      }
      return {
        partnerId: partner.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        readAt: message.readAt,
        createdAt: message.createdAt,
      };
    }),
  );

  return summaries.map((summary) => {
    const info = partnerInfo.get(summary.partnerId);
    return {
      id: summary.partnerId,
      name: info?.name ?? "Unbekannt",
      role: info?.role ?? "STUDENT",
      lastMessageAt: summary.lastMessageAt,
      unreadCount: summary.unreadCount,
      lastMessagePreview: info?.preview ?? "",
    };
  });
}

export interface ThreadMessage {
  id: string;
  body: string;
  senderId: string;
  broadcastGroupId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/** Alle Nachrichten zwischen zwei Nutzern, chronologisch aufsteigend. */
export async function getThreadWithUser(
  userId: string,
  partnerId: string,
): Promise<ThreadMessage[]> {
  return db.message.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: partnerId },
        { senderId: partnerId, recipientId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      senderId: true,
      broadcastGroupId: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export interface MessageableUser {
  id: string;
  name: string;
  role: Role;
}

/** Nutzer, denen `senderRole` laut `canSendMessageTo` schreiben darf. */
export async function getMessageableUsers(
  currentUserId: string,
  senderRole: Role,
): Promise<MessageableUser[]> {
  const users = await db.user.findMany({
    where: {
      id: { not: currentUserId },
      active: true,
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
  });

  return users
    .filter((candidate) => canSendMessageTo(senderRole, candidate.role))
    .map((candidate) => ({
      id: candidate.id,
      name: `${candidate.firstName} ${candidate.lastName}`,
      role: candidate.role,
    }));
}

/** Anzahl ungelesener Nachrichten für den Nav-Badge. */
export async function countUnreadMessages(userId: string): Promise<number> {
  return db.message.count({ where: { recipientId: userId, readAt: null } });
}
