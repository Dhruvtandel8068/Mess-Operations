import { useEffect, useMemo, useState } from "react";
import { getData, postData } from "../services/api";

export default function Attendance() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    user_id: "",
    date: new Date().toISOString().slice(0, 10),
    breakfast: false,
    lunch: false,
    dinner: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const attendance = await getData("/attendance");
    setRows(attendance);

    if (isAdmin) {
      const usersRes = await getData("/users");
      const normalUsers = usersRes.filter((u) => u.role === "user");
      setUsers(normalUsers);
      if (!form.user_id && normalUsers.length) {
        setForm((prev) => ({ ...prev, user_id: normalUsers[0].id }));
      }
    }
  };

  const saveAttendance = async (e) => {
    e.preventDefault();

    const payload = {
      date: form.date,
      breakfast: form.breakfast,
      lunch: form.lunch,
      dinner: form.dinner,
    };

    if (isAdmin) payload.user_id = form.user_id;

    await postData("/attendance", payload);

    setForm((prev) => ({
      ...prev,
      breakfast: false,
      lunch: false,
      dinner: false,
    }));

    loadData();
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      `${row.user_name} ${row.date}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  return (
    <div className="page-grid">
      <section className="glass-card">
        <h2 className="page-title">Attendance Management</h2>
        <p className="page-subtitle">
          Track breakfast, lunch, and dinner attendance with a cleaner workflow.
        </p>
      </section>

      <section className="content-two">
        <form className="glass-card form-grid" onSubmit={saveAttendance}>
          <h3 className="section-title">Mark Attendance</h3>

          {isAdmin && (
            <select
              className="select"
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          )}

          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          <div className="checkbox-row">
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={form.breakfast}
                onChange={(e) =>
                  setForm({ ...form, breakfast: e.target.checked })
                }
              />
              Breakfast
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={form.lunch}
                onChange={(e) => setForm({ ...form, lunch: e.target.checked })}
              />
              Lunch
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={form.dinner}
                onChange={(e) => setForm({ ...form, dinner: e.target.checked })}
              />
              Dinner
            </label>
          </div>

          <button className="button button-primary" type="submit">
            Save Attendance
          </button>
        </form>

        <section className="glass-card">
          <h3 className="section-title">Quick Overview</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Records</div>
              <div className="stat-value">{rows.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Today</div>
              <div className="stat-value" style={{ fontSize: "1.15rem" }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="glass-card">
        <div className="search-row">
          <input
            className="input"
            placeholder="Search by student name or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="glass-card">
        <h3 className="section-title">Attendance History</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Date</th>
                <th>Breakfast</th>
                <th>Lunch</th>
                <th>Dinner</th>
                <th>Meal Count</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.user_name}</strong></td>
                  <td>{row.date}</td>
                  <td>{row.breakfast ? "Yes" : "No"}</td>
                  <td>{row.lunch ? "Yes" : "No"}</td>
                  <td>{row.dinner ? "Yes" : "No"}</td>
                  <td>
                    <span className="badge badge-info">{row.meal_count}</span>
                  </td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">No attendance records found.</div>
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