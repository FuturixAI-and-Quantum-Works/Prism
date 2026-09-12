import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { MailProviderTimeoutError, withProviderTimeout } from "./providerTimeout.js";
import type {
  MailHealth,
  MailMessage,
  MailProvider,
  MailSendRequest,
  MailSendResult,
} from "./types.js";

export type SmtpTransport = Readonly<{
  send: (message: MailMessage) => Promise<{ messageId?: string }>;
  verify: () => Promise<void>;
  close: () => void | Promise<void>;
}>;

function smtpFailure(error: unknown, timeoutMs: number): MailSendResult {
  if (error instanceof MailProviderTimeoutError) {
    return {
      status: "failed",
      failure: {
        kind: "transient",
        retryMode: "at-least-once",
        code: "timeout",
        message: `Mail provider did not respond within ${timeoutMs}ms`,
      },
    };
  }

  const smtpError = error instanceof Error ? error : new Error(String(error));
  const responseCode =
    "responseCode" in smtpError && typeof smtpError.responseCode === "number"
      ? smtpError.responseCode
      : undefined;
  const code =
    "code" in smtpError && typeof smtpError.code === "string" ? smtpError.code : undefined;
  const permanent = responseCode !== undefined && responseCode >= 500 && responseCode < 600;
  return {
    status: "failed",
    failure: {
      kind: permanent ? "permanent" : "transient",
      retryMode: permanent ? "never" : "at-least-once",
      code: code ?? (responseCode ? String(responseCode) : undefined),
      message: smtpError.message,
    },
  };
}

export function createSmtpTransport(options: SMTPTransport.Options): SmtpTransport {
  const transport = nodemailer.createTransport(options);
  return {
    async send(message) {
      const result = await transport.sendMail({
        ...message,
        to: [...message.to],
        cc: message.cc ? [...message.cc] : undefined,
        bcc: message.bcc ? [...message.bcc] : undefined,
        attachments: message.attachments?.map((attachment) => ({
          ...attachment,
          content:
            attachment.content instanceof Uint8Array
              ? Buffer.from(attachment.content)
              : attachment.content,
        })),
      });
      return { messageId: result.messageId };
    },
    async verify() {
      await transport.verify();
    },
    close() {
      transport.close();
    },
  };
}

export class SmtpMailProvider implements MailProvider {
  constructor(
    private readonly transport: SmtpTransport,
    private readonly timeoutMs: number,
  ) {}

  async send(request: MailSendRequest): Promise<MailSendResult> {
    try {
      const result = await withProviderTimeout(
        this.transport.send(request.message),
        this.timeoutMs,
      );
      return { status: "sent", messageId: result.messageId };
    } catch (error) {
      return smtpFailure(error, this.timeoutMs);
    }
  }

  async health(): Promise<MailHealth> {
    try {
      await withProviderTimeout(this.transport.verify(), this.timeoutMs);
      return { status: "ready", provider: "smtp" };
    } catch (error) {
      const failure = smtpFailure(error, this.timeoutMs);
      return {
        status: "unavailable",
        provider: "smtp",
        error: failure.status === "failed" ? failure.failure.message : "SMTP health check failed",
      };
    }
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}
