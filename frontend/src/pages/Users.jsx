import { useEffect, useMemo, useState } from "react";
import {
  deleteData,
  getData,
  postData,
  putData,
} from "../services/api";
import { showError, showSuccess } from "../utils/toast";

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
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);

  const emptyForm = {
    full_name: "",
    email: "",
    password: "",
    role: "user",
    contact: "",
    room_no: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);

      const res = await getData(`/users${params.toString() ? `?${params}` : ""}`);
      setUsers(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error("Failed to load users", error);
      showError(error?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, roleFilter]);

  const createUser = async (e) => {
    e.preventDefault();

    if (!form.full_name || !form.email || !form.password || !form.role) {
      showError("Please fill all required fields.");
      return;
    }

    try {
      setSaving(true);
      await postData("/users", form);

      setForm(emptyForm);
      await loadUsers();
      showSuccess("User created successfully");
    } catch (error) {
      console.error("Failed to create user", error);
      showError(error?.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (e) => {
    e.preventDefault();

    if (!editingUser) return;

    try {
      setSaving(true);
      await putData(`/users/${editingUser.id}`, form);
      setEditingUser(null);
      setForm(emptyForm);
      await loadUsers();
      showSuccess("User updated successfully");
    } catch (error) {
      console.error("Failed to update user", error);
      showError(error?.response?.data?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingUser(item);
    setForm({
      full_name: item.full_name || "",
      email: item.email || "",
      password: "",
      role: item.role || "user",
      contact: item.contact || "",
      room_no: item.room_no || "",
    });
  };

  const removeUser = async (id) => {
    const ok = window.confirm("Delete this user?");
    if (!ok) return;

    try {
      await deleteData(`/users/${id}`);
      showSuccess("User deleted successfully");
      await loadUsers();
    } catch (error) {
      console.error("Failed to delete user", error);
      showError(error?.response?.data?.message || "Failed to delete user");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const text =
        `${item.full_name || ""} ${item.email || ""} ${item.role || ""} ${item.contact || ""} ${item.room_no || ""}`
          .toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" ? true : item.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

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
            Create, edit, delete, and filter admin and user accounts.
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

      <div style={{ ...cardStyle, padding: 20 }}>
        <div className="search-row">
          <input
            className="input"
            placeholder="Search by name, email, contact, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ maxWidth: 180 }}
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
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
          onSubmit={editingUser ? updateUser : createUser}
          style={{
            ...cardStyle,
            padding: 28,
            display: "grid",
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 22, color: "#0f172a" }}>
              {editingUser ? "Edit User" : "Create User"}
            </h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              {editingUser
                ? "Update existing user details."
                : "Add a new system user or admin account."}
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
            <label style={labelStyle}>
              Password {editingUser ? "(leave blank to keep same)" : ""}
            </label>
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

          <div>
            <label style={labelStyle}>Contact</label>
            <input
              style={inputStyle}
              placeholder="Enter contact"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Room No</label>
            <input
              style={inputStyle}
              placeholder="Enter room no"
              value={form.room_no}
              onChange={(e) => setForm({ ...form, room_no: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={primaryButton} type="submit" disabled={saving}>
              {saving ? "Saving..." : editingUser ? "Update User" : "Create User"}
            </button>

            {editingUser && (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setForm(emptyForm);
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <div style={{ ...cardStyle, padding: 28 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 22, color: "#0f172a" }}>
            Users Directory
          </h3>

          {loading ? (
            <div className="empty-state">Loading users...</div>
          ) : !filteredUsers.length ? (
            <div className="empty-state">No users found.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Room</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.full_name}</strong>
                      </td>
                      <td>{item.email}</td>
                      <td>
                        <span
                          className={
                            item.role === "admin"
                              ? "badge badge-info"
                              : "badge badge-success"
                          }
                        >
                          {item.role_badge || item.role}
                        </span>
                      </td>
                      <td>{item.contact || "-"}</td>
                      <td>{item.room_no || "-"}</td>
                      <td>{item.created_date_formatted || item.created_at || "-"}</td>
                      <td>
                        <div className="button-group">
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => startEdit(item)}
                          >
                            Edit
                          </button>

                          <button
                            className="button button-danger"
                            type="button"
                            onClick={() => removeUser(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
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