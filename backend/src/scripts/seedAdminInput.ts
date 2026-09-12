type Environment = Record<string, string | undefined>;

export function parseSeedAdminEmail(args: string[], environment: Environment): string {
  const emailFlagIndex = args.indexOf("--email");
  const positionalEmail = args.find((argument) => !argument.startsWith("--"));
  const email = (
    (emailFlagIndex >= 0 ? args[emailFlagIndex + 1] : positionalEmail) ?? environment.ADMIN_EMAIL
  )
    ?.trim()
    .toLowerCase();

  if (!email) {
    throw new Error("Admin email is required. Pass it as the first argument or set ADMIN_EMAIL.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Admin email must be a valid email address.");
  }

  return email;
}
