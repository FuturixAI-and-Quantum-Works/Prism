import { eq } from "drizzle-orm";
import { db, userProfiles, users, type Database } from "../../db/index.js";
import type { OnboardingInput, ProfileUpdate, UserProfileRow } from "./users.dto.js";

const profileSelection = {
  displayName: userProfiles.displayName,
  country: userProfiles.country,
  jurisdiction: userProfiles.jurisdiction,
  organization: userProfiles.organization,
  professionalRole: userProfiles.professionalRole,
  role: userProfiles.role,
  onboardingCompleted: userProfiles.onboardingCompleted,
  storageLimitBytes: userProfiles.storageLimitBytes,
  storageUsedBytes: userProfiles.storageUsedBytes,
  messageCreditsUsed: userProfiles.messageCreditsUsed,
  creditsResetDate: userProfiles.creditsResetDate,
  tier: userProfiles.tier,
};

export interface UsersRepository {
  ensureProfile(userId: string): Promise<void>;
  findProfile(userId: string): Promise<UserProfileRow | null>;
  resetCredits(userId: string, resetDate: Date, updatedAt: Date): Promise<UserProfileRow | null>;
  completeOnboarding(userId: string, input: OnboardingInput, updatedAt: Date): Promise<void>;
  updateProfile(userId: string, update: ProfileUpdate, updatedAt: Date): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
}

export class DrizzleUsersRepository implements UsersRepository {
  constructor(private readonly database: Database = db) {}

  async ensureProfile(userId: string): Promise<void> {
    await this.database
      .insert(userProfiles)
      .values({ userId })
      .onConflictDoNothing({ target: userProfiles.userId });
  }

  async findProfile(userId: string): Promise<UserProfileRow | null> {
    const [profile] = await this.database
      .select(profileSelection)
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return profile ?? null;
  }

  async resetCredits(
    userId: string,
    resetDate: Date,
    updatedAt: Date,
  ): Promise<UserProfileRow | null> {
    const [profile] = await this.database
      .update(userProfiles)
      .set({ messageCreditsUsed: 0, creditsResetDate: resetDate, updatedAt })
      .where(eq(userProfiles.userId, userId))
      .returning(profileSelection);
    return profile ?? null;
  }

  async completeOnboarding(userId: string, input: OnboardingInput, updatedAt: Date): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({ fullName: input.fullName, updatedAt })
        .where(eq(users.id, userId));
      await transaction
        .insert(userProfiles)
        .values({
          userId,
          displayName: input.fullName,
          country: input.country,
          jurisdiction: input.jurisdiction || null,
          organization: input.organization,
          professionalRole: input.professionalRole || null,
          onboardingCompleted: true,
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            displayName: input.fullName,
            country: input.country,
            jurisdiction: input.jurisdiction || null,
            organization: input.organization,
            professionalRole: input.professionalRole || null,
            onboardingCompleted: true,
            updatedAt,
          },
        });
    });
  }

  async updateProfile(userId: string, update: ProfileUpdate, updatedAt: Date): Promise<void> {
    await this.database
      .update(userProfiles)
      .set({ ...update, updatedAt })
      .where(eq(userProfiles.userId, userId));
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.database.delete(users).where(eq(users.id, userId));
  }
}
