import React, { PropsWithChildren } from "react";
import "../styles/auth.css";

type Props = PropsWithChildren<{ title: string; subtitle: string }>;

export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-card" role="main" aria-labelledby="title">
        <div className="logo-spacer" />
        <h1 id="title" className="brand">{title}</h1>
        <div className="subtitle">{subtitle}</div>
        {children}
      </div>
    </div>
  );
}
