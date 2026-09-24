"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  markMessageReadAction,
  sendBroadcastAction,
  sendMessageAction,
} from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  ConversationPartner,
  ThreadMessage,
} from "@/lib/messages-queries";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Schüler",
  STAFF: "Mitarbeiter",
  ADMIN: "Admin",
};

export interface MessageableUser {
  id: string;
  name: string;
  role: string;
}

export function MessagesClient({
  currentUserId,
  conversations,
  messageableUsers,
  initialThread,
  initialPartnerId,
  canBroadcast,
}: {
  currentUserId: string;
  conversations: ConversationPartner[];
  messageableUsers: MessageableUser[];
  initialThread: ThreadMessage[];
  initialPartnerId: string | null;
  canBroadcast: boolean;
}) {
  const router = useRouter();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    initialPartnerId,
  );
  const [composeBody, setComposeBody] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastBody, setBroadcastBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  const selectedPartner = useMemo(
    () => conversations.find((c) => c.id === selectedPartnerId) ?? null,
    [conversations, selectedPartnerId],
  );

  async function openConversation(partnerId: string) {
    setSelectedPartnerId(partnerId);
    setShowNewConversation(false);
    setError(null);
    const unread = initialThread.filter(
      (m) => m.senderId === partnerId && !m.readAt,
    );
    await Promise.all(unread.map((m) => markMessageReadAction(m.id))).catch(
      () => {},
    );
    router.push(`?with=${partnerId}`, { scroll: false });
    router.refresh();
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const recipientId = selectedPartnerId ?? newRecipientId;
    if (!recipientId || composeBody.trim().length === 0) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await sendMessageAction({
      recipientId,
      body: composeBody,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setComposeBody("");
    setShowNewConversation(false);
    setSelectedPartnerId(recipientId);
    router.push(`?with=${recipientId}`, { scroll: false });
    router.refresh();
  }

  async function handleBroadcast(event: React.FormEvent) {
    event.preventDefault();
    if (broadcastBody.trim().length === 0) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setBroadcastResult(null);
    const result = await sendBroadcastAction({ body: broadcastBody });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBroadcastBody("");
    setShowBroadcast(false);
    setBroadcastResult("Rundruf verschickt.");
    router.refresh();
  }

  return (
    <div className="flex min-h-[70vh] flex-col gap-4 md:flex-row">
      <div className="flex flex-col gap-2 md:w-72 md:shrink-0">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setShowNewConversation(true);
              setSelectedPartnerId(null);
              setError(null);
            }}
          >
            Neue Nachricht
          </Button>
          {canBroadcast && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowBroadcast(true);
                setShowNewConversation(false);
                setSelectedPartnerId(null);
              }}
            >
              Rundruf
            </Button>
          )}
        </div>
        {broadcastResult && (
          <p className="text-status-present text-sm">{broadcastResult}</p>
        )}
        {conversations.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Noch keine Nachrichten.
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => openConversation(conversation.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-2xl border p-3 text-left text-sm",
                  selectedPartnerId === conversation.id && "border-primary",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium">{conversation.name}</span>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-status-absent text-status-absent-foreground inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
                      {conversation.unreadCount > 9
                        ? "9+"
                        : conversation.unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {ROLE_LABEL[conversation.role] ?? conversation.role}
                </span>
                <span className="text-muted-foreground line-clamp-1 text-xs">
                  {conversation.lastMessagePreview}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-2xl border p-4">
        {showBroadcast && (
          <form onSubmit={handleBroadcast} className="flex flex-col gap-3">
            <h2 className="font-medium">
              Rundruf an alle aktuell abwesenden Schüler
            </h2>
            <Textarea
              value={broadcastBody}
              onChange={(event) => setBroadcastBody(event.target.value)}
              placeholder="Nachricht an alle aktuell abwesenden Schüler…"
              rows={4}
              required
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Wird gesendet…" : "Rundruf senden"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBroadcast(false)}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        )}

        {showNewConversation && !showBroadcast && (
          <div className="flex flex-col gap-3">
            <h2 className="font-medium">Neue Nachricht</h2>
            <select
              className="border-input h-11 rounded-xl border px-3 text-sm"
              value={newRecipientId}
              onChange={(event) => setNewRecipientId(event.target.value)}
            >
              <option value="">Empfänger auswählen…</option>
              {messageableUsers.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} (
                  {ROLE_LABEL[candidate.role] ?? candidate.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {!showBroadcast &&
          !showNewConversation &&
          !selectedPartner &&
          selectedPartnerId === null && (
            <p className="text-muted-foreground text-sm">
              Wähle links eine Konversation aus oder schreib eine neue
              Nachricht.
            </p>
          )}

        {!showBroadcast && (selectedPartner || selectedPartnerId) && (
          <>
            {selectedPartner && (
              <h2 className="font-medium">{selectedPartner.name}</h2>
            )}
            <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {initialThread
                .filter(
                  (message) =>
                    message.senderId === selectedPartnerId ||
                    (selectedPartnerId !== null &&
                      message.senderId === currentUserId),
                )
                .map((message) => (
                  <li
                    key={message.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl border p-3 text-sm",
                      message.senderId === currentUserId
                        ? "border-primary ml-auto"
                        : "mr-auto",
                    )}
                  >
                    {message.broadcastGroupId && (
                      <p className="text-muted-foreground mb-1 text-xs font-medium">
                        Rundruf
                      </p>
                    )}
                    <p>{message.body}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDateTime(message.createdAt)} Uhr
                    </p>
                  </li>
                ))}
            </ul>
          </>
        )}

        {!showBroadcast && (showNewConversation || selectedPartnerId) && (
          <form onSubmit={handleSend} className="flex flex-col gap-2">
            <Textarea
              value={composeBody}
              onChange={(event) => setComposeBody(event.target.value)}
              placeholder="Nachricht schreiben…"
              rows={3}
              required
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting} className="self-end">
              {submitting ? "Wird gesendet…" : "Senden"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
