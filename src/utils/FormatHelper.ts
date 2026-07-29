export const formatMoney = (
  value: number | null | undefined,
  notation: "compact" | "standard" = "compact",
): string => {
  // Ma'lumot hali yuklanmagan yoki noto'g'ri bo'lsa "son emas" (NaN) o'rniga 0 ko'rsatamiz.
  const safe = Number(value);
  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: "UZS",
    notation: notation as any,
  }).format(Number.isFinite(safe) ? safe : 0);
};

export const formatDate = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toLocaleDateString("uz-UZ");
  }
  return new Date(value).toLocaleString("uz-UZ");
};
