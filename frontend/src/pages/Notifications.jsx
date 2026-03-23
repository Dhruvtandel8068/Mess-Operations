import { useEffect, useMemo, useState } from "react";
import { getData, postData } from "../services/api";

export default function Notifications() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    message: "",
    role_target: "user",
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await getData("/notifications/");
      setNotifications(res || []);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async (e) => {
    e.preventDefault();

    try {
      await postData("/notifications/", form);
      setForm({
        title: "",
        message: "",
        role_target: "user",
      });
      loadNotifications();
    } catch (error) {
      console.error("Failed to create notification", error);
      alert(error?.response?.data?.message || "Failed to create notification");
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesSearch = `${item.title} ${item.message} ${item.role_target || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesTarget =
        targetFilter === "all"
          ? true
          : (item.role_target || "").toLowerCase() === targetFilter;

      return matchesSearch && matchesTarget;
    });
  }, [notifications, search, targetFilter]);

  const totalNotifications = notifications.length;
  const userNotifications = notifications.filter(
    (n) => (n.role_target || "").toLowerCase() === "user"
  ).length;
  const adminNotifications = notifications.filter(
    (n) => (n.role_target || "").toLowerCase() === "admin"
  ).length;

  return (
    <div className="page-grid">
      <section className="glass-card">
        <div className="hero-strip">
          <div>
            <h2 className="page-title">Notification System</h2>
            <p className="page-subtitle">
              Broadcast important notices, meal updates, due reminders, and system
              announcements in a clean product-style notification center.
            </p>
          </div>

          <div className="hero-kpis">
            <div className="kpi-pill">Total: {totalNotifications}</div>
            <div className="kpi-pill">User Notices: {userNotifications}</div>
            <div className="kpi-pill">Admin Notices: {adminNotifications}</div>
          </div>
        </div>
      </section>

      <section className="content-two">
        {isAdmin && (
          <form className="glass-card form-grid" onSubmit={createNotification}>
            <h3 className="section-title">Create Notification</h3>

            <input
              className="input"
              placeholder="Notification title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <textarea
              className="textarea"
              placeholder="Write the notification message..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />

            <select
              className="select"
              value={form.role_target}
              onChange={(e) =>
                setForm({ ...form, role_target: e.target.value })
              }
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            <div className="button-group">
              <button className="button button-primary" type="submit">
                Send Notification
              </button>
            </div>
          </form>
        )}

        <section className="glass-card">
          <h3 className="section-title">Quick Insights</h3>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">All Notifications</div>
              <div className="stat-value">{totalNotifications}</div>
              <div className="stat-trend">Broadcast records</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">For Users</div>
              <div className="stat-value">{userNotifications}</div>
              <div className="stat-trend">Student notices</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">For Admin</div>
              <div className="stat-value">{adminNotifications}</div>
              <div className="stat-trend">Admin notices</div>
            </div>
          </div>
        </section>
      </section>

      <section className="glass-card">
        <div className="search-row">
          <input
            className="input"
            placeholder="Search by title, message, target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="select"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            style={{ maxWidth: 180 }}
          >
            <option value="all">All Targets</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </section>

      <section className="glass-card">
        <h3 className="section-title">Notification Center</h3>

        {loading ? (
          <div className="empty-state">Loading notifications...</div>
        ) : filteredNotifications.length ? (
          <div className="list-stack">
            {filteredNotifications.map((item) => (
              <div key={item.id} className="list-item">
                <div>
                  <strong>{item.title}</strong>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {item.message}
                  </div>
                  <div className="muted" style={{ marginTop: 8, fontSize: "0.9rem" }}>
                    {item.created_at || "-"}
                  </div>
                </div>

                <div>
                  <span
                    className={`badge ${
                      (item.role_target || "").toLowerCase() === "admin"
                        ? "badge-info"
                        : "badge-success"
                    }`}
                  >
                    {item.role_target || "all"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No notifications found.</div>
        )}
      </section>
    </div>
  );
}