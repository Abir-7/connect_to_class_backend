const get_expiry_time = (minutes: number = 10): Date => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes); // Add 10 minutes to the current time
  return now;
};

export default get_expiry_time;
