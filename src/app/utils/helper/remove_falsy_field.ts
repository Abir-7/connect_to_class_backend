/* eslint-disable @typescript-eslint/no-unused-vars */
export const remove_falsy_fields = <T extends Record<string, unknown>>(
  obj: T
): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => Boolean(value))
  ) as Partial<T>;
