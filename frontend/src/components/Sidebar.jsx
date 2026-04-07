import { NavLink } from "react-router-dom";

const mainLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/menu", label: "Menu" },
  { to: "/attendance", label: "Attendance" },
  { to: "/billing", label: "Billing" },
  { to: "/complaints", label: "Complaints" },
  { to: "/notifications", label: "Notifications" },
];

const adminLinks = [
  { to: "/expenses", label: "Expenses" },
  { to: "/reports", label: "Reports" },
  { to: "/inventory", label: "Inventory" },
  { to: "/users", label: "Users" },
  { to: "/payment-approval", label: "Payment Approval" },
];

export default function Sidebar({ open = false, onClose = () => {} }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  return (
    <aside className={`sidebar ${open ? "sidebar-mobile-open" : ""}`}>
      <div className="sidebar-head">
        <div className="brand">
          <div className="brand-title">MessMate Pro</div>
          <div className="brand-subtitle">
            {isAdmin ? "Admin Control Panel" : "Student Experience Panel"}
          </div>
        </div>

        <button className="sidebar-close" type="button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="nav-section">Main Menu</div>
      <nav className="nav-list">
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {isAdmin && (
        <>
          <div className="nav-section">Administration</div>
          <nav className="nav-list">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </aside>
  );
}