import React, { useEffect, useState } from "react";

export default function Flash() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const m = sessionStorage.getItem("flash");
    if (m) {
      setMsg(m);
      sessionStorage.removeItem("flash");
      const t = setTimeout(() => setMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!msg) return null;

  return (
    <div className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>
      {msg}
    </div>
  );
}
