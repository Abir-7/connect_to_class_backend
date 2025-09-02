export const is_time_expired = (expiry_time: string | Date): boolean => {
  const now = new Date();
  const expiry_date =
    typeof expiry_time === "string" ? new Date(expiry_time) : expiry_time;

  // If expiry_date is invalid, consider expired (optional)
  if (isNaN(expiry_date.getTime())) {
    return true;
  }

  return expiry_date <= now;
};
