import type {
  AiModelTargetDto,
  AiTarget,
  AiTask,
  CreateProviderConnectionInput,
  OnboardingInput,
  ProfileUpdate,
  ProviderConnectionDto,
  UpdateProviderConnectionInput,
  UserProfileDto,
  UserProfileRow,
} from "./users.dto.js";
import type { UsersRepository } from "./users.repository.js";

const MONTHLY_CREDIT_LIMIT = 999999;

export type UserAiSettings = Readonly<{
  listConnections: (userId: string) => Promise<readonly ProviderConnectionDto[]>;
  createConnection: (
    userId: string,
    input: CreateProviderConnectionInput,
  ) => Promise<ProviderConnectionDto>;
  updateConnection: (
    userId: string,
    connectionId: string,
    input: UpdateProviderConnectionInput,
  ) => Promise<ProviderConnectionDto | null>;
  deleteConnection: (userId: string, connectionId: string) => Promise<boolean>;
  testConnection: (
    userId: string,
    connectionId: string,
  ) => Promise<"ok" | "not-found" | "no-model">;
  listModels: (userId: string) => Promise<readonly AiModelTargetDto[]>;
  getPreferences: (userId: string) => Promise<Partial<Record<AiTask, AiTarget>>>;
  setPreference: (userId: string, task: AiTask, target: AiTarget) => Promise<void>;
}>;

export function serializeUserProfile(row: UserProfileRow): UserProfileDto {
  const creditsUsed = row.messageCreditsUsed ?? 0;
  return {
    displayName: row.displayName,
    country: row.country,
    jurisdiction: row.jurisdiction,
    organization: row.organization,
    organisation: row.organization,
    professionalRole: row.professionalRole,
    role: row.role,
    onboardingCompleted: row.onboardingCompleted,
    storageLimitBytes: row.storageLimitBytes.toString(),
    storageUsedBytes: row.storageUsedBytes.toString(),
    messageCreditsUsed: creditsUsed,
    creditsResetDate: row.creditsResetDate?.toISOString() ?? null,
    creditsRemaining: Math.max(MONTHLY_CREDIT_LIMIT - creditsUsed, 0),
    tier: row.tier || "Free",
  };
}

export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly ai: UserAiSettings,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async completeOnboarding(userId: string, input: OnboardingInput): Promise<UserProfileDto> {
    await this.repository.completeOnboarding(userId, input, this.now());
    return this.loadProfile(userId);
  }

  async ensureProfile(userId: string): Promise<void> {
    await this.repository.ensureProfile(userId);
  }

  async getProfile(
    userId: string,
  ): Promise<UserProfileDto & { aiProviderConnections: readonly ProviderConnectionDto[] }> {
    const [profile, connections] = await Promise.all([
      this.loadProfile(userId, true),
      this.ai.listConnections(userId),
    ]);
    return { ...profile, aiProviderConnections: connections };
  }

  async updateProfile(
    userId: string,
    update: ProfileUpdate,
  ): Promise<UserProfileDto & { aiProviderConnections: readonly ProviderConnectionDto[] }> {
    await this.repository.ensureProfile(userId);
    await this.repository.updateProfile(userId, update, this.now());
    return this.getProfile(userId);
  }

  listConnections(userId: string): Promise<readonly ProviderConnectionDto[]> {
    return this.ai.listConnections(userId);
  }

  createConnection(
    userId: string,
    input: CreateProviderConnectionInput,
  ): Promise<ProviderConnectionDto> {
    return this.ai.createConnection(userId, input);
  }

  updateConnection(
    userId: string,
    connectionId: string,
    input: UpdateProviderConnectionInput,
  ): Promise<ProviderConnectionDto | null> {
    return this.ai.updateConnection(userId, connectionId, input);
  }

  deleteConnection(userId: string, connectionId: string): Promise<boolean> {
    return this.ai.deleteConnection(userId, connectionId);
  }

  testConnection(userId: string, connectionId: string): Promise<"ok" | "not-found" | "no-model"> {
    return this.ai.testConnection(userId, connectionId);
  }

  listModels(userId: string): Promise<readonly AiModelTargetDto[]> {
    return this.ai.listModels(userId);
  }

  getPreferences(userId: string): Promise<Partial<Record<AiTask, AiTarget>>> {
    return this.ai.getPreferences(userId);
  }

  async setPreference(userId: string, task: AiTask, target: AiTarget) {
    await this.ai.setPreference(userId, task, target);
    return this.ai.getPreferences(userId);
  }

  deleteAccount(userId: string): Promise<void> {
    return this.repository.deleteAccount(userId);
  }

  private async loadProfile(userId: string, repairMissing = false): Promise<UserProfileDto> {
    let profile = await this.repository.findProfile(userId);
    if (!profile && repairMissing) {
      await this.repository.ensureProfile(userId);
      profile = await this.repository.findProfile(userId);
    }
    if (!profile) {
      throw new Error(repairMissing ? "Failed to create profile" : "Profile not found");
    }
    if (profile.creditsResetDate && this.now() > profile.creditsResetDate) {
      const resetDate = this.now();
      resetDate.setDate(resetDate.getDate() + 30);
      profile = (await this.repository.resetCredits(userId, resetDate, this.now())) ?? profile;
    }
    return serializeUserProfile(profile);
  }
}
