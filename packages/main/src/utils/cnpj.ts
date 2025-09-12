// utils/cnpj.ts
/** Mantém só dígitos */
export function normalizeCNPJ(v: string) {
  return (v || "").replace(/\D+/g, "");
}

/** Validação oficial do CNPJ (14 dígitos, dígitos verificadores por peso) */
export function isValidCNPJ(value: string) {
  const c = normalizeCNPJ(value);
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false; // todos iguais

  const base1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const base2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const toInt = (ch: string) => ch.charCodeAt(0) - 48;

  let sum1 = 0;
  for (let i = 0; i < 12; i++) sum1 += toInt(c[i]) * base1[i];
  const dv1 = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11);

  let sum2 = 0;
  for (let i = 0; i < 13; i++) sum2 += toInt(c[i]) * base2[i];
  const dv2 = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11);

  return dv1 === toInt(c[12]) && dv2 === toInt(c[13]);
}
