interface TimeRange {
  start: Date;
  end: Date;
}
export const get_date_range = (
  type: "last_7_days" | "last_month"
): TimeRange => {
  const now = new Date();
  let start: Date;

  if (type === "last_7_days") {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else {
    start = new Date(now);
    start.setMonth(now.getMonth() - 1);
  }

  return { start, end: now };
};
