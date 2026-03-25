import { useEffect, useMemo, useState } from "react";
import {
  deleteData,
  getData,
  patchData,
  postData,
} from "../services/api";
import { showError, showSuccess } from "../utils/toast";

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
    notification_type: "general",
    action_url: "",
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await getData("/notifications/");
      setNotifications(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error("Failed to load notifications", error);
      showError(error?.response?.data?.message || "Failed to load notifications");
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
        notification_type: "general",
        action_url: "",
      });
      showSuccess("Notification created");
      loadNotifications();
    } catch (error) {
      console.error("Failed to create notification", error);
      showError(error?.response?.data?.message || "Failed to create notification");
    }
  };

  const markAsRead = async (id) => {
    try {
      await patchData(`/notifications/${id}/read`);
      loadNotifications();
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await patchData("/notifications/read-all");
      showSuccess("All notifications marked as read");
      loadNotifications();
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to mark all as read");
    }
  };

  const removeNotification = async (id) => {
    try {
      await deleteData(`/notifications/${id}`);
      showSuccess("Notification deleted");
      loadNotifications();
    } catch (error) {
      showError(error?.response?.data?.message || "Failed to delete notification");
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesSearch = `${item.title} ${item.message} ${item.role_target || ""} ${item.notification_type || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesTarget =
        targetFilter === "all"
          ? true
          : String(item.role_target || "").toLowerCase() === targetFilter;

      return matchesSearch && matchesTarget;
    });
  }, [notifications, search, targetFilter]);

  const totalNotifications = notifications.length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const userNotifications = notifications.filter(
    (n) => String(n.role_target || "").toLowerCase() === "user"
  ).length;
  const adminNotifications = notifications.filter(
    (n) => String(n.role_target || "").toLowerCase() === "admin"
  ).length;

  return (
    <div className="page-grid">
      <section className="glass-card">
        <div className="hero-strip">
          <div>
            <h2 className="page-title">Notification System</h2>
            <p className="page-subtitle">
              Broadcast important notices, meal updates, due reminders, and system announcements.
            </p>
          </div>

          <div className="hero-kpis">
            <div className="kpi-pill">Total: {totalNotifications}</div>
            <div className="kpi-pill">Unread: {unreadCount}</div>
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

            <div className="form-row">
              <select
                className="select"
                value={form.role_target}
                onChange={(e) => setForm({ ...form, role_target: e.target.value })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              <select
                className="select"
                value={form.notification_type}
                onChange={(e) =>
                  setForm({ ...form, notification_type: e.target.value })
                }
              >
                <option value="general">General</option>
                <option value="bill_generated">Bill Generated</option>
                <option value="payment_approved">Payment Approved</option>
                <option value="payment_rejected">Payment Rejected</option>
                <option value="complaint_resolved">Complaint Resolved</option>
                <option value="low_stock">Low Stock</option>
              </select>
            </div>

            <input
              className="input"
              placeholder="Action URL (optional), e.g. /billing"
              value={form.action_url}
              onChange={(e) => setForm({ ...form, action_url: e.target.value })}
            />

            <div className="button-group">
              <button className="button button-primary" type="submit">
                Send Notification
              </button>
            </div>
          </form>
        )}

        <section className="glass-card">
          <h3 className="section-title">Quick Actions</h3>

          <div className="button-group">
            <button className="button button-secondary" type="button" onClick={markAllAsRead}>
              Mark All Read
            </button>
          </div>

          <div className="stats-grid" style={{ marginTop: 18 }}>
            <div className="stat-card">
              <div className="stat-label">All Notifications</div>
              <div className="stat-value">{totalNotifications}</div>
              <div className="stat-trend">Broadcast records</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Unread</div>
              <div className="stat-value">{unreadCount}</div>
              <div className="stat-trend">Needs attention</div>
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
                <div style={{ flex: 1 }}>
                  <strong>{item.title}</strong>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {item.message}
                  </div>
                  <div className="muted" style={{ marginTop: 8, fontSize: "0.9rem" }}>
                    {item.created_at || "-"}
                  </div>

                  <div className="button-group" style={{ marginTop: 12 }}>
                    {!item.is_read && (
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => markAsRead(item.id)}
                      >
                        Mark Read
                      </button>
                    )}

                    <button
                      className="button button-danger"
                      type="button"
                      onClick={() => removeNotification(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <span
                    className={`badge ${
                      String(item.role_target || "").toLowerCase() === "admin"
                        ? "badge-info"
                        : "badge-success"
                    }`}
                  >
                    {item.role_target || "all"}
                  </span>

                  <span className={item.is_read ? "badge badge-success" : "badge badge-warning"}>
                    {item.is_read ? "Read" : "Unread"}
                  </span>

                  <span className="badge badge-info">
                    {item.notification_type || "general"}
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