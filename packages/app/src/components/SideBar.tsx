import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const IconPedidos = () => (
  <svg width="19" height="24" viewBox="0 0 19 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.66667 3.83337H3.33333C2.04467 3.83337 1 4.87804 1 6.16671V20.1667C1 21.4554 2.04467 22.5 3.33333 22.5H15C16.2887 22.5 17.3333 21.4554 17.3333 20.1667V6.16671C17.3333 4.87804 16.2887 3.83337 15 3.83337H12.6667" stroke="#EEEEEE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4.69446 13.75L14.0278 13.75" stroke="#EEEEEE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4.69446 9.66663L14.0278 9.66663" stroke="#EEEEEE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4.69446 17.8334L14.0278 17.8334" stroke="#EEEEEE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M5.66663 3.83333C5.66663 2.54467 6.71129 1.5 7.99996 1.5H10.3333C11.622 1.5 12.6666 2.54467 12.6666 3.83333V6.16667H5.66663V3.83333Z" stroke="#EEEEEE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
);
const IconClientes = () => (
  <svg width="21" height="24" viewBox="0 0 21 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.407 12.3548C7.15212 12.3548 4.5135 9.81297 4.5135 6.67742C4.5135 3.54187 7.15212 1 10.407 1C13.6619 1 16.3005 3.54187 16.3005 6.67742C16.3005 9.81297 13.6619 12.3548 10.407 12.3548Z" stroke="#EEEEEE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M20.0406 23V18.1087C20.0406 17.7844 19.7899 17.4733 19.3435 17.244C18.8972 17.0147 18.2918 16.8859 17.6606 16.8859H3.38013C2.7489 16.8859 2.14352 17.0147 1.69717 17.244C1.25081 17.4733 1.00006 17.7844 1.00006 18.1087V23" stroke="#EEEEEE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
);
const IconChecklist = () => (
  <svg width="23" height="24" viewBox="0 0 23 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.84973 3.83333H22L19.6667 12H6.10616M20.8333 16.6667H6.83333L4.5 1.5H1M8 21.3333C8 21.9777 7.47766 22.5 6.83333 22.5C6.18901 22.5 5.66667 21.9777 5.66667 21.3333C5.66667 20.689 6.18901 20.1667 6.83333 20.1667C7.47766 20.1667 8 20.689 8 21.3333ZM20.8333 21.3333C20.8333 21.9777 20.311 22.5 19.6667 22.5C19.0223 22.5 18.5 21.9777 18.5 21.3333C18.5 20.689 19.0223 20.1667 19.6667 20.1667C20.311 20.1667 20.8333 20.689 20.8333 21.3333Z" stroke="#EEEEEE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
);
const IconAdmin = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.9849 6.224C8.32397 6.224 6.20886 8.3391 6.20886 11C6.20886 13.661 8.32397 15.7761 10.9849 15.7761C13.6458 15.7761 15.7609 13.661 15.7609 11C15.7609 8.3391 13.6458 6.224 10.9849 6.224ZM10.9849 14.4115C9.07449 14.4115 7.57345 12.9105 7.57345 11C7.57345 9.08962 9.07449 7.58858 10.9849 7.58858C12.8953 7.58858 14.3964 9.08962 14.3964 11C14.3964 12.9105 12.8953 14.4115 10.9849 14.4115Z" fill="#EEEEEE"/>
    <path d="M21.0146 8.74848L19.1042 8.13442L18.6948 7.11098L19.65 5.33702C19.8547 4.92765 19.7865 4.38181 19.4453 4.04067L17.8078 2.40317C17.4667 2.06202 16.9208 1.99379 16.5115 2.19848L14.7375 3.15369L13.7141 2.74431L13.1 0.833895C12.9635 0.42452 12.5542 0.083374 12.0766 0.083374H9.75677C9.27917 0.083374 8.86979 0.42452 8.80156 0.902124L8.1875 2.81254C7.77813 2.88077 7.43698 3.01723 7.09583 3.22192L5.32188 2.26671C4.9125 2.06202 4.36667 2.13025 4.02552 2.4714L2.38802 4.1089C2.04688 4.45004 1.97865 4.99587 2.18333 5.40525L3.07031 7.11098C2.93385 7.45213 2.7974 7.8615 2.66094 8.20265L0.750521 8.81671C0.341146 8.95317 0 9.36254 0 9.84015V12.1599C0 12.6375 0.341146 13.0469 0.81875 13.1834L2.72917 13.7974L3.13854 14.8209L2.18333 16.5948C1.97865 17.0042 2.04688 17.55 2.38802 17.8912L4.02552 19.5287C4.36667 19.8698 4.9125 19.9381 5.32188 19.7334L7.09583 18.7782L8.11927 19.1875L8.73333 21.1662C8.86979 21.5756 9.27917 21.9167 9.75677 21.9167H12.0766C12.5542 21.9167 12.9635 21.5756 13.1 21.1662L13.7141 19.1875L14.7375 18.7782L16.5115 19.7334C16.9208 19.9381 17.4667 19.8698 17.8078 19.5287L19.4453 17.8912C19.7865 17.55 19.8547 17.0042 19.65 16.5948L18.6948 14.8209L19.1042 13.7974L21.0828 13.1834C21.4922 13.0469 21.8333 12.6375 21.8333 12.1599V9.84015C21.8333 9.36254 21.4922 8.88494 21.0146 8.74848ZM20.4688 11.9552L18.0125 12.7058L17.9443 13.0469C17.7396 13.5245 17.5349 14.0021 17.3302 14.4797L17.1255 14.8209L18.3536 17.0724L16.9891 18.437L14.7375 17.2089L14.3964 17.4136C13.9188 17.6865 13.4411 17.8912 12.9635 18.0276L12.6224 18.0959L11.8719 20.5521H9.96146L9.21094 18.0959L8.86979 18.0276C8.39219 17.823 7.91458 17.6183 7.43698 17.4136L7.09583 17.2089L4.84427 18.437L3.47969 17.0724L4.70781 14.8209L4.50313 14.4797C4.23021 14.0021 4.02552 13.5245 3.88906 13.0469L3.82083 12.7058L1.36458 11.9552V10.0448L3.68438 9.36254L3.82083 9.0214C3.95729 8.47556 4.16198 7.99796 4.4349 7.52035L4.63958 7.17921L3.47969 4.92765L4.84427 3.56306L7.02761 4.79119L7.36875 4.5865C7.84636 4.31358 8.32396 4.1089 8.86979 3.97244L9.21094 3.83598L9.96146 1.44796H11.8719L12.6224 3.83598L12.9635 3.97244C13.4411 4.1089 13.9188 4.31358 14.3964 4.5865L14.7375 4.79119L16.9891 3.56306L18.3536 4.92765L17.1255 7.17921L17.3302 7.52035C17.6031 7.99796 17.8078 8.47556 17.9443 8.95317L18.0125 9.29431L20.4688 10.0448V11.9552Z" fill="#EEEEEE"/>
