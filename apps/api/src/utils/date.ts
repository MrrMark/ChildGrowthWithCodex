export function toIsoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }
  return date.toISOString().slice(0, 10);
}

export function monthsBetween(fromIsoDate: string, toIsoDateValue: string): number {
  const from = new Date(fromIsoDate);
  const to = new Date(toIsoDateValue);
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  const days = to.getUTCDate() - from.getUTCDate();
  const total = years * 12 + months + days / 30.4375;
  return Math.max(0, Number(total.toFixed(2)));
}

export function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIsoDate: string, toIsoDateValue: string): number {
  const from = new Date(fromIsoDate);
  const to = new Date(toIsoDateValue);
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}
