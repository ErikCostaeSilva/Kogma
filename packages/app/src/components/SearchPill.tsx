import React from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  onSubmit?: () => void; // opcional: dispara ao pressionar Enter
};

export default function SearchPill({
  value,
  onChange,
  placeholder = "Pesquisar",
  className,
  ariaLabel = "Buscar pedidos",
  onSubmit,
}: Props) {
  return (
    <div className={`pill pill-search ${className ?? ""}`} role="search">
      <input
        className="pill-input"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) onSubmit();
        }}
      />

      {/* ícone de busca igual ao seu snippet */}
      <svg
        width="25"
        height="25"
        viewBox="0 0 25 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M18.4704 18.4304L24 24M21.4444 11.2222C21.4444 16.8678 16.8678 21.4444 11.2222 21.4444C5.57664 21.4444 1 16.8678 1 11.2222C1 5.57664 5.57664 1 11.2222 1C16.8678 1 21.4444 5.57664 21.4444 11.2222Z"
          stroke="#314C7D"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