</svg>

);
const IconSair = () => (
  <svg width="23" height="24" viewBox="0 0 23 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 22.5H3.33333C2.71449 22.5 2.121 22.2542 1.68342 21.8166C1.24583 21.379 1 20.7855 1 20.1667V3.83333C1 3.21449 1.24583 2.621 1.68342 2.18342C2.121 1.74583 2.71449 1.5 3.33333 1.5H8" stroke="#EEEEEE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 17.5L22 12L16 6.5" stroke="#EEEEEE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 12.5H8" stroke="#EEEEEE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

);

export default function Sidebar() {
  const navigate = useNavigate();
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  })();

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.setItem("flash", "Você saiu da sua conta.");
    navigate("/auth/login", { replace: true });
  }

  const links = [
    { to: "/", label: "Pedidos", icon: <IconPedidos /> },
    { to: "/clientes", label: "Clientes", icon: <IconClientes /> },
    { to: "/checklist", label: "Checklist", icon: <IconChecklist /> },
    { to: "/admin", label: "Administração", icon: <IconAdmin /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">KOGMA</div>
      <div className="user-block">
        <div className="user-avatar" />
      </div>

      <nav className="sidebar-nav">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <button className="nav-link logout" onClick={logout}>
          <span className="icon"><IconSair /></span>
          <span>Sair</span>
        </button>
      </nav>
    </aside>
  );
}
