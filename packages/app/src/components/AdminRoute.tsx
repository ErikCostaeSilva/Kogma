import React from "react";
import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }: { children: React.ReactElement }) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  })();
  if (!user || user.role !== "admin") {
    sessionStorage.setItem("flash", "Acesso restrito a administradores.");
    return <Navigate to="/" replace />;
  }
  return children;
}
