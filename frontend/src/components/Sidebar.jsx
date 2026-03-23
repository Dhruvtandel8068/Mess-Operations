import { NavLink } from "react-router-dom";

const mainLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/menu", label: "Menu" },
  { to: "/attendance", label: "Attendance" },
  { to: "/billing", label: "Billing" },
  { to: "/complaints", label: "Complaints" },
  { to: "/notifications", label: "Notifications" },
  { to: "/profile", label: "Profile" },
  { to: "/change-password", label: "Change Password" },
];

const adminLinks = [
  { to: "/expenses", label: "Expenses" },
  { to: "/reports", label: "Reports" },
  { to: "/inventory", label: "Inventory" },
  { to: "/users", label: "Users" },
];

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-title">MessMate Pro</div>
        <div className="brand-subtitle">
          {isAdmin ? "Admin Control Panel" : "Student Experience Panel"}
        </div>
      </div>

      <div className="nav-section">Main Menu</div>
      <nav className="nav-list">
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `nav-item${isActive ? " active" : ""}`
            }
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
                className={({ isActive }) =>
                  `nav-item${isActive ? " active" : ""}`
                }
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