import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/SideBar"; // <- nome/caso certo

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
