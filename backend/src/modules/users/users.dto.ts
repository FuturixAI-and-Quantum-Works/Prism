import type {
  AiModelTargetDto,
  CreateProviderConnectionInput,
  ProviderConnectionDto,
  UpdateProviderConnectionInput,
} from "../../lib/aiRegistry.js";
import type { AiTarget, AiTask } from "../../lib/llm/types.js";

export type UserProfileRow = Readonly<{
  displayName: string | null;
  country: string | null;
  jurisdiction: string | null;
  organization: string | null;
  professionalRole: string | null;
  role: string;
  onboardingCompleted: boolean;
  storageLimitBytes: bigint;
  storageUsedBytes: bigint;
  messageCreditsUsed: number | null;
  creditsResetDate: Date | null;
  tier: string | null;
}>;

export type UserProfileDto = Readonly<{
  displayName: string | null;
  country: string | null;
  jurisdiction: string | null;
  organization: string | null;
  organisation: string | null;
  professionalRole: string | null;
  role: string;
  onboardingCompleted: boolean;
  storageLimitBytes: string;
  storageUsedBytes: string;
  messageCreditsUsed: number;
  creditsResetDate: string | null;
  creditsRemaining: number;
  tier: string;
}>;

export type OnboardingInput = Readonly<{
  fullName: string;
  country: string;
  jurisdiction?: string | null;
  organization: string;
  professionalRole?: string | null;
}>;

export type ProfileUpdate = Readonly<{
  displayName?: string | null;
  organization?: string | null;
}>;

export type {
  AiModelTargetDto,
  AiTarget,
  AiTask,
  CreateProviderConnectionInput,
  ProviderConnectionDto,
  UpdateProviderConnectionInput,
};
