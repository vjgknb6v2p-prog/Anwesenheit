import type { Metadata } from "next";
import { MessagesClient } from "@/components/messages-client";
import { requireRole } from "@/lib/authz";
import {
  getConversationsForUser,
  getMessageableUsers,
  getThreadWithUser,
} from "@/lib/messages-queries";

export const metadata: Metadata = {
  title: "Nachrichten – CheckIn",
};

export default async function StaffMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const user = await requireRole("STAFF", "ADMIN");
  const { with: partnerId } = await searchParams;

  const [conversations, messageableUsers, thread] = await Promise.all([
    getConversationsForUser(user.id),
    getMessageableUsers(user.id, user.role),
    partnerId ? getThreadWithUser(user.id, partnerId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nachrichten</h1>
      <MessagesClient
        currentUserId={user.id}
        conversations={conversations}
        messageableUsers={messageableUsers}
        initialThread={thread}
        initialPartnerId={partnerId ?? null}
        canBroadcast
      />
    </div>
  );
}
