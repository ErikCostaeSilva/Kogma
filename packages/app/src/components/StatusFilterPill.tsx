import React from "react";

export type StatusFilterValue = "all" | "open" | "late" | "done";

type Props = {
  value: StatusFilterValue;
  onChange: (v: StatusFilterValue) => void;
  className?: string;
  ariaLabel?: string;
};

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "open", label: "Em aberto" },
  { value: "late", label: "Atrasado" },
  { value: "done", label: "Finalizado" },
  { value: "all", label: "Todos" },
];

export default function StatusFilterPill({
  value,
  onChange,
  className,
  ariaLabel = "Filtrar por status",
}: Props) {
  return (
    <div className={`pill ${className ?? ""}`}>
      <select
        className="pill-select"
        value={value}
        onChange={(e) => onChange(e.target.value as StatusFilterValue)}
        aria-label={ariaLabel}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* seta igual ao seu snippet */}
      <svg
        width="15"
        height="8"
        viewBox="0 0 15 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path d="M1 0.5L7.39344 6.5L14 0.5" stroke="#314C7D" />
      </svg>
    </div>
  );
}
