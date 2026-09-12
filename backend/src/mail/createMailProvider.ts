import type { AppConfig } from "../config.js";
import { ConsoleMailProvider } from "./consoleMailProvider.js";
import { ResendMailProvider, createResendTransport } from "./resendMailProvider.js";
import { SmtpMailProvider, createSmtpTransport } from "./smtpMailProvider.js";
import type { MailProvider } from "./types.js";

export function createMailProvider(config: AppConfig["mail"]): MailProvider {
  switch (config.kind) {
    case "console":
      return new ConsoleMailProvider();
    case "resend":
      return new ResendMailProvider(createResendTransport(config.apiKey), config.sendTimeoutMs);
    case "smtp":
      return new SmtpMailProvider(
        createSmtpTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          connectionTimeout: config.sendTimeoutMs,
          greetingTimeout: config.sendTimeoutMs,
          socketTimeout: config.sendTimeoutMs,
          auth:
            config.auth.kind === "credentials"
              ? { user: config.auth.username, pass: config.auth.password }
              : undefined,
        }),
        config.sendTimeoutMs,
      );
  }
}
