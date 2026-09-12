export function formatMoney(amountCents: number): string {
  return (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatDateTime(value: Date): string {
  return value.toISOString().replace("T", " ").slice(0, 16);
}
