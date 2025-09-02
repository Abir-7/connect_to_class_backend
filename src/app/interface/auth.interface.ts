/* eslint-disable @typescript-eslint/no-unused-vars */
export interface IAuthData {
  user_email: string;
  user_id: string;
  user_role: TUserRole;
}

export const user_roles = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export const user_role = Object.values(user_roles);

export type TUserRole = keyof typeof user_roles;
