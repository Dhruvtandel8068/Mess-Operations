import { useEffect, useMemo, useState } from "react";
import { getData, postData } from "../services/api";
import { QRCodeCanvas } from "qrcode.react";
import { showSuccess, showError } from "../utils/toast";

export default function Billing() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const [selectedBill, setSelectedBill] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [paying, setPaying] = useState(false);

  const [generateForm, setGenerateForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    per_meal_cost: 50,
  });

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const res = await getData("/billing/");
      setBills(res || []);
    } catch (error) {
      console.error("Failed to load bills", error);
      showError(error?.response?.data?.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const generateBills = async (e) => {
    e.preventDefault();

    try {
      await postData("/billing/generate", {
        month: Number(generateForm.month),
        year: Number(generateForm.year),
        per_meal_cost: Number(generateForm.per_meal_cost),
      });

      showSuccess("Bills generated successfully");
      loadBills();
    } catch (error) {
      console.error("Failed to generate bills", error);
      showError(error?.response?.data?.message || "Failed to generate bills");
    }
  };

  const getUpiPaymentString = (bill) => {
    if (!bill) return "";

    const upiId = "dhruvtandel8068@oksbi"; // change to your real UPI ID
    const payeeName = "Mess Management";
    const amount = bill.total_amount || 0;
    const note = `Mess Bill ${bill.period}`;

    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
      payeeName
    )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
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
      loadBills();
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
  const totalAmount = bills.reduce(
    (sum, bill) => sum + Number(bill.total_amount || 0),
    0
  );

  return (
    <>
      <div className="page-grid">
        <section className="glass-card">
          <div className="hero-strip">
            <div>
              <h2 className="page-title">Billing Management</h2>
              <p className="page-subtitle">
                Generate monthly bills automatically, track payments, and let users
                pay with QR code.
              </p>
            </div>

            <div className="hero-kpis">
              <div className="kpi-pill">Total Bills: {totalBills}</div>
              <div className="kpi-pill">Paid: {paidBills}</div>
              <div className="kpi-pill">Unpaid: {unpaidBills}</div>
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

              <div className="button-group">
                <button className="button button-primary" type="submit">
                  Generate Bills
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
                <div className="stat-label">Pending Bills</div>
                <div className="stat-value">{unpaidBills}</div>
                <div className="stat-trend">Awaiting payment</div>
              </div>
            </div>
          </section>
        </section>

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
                              : "badge-danger"
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td>
                        {!isAdmin && bill.status !== "Paid" ? (
                          <button
                            className="button button-primary"
                            type="button"
                            onClick={() => openPaymentBox(bill)}
                          >
                            Pay Now
                          </button>
                        ) : bill.status === "Paid" ? (
                          <span className="badge badge-success">Paid</span>
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
              maxWidth: 560,
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
              Scan this QR code using Google Pay, PhonePe, Paytm, or any UPI app.
            </p>

            <div
              style={{
                padding: 18,
                borderRadius: 20,
                background: "#fff",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                margin: "0 auto",
                width: "fit-content",
              }}
            >
              <QRCodeCanvas
                value={getUpiPaymentString(selectedBill)}
                size={220}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <p><strong>User:</strong> {selectedBill.user_name}</p>
              <p><strong>Period:</strong> {selectedBill.period}</p>
              <p><strong>Amount:</strong> ₹ {selectedBill.total_amount}</p>
              <p><strong>UPI ID:</strong> dhruvtandel8068@oksbi</p>
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