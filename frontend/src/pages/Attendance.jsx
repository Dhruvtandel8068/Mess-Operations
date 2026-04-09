import { useEffect, useMemo, useState } from "react";
import { getData, postData } from "../services/api";
import { formatDate } from "../utils/format";

export default function Attendance() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [cutoffs, setCutoffs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const [form, setForm] = useState({
    user_id: "",
    date: new Date().toISOString().slice(0, 10),
    breakfast: false,
    lunch: false,
    dinner: false,
  });

  const [existingAttendance, setExistingAttendance] = useState({
    exists: false,
    breakfast: false,
    lunch: false,
    dinner: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadCutoffs(form.date);
    }
  }, [form.date, isAdmin]);

  useEffect(() => {
    if (isAdmin && form.user_id && form.date) {
      checkExistingAttendance(form.user_id, form.date);
    }
  }, [form.user_id, form.date, isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);

      const attendance = await getData("/attendance");
      setRows(attendance || []);

      if (isAdmin) {
        const usersRes = await getData("/users");
        const normalUsers = (usersRes || []).filter((u) => u.role === "user");
        setUsers(normalUsers);

        if (!form.user_id && normalUsers.length) {
          const firstUserId = String(normalUsers[0].id);
          setForm((prev) => ({ ...prev, user_id: firstUserId }));
          await checkExistingAttendance(firstUserId, form.date);
        }
      }
    } catch (error) {
      console.error("Failed to load attendance data", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCutoffs = async (selectedDate) => {
    try {
      const data = await getData(`/attendance/cutoffs?date=${selectedDate}`);
      setCutoffs(data);
    } catch (error) {
      console.error("Failed to load cutoffs", error);
    }
  };

  const checkExistingAttendance = async (userId, selectedDate) => {
    try {
      setCheckingExisting(true);

      const data = await getData(
        `/attendance/check?user_id=${userId}&date=${selectedDate}`
      );

      if (data?.exists && data?.attendance) {
        setExistingAttendance({
          exists: true,
          breakfast: !!data.attendance.breakfast,
          lunch: !!data.attendance.lunch,
          dinner: !!data.attendance.dinner,
        });

        setForm((prev) => ({
          ...prev,
          breakfast: false,
          lunch: false,
          dinner: false,
        }));
      } else {
        setExistingAttendance({
          exists: false,
          breakfast: false,
          lunch: false,
          dinner: false,
        });

        setForm((prev) => ({
          ...prev,
          breakfast: false,
          lunch: false,
          dinner: false,
        }));
      }
    } catch (error) {
      console.error("Failed to check existing attendance", error);
    } finally {
      setCheckingExisting(false);
    }
  };

  const saveAttendance = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      alert("Only admin can mark attendance");
      return;
    }

    if (!form.breakfast && !form.lunch && !form.dinner) {
      alert("Please select at least one new meal");
      return;
    }

    const payload = {
      user_id: form.user_id,
      date: form.date,
      breakfast: form.breakfast,
      lunch: form.lunch,
      dinner: form.dinner,
    };

    try {
      await postData("/attendance", payload);

      await loadData();
      await loadCutoffs(form.date);
      await checkExistingAttendance(form.user_id, form.date);

      alert("Attendance saved successfully");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to save attendance");
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      `${row.user_name} ${row.date}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  if (loading) {
    return (
      <div className="page-grid">
        <section className="glass-card">
          <h2 className="page-title">Attendance Management</h2>
          <p className="page-subtitle">Loading attendance data...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="glass-card">
        <h2 className="page-title">Attendance</h2>
        <p className="page-subtitle">
          Welcome back, {user?.full_name || "User"}{" "}
          <span className="badge badge-info" style={{ marginLeft: 8 }}>
            {user?.role || "user"}
          </span>
        </p>
      </section>

      <section className="glass-card">
        <h2 className="page-title">Attendance Management</h2>
        <p className="page-subtitle">
          {isAdmin
            ? "Admin can mark breakfast, lunch, and dinner attendance for users."
            : "View your attendance history. Only admin can mark attendance."}
        </p>
      </section>

      <section className="content-two">
        {isAdmin ? (
          <form className="glass-card form-grid" onSubmit={saveAttendance}>
            <h3 className="section-title">Mark Attendance</h3>

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

            <input
              className="input"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Breakfast Cutoff</div>
                <div className="stat-value" style={{ fontSize: "1rem" }}>
                  {cutoffs?.breakfast || "09:00"}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Lunch Cutoff</div>
                <div className="stat-value" style={{ fontSize: "1rem" }}>
                  {cutoffs?.lunch || "13:00"}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Dinner Cutoff</div>
                <div className="stat-value" style={{ fontSize: "1rem" }}>
                  {cutoffs?.dinner || "21:00"}
                </div>
              </div>
            </div>

            {checkingExisting ? (
              <div className="empty-state">Checking existing attendance...</div>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Already Marked</div>
                  <div className="muted">
                    Breakfast: {existingAttendance.breakfast ? "Yes" : "No"}
                  </div>
                  <div className="muted">
                    Lunch: {existingAttendance.lunch ? "Yes" : "No"}
                  </div>
                  <div className="muted">
                    Dinner: {existingAttendance.dinner ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            )}

            <div className="checkbox-row">
              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={existingAttendance.breakfast || form.breakfast}
                  disabled={existingAttendance.breakfast}
                  onChange={(e) =>
                    setForm({ ...form, breakfast: e.target.checked })
                  }
                />
                Breakfast
              </label>

              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={existingAttendance.lunch || form.lunch}
                  disabled={existingAttendance.lunch}
                  onChange={(e) =>
                    setForm({ ...form, lunch: e.target.checked })
                  }
                />
                Lunch
              </label>

              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={existingAttendance.dinner || form.dinner}
                  disabled={existingAttendance.dinner}
                  onChange={(e) =>
                    setForm({ ...form, dinner: e.target.checked })
                  }
                />
                Dinner
              </label>
            </div>

            <button className="button button-primary" type="submit">
              Save Attendance
            </button>
          </form>
        ) : (
          <section className="glass-card">
            <h3 className="section-title">Your Access</h3>
            <div className="empty-state">
              You can only view your own attendance. Attendance can be marked only by admin.
            </div>
          </section>
        )}

        <section className="glass-card">
          <h3 className="section-title">Quick Overview</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">{isAdmin ? "Total Records" : "Your Records"}</div>
              <div className="stat-value">{rows.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Today</div>
              <div className="stat-value" style={{ fontSize: "1.15rem" }}>
                {formatDate(new Date())}
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="glass-card">
        <div className="search-row">
          <input
            className="input"
            placeholder={isAdmin ? "Search by student name or date..." : "Search by date..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="glass-card">
        <h3 className="section-title">
          {isAdmin ? "Attendance History" : "My Attendance History"}
        </h3>

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
                  <td>
                    <strong>{row.user_name}</strong>
                  </td>
                  <td>{formatDate(row.date)}</td>
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