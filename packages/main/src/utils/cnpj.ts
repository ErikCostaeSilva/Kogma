// packages/main/src/utils/cnpj.ts
export function onlyDigits(s: any): string {
  return String(s ?? "").replace(/\D+/g, "");
}

export function cnpjSanitize(input: any): string | null {
  const d = onlyDigits(input);
  return d.length === 14 ? d : null;
}

// Validação mod 11 padrão do CNPJ
export function cnpjIsValid(cnpjRaw: any): boolean {
  let cnpj = onlyDigits(cnpjRaw);
  if (cnpj.length !== 14) return false;

  // rejeita sequências repetidas
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calc = (base: string): number => {
    const nums = base.split("").map(Number);
    const factors =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = nums.reduce((acc, n, i) => acc + n * factors[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const base12 = cnpj.slice(0, 12);
  const d1 = calc(base12);
  const d2 = calc(base12 + d1);
  return cnpj === base12 + String(d1) + String(d2);
}

export function normalizeCnpjForDb(
  input: any,
  strict = false
): { value: string | null; error?: string } {
  const digits = onlyDigits(input);
  if (!digits) return { value: null }; // vazio
  if (digits.length !== 14) {
    return strict
      ? { value: null, error: "CNPJ deve ter 14 dígitos" }
      : { value: digits.padStart(14, "0") }; // relaxado: tenta normalizar
  }
  if (strict && !cnpjIsValid(digits)) {
    return { value: null, error: "CNPJ inválido" };
  }
  return { value: digits };
}
