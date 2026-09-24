import { z } from "zod";

export const sendMessageSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().trim().min(1, "Nachricht darf nicht leer sein.").max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const sendBroadcastSchema = z.object({
  body: z.string().trim().min(1, "Nachricht darf nicht leer sein.").max(2000),
});
export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;
