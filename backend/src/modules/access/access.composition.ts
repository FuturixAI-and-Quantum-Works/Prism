import { AccessAuthority } from "./access.authority.js";
import { DrizzleAccessRepository } from "./access.repository.js";

export const accessAuthority = new AccessAuthority(new DrizzleAccessRepository());
