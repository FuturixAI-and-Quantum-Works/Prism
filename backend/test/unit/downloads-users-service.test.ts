import { describe, expect, it, vi } from "vitest";
import { DownloadsAuthorizationPolicy } from "../../src/modules/downloads/downloads.policy.js";
import { DownloadsService } from "../../src/modules/downloads/downloads.service.js";
import type { UserProfileRow } from "../../src/modules/users/users.dto.js";
import type { UsersRepository } from "../../src/modules/users/users.repository.js";
import {
  serializeUserProfile,
  UsersService,
  type UserAiSettings,
} from "../../src/modules/users/users.service.js";

const profile: UserProfileRow = {
  displayName: "A User",
  country: "GB",
  jurisdiction: null,
  organization: "Prism",
  professionalRole: null,
  role: "viewer",
  onboardingCompleted: true,
  storageLimitBytes: 1000n,
  storageUsedBytes: 100n,
  messageCreditsUsed: 10,
  creditsResetDate: null,
  tier: "Free",
};

function usersRepository(overrides: Partial<UsersRepository> = {}): UsersRepository {
  return {
    ensureProfile: async () => undefined,
    findProfile: async () => profile,
    resetCredits: async () => profile,
    completeOnboarding: async () => undefined,
    updateProfile: async () => undefined,
    deleteAccount: async () => undefined,
    ...overrides,
  };
}

function aiSettings(overrides: Partial<UserAiSettings> = {}): UserAiSettings {
  return {
    listConnections: async () => [],
    createConnection: async () => {
      throw new Error("unused");
    },
    updateConnection: async () => null,
    deleteConnection: async () => false,
    testConnection: async () => "not-found",
    listModels: async () => [],
    getPreferences: async () => ({}),
    setPreference: async () => undefined,
    ...overrides,
  };
}

describe("DownloadsService", () => {
  it("keeps signed public downloads independent from authorization", async () => {
    const policy = new DownloadsAuthorizationPolicy(
      { findOwner: vi.fn() },
      { canReadDocument: vi.fn() },
      { file: vi.fn() },
    );
    const read = vi.fn(async () => new TextEncoder().encode("public").buffer);
    const service = new DownloadsService(policy, {
      verifyDownloadToken: () => null,
      verifyLocalToken: () => ({
        path: "public/path",
        filename: "public.txt",
        disposition: "inline",
      }),
      read,
    });

    await expect(service.getLocal("signed")).resolves.toMatchObject({
      filename: "public.txt",
      disposition: "inline",
    });
    expect(read).toHaveBeenCalledWith("public/path");
  });

  it("returns one opaque result for denied and missing authorized objects", async () => {
    const policy = new DownloadsAuthorizationPolicy(
      { findOwner: async () => null },
      { canReadDocument: vi.fn() },
      { file: vi.fn() },
    );
    const service = new DownloadsService(policy, {
      verifyDownloadToken: () => ({ path: "private/path", filename: "private.pdf" }),
      verifyLocalToken: () => null,
      read: vi.fn(),
    });
    await expect(
      service.getAuthorized("signed", { userId: "user-1", email: "user@example.com" }),
    ).rejects.toMatchObject({ message: "File not found" });
  });
});

describe("UsersService", () => {
  it("repairs missing profiles and preserves the public DTO aliases", async () => {
    const findProfile = vi
      .fn<UsersRepository["findProfile"]>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(profile);
    const ensureProfile = vi.fn();
    const service = new UsersService(usersRepository({ findProfile, ensureProfile }), aiSettings());

    await expect(service.getProfile("user-1")).resolves.toMatchObject({
      organization: "Prism",
      organisation: "Prism",
      storageLimitBytes: "1000",
      creditsRemaining: 999989,
      aiProviderConnections: [],
    });
    expect(ensureProfile).toHaveBeenCalledWith("user-1");
  });

  it("resets expired credits before serializing the profile", async () => {
    const expired = {
      ...profile,
      messageCreditsUsed: 25,
      creditsResetDate: new Date("2026-08-01T00:00:00.000Z"),
    };
    const reset = {
      ...expired,
      messageCreditsUsed: 0,
      creditsResetDate: new Date("2026-10-02T00:00:00.000Z"),
    };
    const resetCredits = vi.fn(async () => reset);
    const service = new UsersService(
      usersRepository({ findProfile: async () => expired, resetCredits }),
      aiSettings(),
      () => new Date("2026-09-02T00:00:00.000Z"),
    );

    const result = await service.getProfile("user-1");
    expect(result.messageCreditsUsed).toBe(0);
    expect(result.creditsRemaining).toBe(999999);
    expect(resetCredits).toHaveBeenCalled();
  });

  it("serializes null and fallback values without changing the contract", () => {
    expect(
      serializeUserProfile({
        ...profile,
        organization: null,
        messageCreditsUsed: null,
        tier: null,
      }),
    ).toMatchObject({
      organization: null,
      organisation: null,
      messageCreditsUsed: 0,
      tier: "Free",
    });
  });
});
