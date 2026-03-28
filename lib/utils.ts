// lib/utils.ts

export function eur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function pct(n: number, decimals = 2): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Validation ISIN (checksum Luhn)
export function validateISIN(isin: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return false;
  const digits = isin
    .split("")
    .map((c) => (isNaN(Number(c)) ? c.charCodeAt(0) - 55 : Number(c)))
    .join("");
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

// Couleur par type d'actif
export const TYPE_COLOR: Record<string, string> = {
  etf: "#2563EB",
  stock: "#16A34A",
  crypto: "#D97706",
};

export const TYPE_BG: Record<string, string> = {
  etf: "bg-blue-50 text-blue-700",
  stock: "bg-green-50 text-green-700",
  crypto: "bg-amber-50 text-amber-700",
};
