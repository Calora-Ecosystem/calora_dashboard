export const formatMoney = (
  value: number,
  notation: "compact" | "standard" = "compact",
): string => {
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    notation: notation as any,
  }).format(value);
};

export const formatDate = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toLocaleDateString("uz-UZ");
  }
  return new Date(value).toLocaleString("uz-UZ");
};
