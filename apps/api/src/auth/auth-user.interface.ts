import { SystemRole } from "../database/entities/role.entity";

export interface AuthUser {
  id: string;
  email: string;
  roles: SystemRole[];
}
