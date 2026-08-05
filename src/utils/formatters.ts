export const formatCurrencyInput = (value: number | string): string => {
  if (value === undefined || value === null || value === "") return "";
  const cleanNumber = String(value).replace(/\D/g, "");
  if (!cleanNumber) return "";
  return Number(cleanNumber).toLocaleString("vi-VN");
};

export const parseCurrencyInput = (formattedValue: string): number => {
  const cleanNumber = formattedValue.replace(/\D/g, "");
  return Number(cleanNumber) || 0;
};

export const formatDateVN = (dateStr: string): string => {
  if (!dateStr) return "";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.split(" ")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const formatDateTimeVN = (dateTimeStr: string): string => {
  if (!dateTimeStr) return "";
  const spaceSplit = dateTimeStr.split(" ");
  const datePart = formatDateVN(spaceSplit[0]);
  const timePart = spaceSplit[1] ? ` ${spaceSplit[1]}` : "";
  return `${datePart}${timePart}`;
};
