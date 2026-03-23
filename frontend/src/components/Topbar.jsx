import { useNavigate } from "react-router-dom";

export default function Topbar({ user, title = "Dashboard" }) {
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>
          Welcome back, <strong>{user?.full_name || "User"}</strong>
          <span className="role-chip">{user?.role || "user"}</span>
        </p>
      </div>

      <div className="topbar-right">
        <button className="profile-btn" onClick={() => navigate("/profile")}>
          Profile
        </button>
        <div className="avatar">
          {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}