import type { MailHealth, MailProvider, MailSendRequest, MailSendResult } from "./types.js";

export class ConsoleMailProvider implements MailProvider {
  async send(_request: MailSendRequest): Promise<MailSendResult> {
    console.info("[mail] suppressed");
    return { status: "suppressed", reason: "Mail delivery is suppressed" };
  }

  async health(): Promise<MailHealth> {
    return { status: "suppressed", provider: "console" };
  }
}
