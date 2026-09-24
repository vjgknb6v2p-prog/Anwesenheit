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

export default async function StudentMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { with: partnerId } = await searchParams;

  const [conversations, messageableUsers, thread] = await Promise.all([
    getConversationsForUser(user.id),
    getMessageableUsers(user.id, user.role),
    partnerId ? getThreadWithUser(user.id, partnerId) : Promise.resolve([]),
  ]);

  return (
    <main className="flex min-h-screen flex-col gap-4 p-6 pb-28">
      <h1 className="text-xl font-semibold">Nachrichten</h1>
      <MessagesClient
        currentUserId={user.id}
        conversations={conversations}
        messageableUsers={messageableUsers}
        initialThread={thread}
        initialPartnerId={partnerId ?? null}
        canBroadcast={false}
      />
    </main>
  );
}
