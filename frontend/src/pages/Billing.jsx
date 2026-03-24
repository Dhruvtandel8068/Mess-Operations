import { useEffect, useMemo, useState } from "react";
import { getData, postData } from "../services/api";
import { showSuccess, showError } from "../utils/toast";
import paymentQR from "../assets/payment-qr.jpeg";

export default function Billing() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [bills, setBills] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const [selectedBill, setSelectedBill] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [paying, setPaying] = useState(false);

  const [generationSummary, setGenerationSummary] = useState(null);

  const [generateForm, setGenerateForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    per_meal_cost: 50,
    billing_type: "all",
    user_id: "",
  });

  useEffect(() => {
    loadBills();
    if (isAdmin) {
      loadUsers();
    }
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const res = await getData("/billing/");
      setBills(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error("Failed to load bills", error);
      showError(error?.response?.data?.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await getData("/users");
      setUsers(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error("Failed to load users", error);
      showError(error?.response?.data?.message || "Failed to load users");
    }
  };

  const generateBills = async (e) => {
    e.preventDefault();

    if (
      generateForm.billing_type === "single" &&
      (!generateForm.user_id || generateForm.user_id === "")
    ) {
      showError("Please select a user");
      return;
    }

    try {
      const payload = {
        month: Number(generateForm.month),
        year: Number(generateForm.year),
        per_meal_cost: Number(generateForm.per_meal_cost),
        billing_type: generateForm.billing_type,
      };

      if (generateForm.billing_type === "single") {
        payload.user_id = Number(generateForm.user_id);
      }

      const res = await postData("/billing/generate", payload);

      showSuccess(res?.message || "Bills generated successfully");
      setGenerationSummary(res?.summary || null);
      await loadBills();
    } catch (error) {
      console.error("Failed to generate bills", error);
      showError(error?.response?.data?.message || "Failed to generate bills");
    }
  };

  const openPaymentBox = (bill) => {
    setSelectedBill(bill);
    setTransactionId("");
  };

  const closePaymentBox = () => {
    setSelectedBill(null);
    setTransactionId("");
  };

  const payBill = async (billId) => {
    try {
      setPaying(true);

      const fd = new FormData();
      fd.append("mode", "UPI");
      fd.append("receipt_no", transactionId || `REC-${Date.now()}`);
      fd.append("note", "Paid via QR payment");

      await postData(`/billing/${billId}/pay`, fd, true);

      showSuccess("Payment submitted successfully");
      closePaymentBox();
      await loadBills();
    } catch (error) {
      console.error("Failed to pay bill", error);
      showError(error?.response?.data?.message || "Failed to pay bill");
    } finally {
      setPaying(false);
    }
  };

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesSearch = `${bill.user_name} ${bill.period} ${bill.status}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : bill.status?.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  const totalBills = bills.length;
  const paidBills = bills.filter((bill) => bill.status === "Paid").length;
  const unpaidBills = bills.filter((bill) => bill.status === "Unpaid").length;
  const pendingBills = bills.filter(
    (bill) => bill.status === "Pending Approval"
  ).length;

  const totalAmount = bills.reduce(
    (sum, bill) => sum + Number(bill.total_amount || 0),
    0
  );

  const selectedUserName =
    generateForm.billing_type === "single"
      ? users.find((u) => Number(u.id) === Number(generateForm.user_id))
          ?.full_name || "No user selected"
      : "All users";

  return (
    <>
      <div className="page-grid">
        <section className="glass-card">
          <div className="hero-strip">
            <div>
              <h2 className="page-title">Billing Management</h2>
              <p className="page-subtitle">
                Generate monthly bills, track payments, and manage billing summary.
              </p>
            </div>

            <div className="hero-kpis">
              <div className="kpi-pill">Total Bills: {totalBills}</div>
              <div className="kpi-pill">Paid: {paidBills}</div>
              <div className="kpi-pill">Pending: {pendingBills}</div>
            </div>
          </div>
        </section>

        <section className="content-two">
          {isAdmin && (
            <form className="glass-card form-grid" onSubmit={generateBills}>
              <h3 className="section-title">Generate Monthly Bills</h3>

              <div className="form-row">
                <input
                  className="input"
                  type="number"
                  placeholder="Month"
                  value={generateForm.month}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, month: e.target.value })
                  }
                  required
                />

                <input
                  className="input"
                  type="number"
                  placeholder="Year"
                  value={generateForm.year}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, year: e.target.value })
                  }
                  required
                />
              </div>

              <input
                className="input"
                type="number"
                placeholder="Per meal cost"
                value={generateForm.per_meal_cost}
                onChange={(e) =>
                  setGenerateForm({
                    ...generateForm,
                    per_meal_cost: e.target.value,
                  })
                }
                required
              />

              <div className="form-row">
                <select
                  className="select"
                  value={generateForm.billing_type}
                  onChange={(e) =>
                    setGenerateForm({
                      ...generateForm,
                      billing_type: e.target.value,
                      user_id: "",
                    })
                  }
                >
                  <option value="all">Generate for All Users</option>
                  <option value="single">Generate for One User</option>
                </select>

                {generateForm.billing_type === "single" && (
                  <select
                    className="select"
                    value={generateForm.user_id}
                    onChange={(e) =>
                      setGenerateForm({
                        ...generateForm,
                        user_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select User</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(37, 99, 235, 0.08)",
                  border: "1px solid rgba(37, 99, 235, 0.15)",
                  color: "#0f172a",
                  fontWeight: 600,
                }}
              >
                Bill will be created for: {selectedUserName}
              </div>

              <div className="button-group">
                <button className="button button-primary" type="submit">
                  {generateForm.billing_type === "single"
                    ? "Generate Selected User Bill"
                    : "Generate All Bills"}
                </button>
              </div>
            </form>
          )}

          <section className="glass-card">
            <h3 className="section-title">Quick Insights</h3>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Amount</div>
                <div className="stat-value">₹ {totalAmount.toFixed(2)}</div>
                <div className="stat-trend">All generated bills</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Paid Bills</div>
                <div className="stat-value">{paidBills}</div>
                <div className="stat-trend">Completed payments</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Pending Approval</div>
                <div className="stat-value">{pendingBills}</div>
                <div className="stat-trend">Waiting for admin approval</div>
              </div>
            </div>
          </section>
        </section>

        {generationSummary && (
          <section className="glass-card">
            <h3 className="section-title">Generation Summary</h3>

            <div className="stats-grid" style={{ marginBottom: 18 }}>
              <div className="stat-card">
                <div className="stat-label">Period</div>
                <div className="stat-value">{generationSummary.period}</div>
                <div className="stat-trend">Billing month</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Created</div>
                <div className="stat-value">{generationSummary.created_count}</div>
                <div className="stat-trend">New bills added</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Updated</div>
                <div className="stat-value">{generationSummary.updated_count}</div>
                <div className="stat-trend">Existing bills updated</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Total Meals</div>
                <div className="stat-value">{generationSummary.total_generated_meals}</div>
                <div className="stat-trend">Meals counted</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Total Amount</div>
                <div className="stat-value">
                  ₹ {Number(generationSummary.total_generated_amount || 0).toFixed(2)}
                </div>
                <div className="stat-trend">Bill collection total</div>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Total Meals</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {generationSummary.generated_users?.map((item) => (
                    <tr key={item.user_id}>
                      <td><strong>{item.user_name}</strong></td>
                      <td>{item.email}</td>
                      <td>{item.total_meals}</td>
                      <td>₹ {Number(item.total_amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="glass-card">
          <div className="search-row">
            <input
              className="input"
              placeholder="Search by user, period, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ maxWidth: 180 }}
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending approval">Pending Approval</option>
            </select>
          </div>
        </section>

        <section className="glass-card">
          <h3 className="section-title">Bills Directory</h3>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Period</th>
                  <th>Total Meals</th>
                  <th>Per Meal</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">
                      <div className="empty-state">Loading bills...</div>
                    </td>
                  </tr>
                ) : filteredBills.length ? (
                  filteredBills.map((bill) => (
                    <tr key={bill.id}>
                      <td>
                        <strong>{bill.user_name}</strong>
                      </td>
                      <td>{bill.period}</td>
                      <td>{bill.total_meals}</td>
                      <td>₹ {bill.per_meal_cost}</td>
                      <td>₹ {bill.total_amount}</td>
                      <td>
                        <span
                          className={`badge ${
                            bill.status === "Paid"
                              ? "badge-success"
                              : bill.status === "Pending Approval"
                              ? "badge-info"
                              : "badge-danger"
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td>
                        {!isAdmin && bill.status === "Unpaid" ? (
                          <button
                            className="button button-primary"
                            type="button"
                            onClick={() => openPaymentBox(bill)}
                          >
                            Pay Now
                          </button>
                        ) : bill.status === "Paid" ? (
                          <span className="badge badge-success">Paid</span>
                        ) : bill.status === "Pending Approval" ? (
                          <span className="badge badge-info">Pending Approval</span>
                        ) : (
                          <span className="badge badge-info">Admin View</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">
                      <div className="empty-state">No bills found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedBill && (
        <div
          onClick={closePaymentBox}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 580,
              background: "var(--panel-strong, #fff)",
              borderRadius: 24,
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              display: "grid",
              gap: 18,
              textAlign: "center",
            }}
          >
            <h3 className="section-title" style={{ marginBottom: 0 }}>
              Scan & Pay
            </h3>

            <p className="page-subtitle" style={{ margin: 0 }}>
              Scan this QR using Google Pay, PhonePe, Paytm, or any UPI app.
            </p>

            <div
              style={{
                padding: 16,
                borderRadius: 20,
                background: "#fff",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                margin: "0 auto",
                width: "fit-content",
              }}
            >
              <img
                src={paymentQR}
                alt="Payment QR"
                style={{
                  width: 260,
                  maxWidth: "100%",
                  borderRadius: 12,
                  display: "block",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <p><strong>User:</strong> {selectedBill.user_name}</p>
              <p><strong>Period:</strong> {selectedBill.period}</p>
              <p><strong>Amount:</strong> ₹ {selectedBill.total_amount}</p>
              <p><strong>Payment Type:</strong> UPI QR Payment</p>
            </div>

            <input
              className="input"
              placeholder="Enter transaction ID after payment"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />

            <div className="button-group" style={{ justifyContent: "center" }}>
              <button
                className="button button-primary"
                type="button"
                onClick={() => payBill(selectedBill.id)}
                disabled={paying}
              >
                {paying ? "Submitting..." : "Submit Payment"}
              </button>

              <button
                className="button button-secondary"
                type="button"
                onClick={closePaymentBox}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}