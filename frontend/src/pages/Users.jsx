import { useEffect, useMemo, useState } from "react";
import { getData, postData, putData, deleteData } from "../services/api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "user",
    contact: "",
    room_no: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getData("/users");
      setUsers(res || []);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      full_name: "",
      email: "",
      password: "",
      role: "user",
      contact: "",
      room_no: "",
    });
  };

  const submitUser = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        const payload = { ...form };

        if (!payload.password) {
          delete payload.password;
        }

        await putData(`/users/${editingId}`, payload);
      } else {
        await postData("/users", form);
      }

      resetForm();
      loadUsers();
    } catch (error) {
      console.error("Failed to save user", error);
      alert(error?.response?.data?.message || "Failed to save user");
    }
  };

  const editUser = (user) => {
    setEditingId(user.id);
    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
      contact: user.contact || "",
      room_no: user.room_no || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeUser = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this user?");
    if (!ok) return;

    try {
      await deleteData(`/users/${id}`);
      loadUsers();
    } catch (error) {
      console.error("Failed to delete user", error);
      alert(error?.response?.data?.message || "Failed to delete user");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = `${u.full_name} ${u.email} ${u.role} ${u.contact || ""} ${u.room_no || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "all" ? true : u.role?.toLowerCase() === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalUsers = users.filter((u) => u.role === "user").length;

  return (
    <div className="page-grid">
      <section className="glass-card">
        <div className="hero-strip">
          <div>
            <h2 className="page-title">User Management</h2>
            <p className="page-subtitle">
              Create, update, filter, and manage admin and student accounts from one place.
            </p>
          </div>

          <div className="hero-kpis">
            <div className="kpi-pill">Total Accounts: {users.length}</div>
            <div className="kpi-pill">Admins: {totalAdmins}</div>
            <div className="kpi-pill">Users: {totalUsers}</div>
          </div>
        </div>
      </section>

      <section className="content-two">
        <form className="glass-card form-grid" onSubmit={submitUser}>
          <h3 className="section-title">
            {editingId ? "Update User" : "Create New User"}
          </h3>

          <input
            className="input"
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />

          <div className="form-row">
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <input
              className="input"
              type="password"
              placeholder={editingId ? "New password (optional)" : "Password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editingId}
            />
          </div>

          <div className="form-row-3">
            <select
              className="select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            <input
              className="input"
              placeholder="Contact number"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />

            <input
              className="input"
              placeholder="Room number"
              value={form.room_no}
              onChange={(e) => setForm({ ...form, room_no: e.target.value })}
            />
          </div>

          <div className="button-group">
            <button className="button button-primary" type="submit">
              {editingId ? "Update User" : "Create User"}
            </button>

            <button
              className="button button-secondary"
              type="button"
              onClick={resetForm}
            >
              Reset
            </button>
          </div>
        </form>

        <section className="glass-card">
          <h3 className="section-title">Quick Insights</h3>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">All Accounts</div>
              <div className="stat-value">{users.length}</div>
              <div className="stat-trend">System users</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Admin Accounts</div>
              <div className="stat-value">{totalAdmins}</div>
              <div className="stat-trend">Access control</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Student Users</div>
              <div className="stat-value">{totalUsers}</div>
              <div className="stat-trend">Mess members</div>
            </div>
          </div>
        </section>
      </section>

      <section className="glass-card">
        <div className="search-row">
          <input
            className="input"
            placeholder="Search by name, email, role, contact, room..."
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
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
      </section>

      <section className="glass-card">
        <h3 className="section-title">Users Directory</h3>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Room</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">Loading users...</div>
                  </td>
                </tr>
              ) : filteredUsers.length ? (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.full_name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === "admin" ? "badge-info" : "badge-success"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>{u.contact || "-"}</td>
                    <td>{u.room_no || "-"}</td>
                    <td>
                      <div className="button-group">
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => editUser(u)}
                        >
                          Edit
                        </button>

                        <button
                          className="button button-danger"
                          type="button"
                          onClick={() => removeUser(u.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">No users found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}