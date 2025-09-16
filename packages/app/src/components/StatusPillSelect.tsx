import React from "react";

export type OrderStatus = "open" | "late" | "done";

type Props = {
  value: OrderStatus;
  onChange: (v: OrderStatus) => void;
  className?: string;
  ariaLabel?: string;
};

export default function StatusPillSelect({
  value,
  onChange,
  className,
  ariaLabel = "Alterar status",
}: Props) {
  const bg =
    value === "late" ? "#f6a19b" :
    value === "open" ? "#f2da6e" :
    value === "done" ? "#87d3ab" : "#fff";

  return (
    <select
      className={`status-select ${className ?? ""}`}
      style={{ backgroundColor: bg }}
      value={value}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      aria-label={ariaLabel}
    >
      <option value="open">Em aberto</option>
      <option value="late">Atrasado</option>
      <option value="done">Finalizado</option>
    </select>
  );
}
