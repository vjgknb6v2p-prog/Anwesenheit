"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPushAction,
  unsubscribeFromPushAction,
} from "@/actions/push";
import { Button } from "@/components/ui/button";

/** `applicationServerKey` erwartet ein `Uint8Array`, VAPID-Public-Keys sind
 * aber base64url-kodiert — Standard-Konvertierung laut MDN Push-API-Docs. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

/**
 * PROMPT.md Abschnitt 8: Web Push zusätzlich zu In-App-Benachrichtigungen,
 * "kein Fehler, wenn Push nicht verfügbar ist" — nicht unterstützende
 * Browser sehen einen Hinweistext statt eines kaputten Buttons. Auf allen
 * drei Benachrichtigungsseiten nutzbar (Schüler, Mitarbeiter, Admin).
 */
export function PushSubscriptionToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    setSupported(true);
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(subscription !== null))
      .catch(() => {
        // Unkritisch — Toggle startet dann im Zustand "nicht abonniert".
      });
  }, []);

  async function handleEnable() {
    setPending(true);
    setError(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError("Push ist auf diesem Server nicht konfiguriert.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Berechtigung für Benachrichtigungen wurde nicht erteilt.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const result = await subscribeToPushAction(subscription.toJSON());
      if (result.error) {
        setError(result.error);
        return;
      }
      setSubscribed(true);
    } catch {
      setError("Push-Benachrichtigungen konnten nicht aktiviert werden.");
    } finally {
      setPending(false);
    }
  }

  async function handleDisable() {
    setPending(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setError("Push-Benachrichtigungen konnten nicht deaktiviert werden.");
    } finally {
      setPending(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-muted-foreground text-sm">
        Push-Benachrichtigungen werden auf diesem Gerät/Browser nicht
        unterstützt.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border p-4 shadow-sm">
      <p className="text-sm font-medium">Push-Benachrichtigungen</p>
      <p className="text-muted-foreground text-sm">
        {subscribed
          ? "Auf diesem Gerät aktiviert."
          : "Erhalte Erinnerungen und Überfälligkeits-Meldungen auch außerhalb der App."}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={subscribed ? handleDisable : handleEnable}
        className="self-start"
      >
        {pending ? "…" : subscribed ? "Deaktivieren" : "Aktivieren"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
