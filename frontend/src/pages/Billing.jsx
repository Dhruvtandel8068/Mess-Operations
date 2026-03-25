import { useEffect, useMemo, useState } from "react";
import { getData, postData } from "../services/api";
import { showSuccess, showError } from "../utils/toast";
import paymentQR from "../assets/payment-qr.jpeg";

function statusBadgeClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid" || value === "approved") return "badge badge-success";
  if (value === "pending approval" || value === "pending") return "badge badge-warning";
  if (value === "rejected") return "badge badge-danger";
  return "badge badge-info";
}

function openPrintWindow(title, html) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin-bottom: 6px; }
          p { margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 14px; }
          th { background: #f3f4f6; }
          .meta { margin-top: 18px; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

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
  const [proofFile, setProofFile] = useState(null);
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

    if (generateForm.billing_type === "single" && !generateForm.user_id) {
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
    setProofFile(null);
  };

  const closePaymentBox = () => {
    setSelectedBill(null);
    setTransactionId("");
    setProofFile(null);
  };

  const payBill = async (billId) => {
    if (!proofFile) {
      showError("Please upload payment screenshot/proof");
      return;
    }

    try {
      setPaying(true);

      const fd = new FormData();
      fd.append("mode", "UPI");
      fd.append("receipt_no", transactionId || `REC-${Date.now()}`);
      fd.append("note", "Paid via QR payment");
      fd.append("proof", proofFile);

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

  const downloadSingleBill = async (billId) => {
    try {
      const data = await getData(`/reports/bill-export/${billId}`);

      openPrintWindow(
        `Bill ${data.period}`,
        `
          <h1>Mess Bill</h1>
          <p><strong>User:</strong> ${data.user_name}</p>
          <p><strong>Email:</strong> ${data.user_email}</p>
          <p><strong>Month/Year:</strong> ${String(data.month).padStart(2, "0")}/${data.year}</p>
          <p><strong>Total Meals:</strong> ${data.meals}</p>
          <p><strong>Per Meal Cost:</strong> ₹ ${Number(data.per_meal_cost || 0).toFixed(2)}</p>
          <p><strong>Total Amount:</strong> ₹ ${Number(data.total_amount || 0).toFixed(2)}</p>
          <p><strong>Payment Status:</strong> ${data.payment_status}</p>
          <div class="meta"><small>Generated from Mess Operations</small></div>
        `
      );
    } catch (error) {
      console.error(error);
      showError(error?.response?.data?.message || "Failed to export bill");
    }
  };

  const exportMonthlyBills = async () => {
    try {
      const data = await getData(
        `/reports/bills-export?month=${generateForm.month}&year=${generateForm.year}`
      );

      const rows = (data.bills || [])
        .map(
          (item) => `
            <tr>
              <td>${item.user_name}</td>
              <td>${item.user_email}</td>
              <td>${item.period}</td>
              <td>${item.meals}</td>
              <td>₹ ${Number(item.per_meal_cost || 0).toFixed(2)}</td>
              <td>₹ ${Number(item.total_amount || 0).toFixed(2)}</td>
              <td>${item.payment_status}</td>
            </tr>
          `
        )
        .join("");

      openPrintWindow(
        `Monthly Bills ${data.month}/${data.year}`,
        `
          <h1>Monthly Bills Report</h1>
          <p><strong>Month:</strong> ${String(data.month).padStart(2, "0")}/${data.year}</p>
          <p><strong>Total Bills:</strong> ${data.count}</p>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Period</th>
                <th>Meals</th>
                <th>Per Meal Cost</th>
                <th>Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `
      );
    } catch (error) {
      console.error(error);
      showError(error?.response?.data?.message || "Failed to export bills");
    }
  };

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const latestPayment = bill.latest_payment || bill.payments?.[0] || null;

      const matchesSearch = `${bill.user_name || ""} ${bill.period || ""} ${bill.status || ""} ${latestPayment?.status || ""} ${latestPayment?.admin_remark || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : (bill.status || "").toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  const totalBills = bills.length;
  const paidBills = bills.filter((bill) => bill.status === "Paid").length;
  const unpaidBills = bills.filter((bill) => bill.status === "Unpaid").length;
  const pendingBills = bills.filter((bill) => bill.status === "Pending Approval").length;

  const totalAmount = bills.reduce(
    (sum, bill) => sum + Number(bill.total_amount || 0),
    0
  );

  const selectedUserName =
    generateForm.billing_type === "single"
      ? users.find((u) => Number(u.id) === Number(generateForm.user_id))?.full_name || "No user selected"
      : "All users";

  return (
    <>
      <div className="page-grid">
        <section className="glass-card">
          <div className="hero-strip">
            <div>
              <h2 className="page-title">Billing Management</h2>
              <p className="page-subtitle">
                Generate monthly bills, upload payment proof, approve payments, and export bill reports.
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

              <div className="notice-card">
                Bill will be created for: {selectedUserName}
              </div>

              <div className="button-group">
                <button className="button button-primary" type="submit">
                  {generateForm.billing_type === "single"
                    ? "Generate Selected User Bill"
                    : "Generate All Bills"}
                </button>

                <button
                  className="button button-secondary"
                  type="button"
                  onClick={exportMonthlyBills}
                >
                  Export Month Bills PDF
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

              <div className="stat-card">
                <div className="stat-label">Unpaid Bills</div>
                <div className="stat-value">{unpaidBills}</div>
                <div className="stat-trend">Awaiting payment</div>
              </div>
            </div>
          </section>
        </section>

        {generationSummary && (
          <section className="glass-card">
            <h3 className="section-title">Generation Summary</h3>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {JSON.stringify(generationSummary, null, 2)}
            </pre>
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
                  <th>Bill Status</th>
                  <th>Payment Status</th>
                  <th>Remark</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9">
                      <div className="empty-state">Loading bills...</div>
                    </td>
                  </tr>
                ) : filteredBills.length ? (
                  filteredBills.map((bill) => {
                    const latestPayment = bill.latest_payment || bill.payments?.[0] || null;

                    return (
                      <tr key={bill.id}>
                        <td>
                          <strong>{bill.user_name}</strong>
                        </td>
                        <td>{bill.period}</td>
                        <td>{bill.total_meals}</td>
                        <td>₹ {Number(bill.per_meal_cost || 0).toFixed(2)}</td>
                        <td>₹ {Number(bill.total_amount || 0).toFixed(2)}</td>
                        <td>
                          <span className={statusBadgeClass(bill.status)}>
                            {bill.status}
                          </span>
                        </td>
                        <td>
                          {latestPayment ? (
                            <span className={statusBadgeClass(latestPayment.status)}>
                              {latestPayment.status}
                            </span>
                          ) : (
                            <span className="badge badge-info">No Payment</span>
                          )}
                        </td>
                        <td>{latestPayment?.admin_remark || "-"}</td>
                        <td>
                          <div className="button-group">
                            {!isAdmin && bill.status === "Unpaid" && (
                              <button
                                className="button button-primary"
                                type="button"
                                onClick={() => openPaymentBox(bill)}
                              >
                                Pay Now
                              </button>
                            )}

                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => downloadSingleBill(bill.id)}
                            >
                              Download Bill PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9">
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
        <div className="modal-overlay" onClick={closePaymentBox}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>
              Scan & Pay
            </h3>

            <p className="page-subtitle" style={{ margin: 0 }}>
              Scan this QR using Google Pay, PhonePe, Paytm, or any UPI app.
            </p>

            <div className="qr-card">
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

            <div className="notice-card">
              Bill Amount: ₹ {Number(selectedBill.total_amount || 0).toFixed(2)}
            </div>

            <input
              className="input"
              placeholder="Transaction ID / Receipt No"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />

            <div>
              <label className="section-title" style={{ display: "block", marginBottom: 8 }}>
                Upload Payment Screenshot
              </label>
              <input
                className="input"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="button-group" style={{ justifyContent: "center" }}>
              <button
                className="button button-primary"
                type="button"
                onClick={() => payBill(selectedBill.id)}
                disabled={paying}
              >
                {paying ? "Submitting..." : "Submit Payment"}
              </button>

              <button className="button button-secondary" type="button" onClick={closePaymentBox}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}