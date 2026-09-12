import { getAppConfig } from "../../config.js";
import { accessAuthority } from "../access/access.composition.js";
import { ProjectsAuthorizationPolicy } from "./projects.policy.js";
import { DrizzleProjectsRepository } from "./projects.repository.js";
import { ProjectsService } from "./projects.service.js";

export function createProductionProjectsService(): ProjectsService {
  const repository = new DrizzleProjectsRepository();
  return new ProjectsService(
    repository,
    new ProjectsAuthorizationPolicy(repository, accessAuthority),
    accessAuthority,
    {
      get frontendUrl() {
        return getAppConfig().auth.frontendUrl;
      },
      get expiryDays() {
        return getAppConfig().auth.shareInviteExpiryDays;
      },
    },
  );
}
