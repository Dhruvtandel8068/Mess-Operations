import { useState } from "react";
import { postData } from "../services/api";
import { showSuccess, showError } from "../utils/toast";

export default function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.new_password !== form.confirm_password) {
      showError("New password and confirm password do not match");
      return;
    }

    if (form.new_password.length < 6) {
      showError("New password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      await postData("/auth/change-password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });

      showSuccess("Password changed successfully");

      setForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      console.error("Change password failed", error);
      showError(error?.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="glass-card">
        <div className="hero-strip">
          <div>
            <h2 className="page-title">Change Password</h2>
            <p className="page-subtitle">
              Keep your account secure by updating your password regularly.
            </p>
          </div>

          <div className="hero-kpis">
            <div className="kpi-pill">Security Settings</div>
          </div>
        </div>
      </section>

      <section className="content-two">
        <form className="glass-card form-grid" onSubmit={handleSubmit}>
          <h3 className="section-title">Update Your Password</h3>

          <input
            className="input"
            type="password"
            name="current_password"
            placeholder="Current password"
            value={form.current_password}
            onChange={handleChange}
            required
          />

          <input
            className="input"
            type="password"
            name="new_password"
            placeholder="New password"
            value={form.new_password}
            onChange={handleChange}
            required
          />

          <input
            className="input"
            type="password"
            name="confirm_password"
            placeholder="Confirm new password"
            value={form.confirm_password}
            onChange={handleChange}
            required
          />

          <div className="button-group">
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>

        <section className="glass-card">
          <h3 className="section-title">Password Tips</h3>

          <div className="list-stack">
            <div className="list-item">
              <div>
                <strong>Use a strong password</strong>
                <div className="muted">
                  Include uppercase, lowercase, numbers, and symbols.
                </div>
              </div>
            </div>

            <div className="list-item">
              <div>
                <strong>Do not reuse old passwords</strong>
                <div className="muted">
                  Choose a fresh password that you do not use elsewhere.
                </div>
              </div>
            </div>

            <div className="list-item">
              <div>
                <strong>Keep it private</strong>
                <div className="muted">
                  Never share your password with anyone.
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}