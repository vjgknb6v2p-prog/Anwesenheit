import { logger } from "@/lib/logger";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * Gibt E-Mails auf der Server-Konsole aus statt sie zu versenden. Erfüllt
 * Abschnitt 8/Phase 1 aus PROMPT.md ("E-Mail-Versand als ConsoleMailer-Adapter
 * mit Interface für späteren SMTP") — eine echte SMTP-Implementierung ist
 * bewusst nicht Teil von Phase 1 und wird bei Bedarf hinter demselben
 * `Mailer`-Interface ergänzt, ohne Aufrufer anpassen zu müssen.
 */
export class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    logger.info(
      { to: message.to, subject: message.subject },
      `ConsoleMailer: ${message.text}`,
    );
  }
}

let mailer: Mailer | undefined;

export function getMailer(): Mailer {
  if (!mailer) {
    mailer = new ConsoleMailer();
  }
  return mailer;
}
