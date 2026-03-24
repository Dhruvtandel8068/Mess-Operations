import { useEffect, useMemo, useState } from "react";
import { getData, postData } from "../services/api";

const cardStyle = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: 24,
  border: "1px solid rgba(148,163,184,0.14)",
  boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid #dbe3ef",
  outline: "none",
  fontSize: 15,
  background: "#fff",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 8,
  display: "block",
};

const primaryButton = {
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(37,99,235,0.22)",
};

export default function Users() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "user",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getData("/users");
      setUsers(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error("Failed to load users", error);
      alert(error?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();

    if (!form.full_name || !form.email || !form.password || !form.role) {
      alert("Please fill all fields.");
      return;
    }

    try {
      setSaving(true);
      await postData("/users", form);

      setForm({
        full_name: "",
        email: "",
        password: "",
        role: "user",
      });

      await loadUsers();
      alert("User created successfully");
    } catch (error) {
      console.error("Failed to create user", error);
      alert(error?.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const text = `${item.full_name || ""} ${item.email || ""} ${item.role || ""}`
        .toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [users, search]);

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const normalUsers = users.filter((u) => u.role === "user").length;

  if (!isAdmin) {
    return (
      <div style={{ ...cardStyle, padding: 28 }}>
        <h2 style={{ marginTop: 0, color: "#0f172a" }}>Users Module</h2>
        <p style={{ color: "#64748b", marginBottom: 0 }}>
          Only admin can access the user management module.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div
        style={{
          ...cardStyle,
          padding: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
            User Management
          </h2>
          <p style={{ color: "#64748b", marginTop: 10, marginBottom: 0 }}>
            Create and manage admin and user accounts for the mess system.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(59,130,246,0.10)",
              color: "#2563eb",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Total: {totalUsers}
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(16,185,129,0.10)",
              color: "#059669",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Users: {normalUsers}
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(124,58,237,0.10)",
              color: "#7c3aed",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Admins: {adminCount}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1.4fr",
          gap: 22,
        }}
      >
        <form
          onSubmit={createUser}
          style={{
            ...cardStyle,
            padding: 28,
            display: "grid",
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 22, color: "#0f172a" }}>
              Create User
            </h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Add a new system user or admin account.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              style={inputStyle}
              placeholder="Enter full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              placeholder="Enter email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Role</label>
            <select
              style={inputStyle}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button type="submit" style={primaryButton} disabled={saving}>
            {saving ? "Creating..." : "Create User"}
          </button>
        </form>

        <div
          style={{
            ...cardStyle,
            padding: 22,
            display: "grid",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: 22 }}>Users List</h3>
              <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                Search and review all registered accounts.
              </p>
            </div>

            <div
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                background: "rgba(16,185,129,0.12)",
                color: "#059669",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Showing: {filteredUsers.length}
            </div>
          </div>

          <input
            style={inputStyle}
            placeholder="Search by name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "#64748b",
                border: "1px dashed #d9e2ef",
                borderRadius: 18,
              }}
            >
              Loading users...
            </div>
          ) : !filteredUsers.length ? (
            <div
              style={{
                padding: 28,
                textAlign: "center",
                color: "#64748b",
                border: "1px dashed #d9e2ef",
                borderRadius: 18,
                background: "rgba(248,250,252,0.8)",
              }}
            >
              No users found.
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #edf2f7",
                borderRadius: 18,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 700,
                  background: "#fff",
                }}
              >
                <thead>
                  <tr style={{ background: "rgba(248,250,252,0.9)" }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item, index) => (
                    <tr
                      key={item.id}
                      style={{
                        borderTop: "1px solid #eef2f7",
                        background: index % 2 === 0 ? "#fff" : "#fcfdff",
                      }}
                    >
                      <td style={tdStyle}>
                        <strong>{item.full_name}</strong>
                      </td>
                      <td style={tdStyle}>{item.email}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "8px 12px",
                            borderRadius: "999px",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "inline-block",
                            background:
                              item.role === "admin"
                                ? "rgba(124,58,237,0.12)"
                                : "rgba(37,99,235,0.12)",
                            color: item.role === "admin" ? "#7c3aed" : "#2563eb",
                          }}
                        >
                          {item.role}
                        </span>
                      </td>
                      <td style={tdStyle}>{item.created_at || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "16px 18px",
  color: "#64748b",
  fontSize: 14,
  fontWeight: 700,
};

const tdStyle = {
  padding: "16px 18px",
  color: "#0f172a",
  verticalAlign: "top",
};