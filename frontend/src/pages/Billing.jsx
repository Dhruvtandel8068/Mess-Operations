import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function Billing() {
  const [bills, setBills] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentFile, setPaymentFile] = useState({});
  const [paymentNote, setPaymentNote] = useState({});
  const [generating, setGenerating] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [generateMonth, setGenerateMonth] = useState(currentMonth);
  const [generateYear, setGenerateYear] = useState(currentYear);
  const [perMealCost, setPerMealCost] = useState(1000);
  const [billingType, setBillingType] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("");

  const loadBills = async () => {
    try {
      const res = await api.get("/billing/");
      setBills(res.data || []);
    } catch (error) {
      console.error("Error loading bills:", error);
      alert("Failed to load bills");
    }
  };

  const loadPendingPayments = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/billing/payments/pending");
      setPendingPayments(res.data || []);
    } catch (error) {
      console.error("Error loading pending payments:", error);
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/billing/users-list");
      setUsers(res.data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadBills(), loadPendingPayments(), loadUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateBills = async () => {
    try {
      if (billingType === "single" && !selectedUserId) {
        alert("Please select a user");
        return;
      }

      setGenerating(true);

      const payload = {
        month: Number(generateMonth),
        year: Number(generateYear),
        per_meal_cost: Number(perMealCost),
        billing_type: billingType,
      };

      if (billingType === "single") {
        payload.user_id = Number(selectedUserId);
      }

      const res = await api.post("/billing/generate", payload);
      alert(res.data.message || "Bills generated successfully");
      loadData();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to generate bills");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (billId) => {
    try {
      const response = await api.get(`/billing/${billId}/download-pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `bill_${billId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
      alert("Failed to download PDF");
    }
  };

  const handleFileChange = (billId, file) => {
    setPaymentFile((prev) => ({ ...prev, [billId]: file }));
  };

  const handleNoteChange = (billId, note) => {
    setPaymentNote((prev) => ({ ...prev, [billId]: note }));
  };

  const handlePaymentSubmit = async (billId) => {
    try {
      const formData = new FormData();
      if (paymentFile[billId]) {
        formData.append("proof", paymentFile[billId]);
      }
      formData.append("note", paymentNote[billId] || "");
      formData.append("mode", "UPI");

      await api.post(`/billing/${billId}/pay`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Payment proof submitted successfully");
      setPaymentFile((prev) => ({ ...prev, [billId]: null }));
      setPaymentNote((prev) => ({ ...prev, [billId]: "" }));
      loadData();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Payment submission failed");
    }
  };

  const approvePayment = async (paymentId) => {
    try {
      await api.put(`/billing/payments/${paymentId}/approve`, {
        admin_remark: "Payment approved",
      });
      alert("Payment approved successfully");
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to approve payment");
    }
  };

  const rejectPayment = async (paymentId) => {
    const reason = prompt("Enter rejection reason:") || "Invalid payment proof";
    try {
      await api.put(`/billing/payments/${paymentId}/reject`, {
        admin_remark: reason,
      });
      alert("Payment rejected successfully");
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to reject payment");
    }
  };

  const stats = useMemo(() => {
    const totalBills = bills.length;
    const paidBills = bills.filter((b) => b.status === "Paid").length;
    const unpaidBills = bills.filter((b) => b.status === "Unpaid").length;
    const pendingBills = bills.filter((b) => b.status === "Pending Approval").length;
    return { totalBills, paidBills, unpaidBills, pendingBills };
  }, [bills]);

  if (loading) {
    return <div style={styles.loading}>Loading billing data...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Billing Management</h2>
          <p style={styles.subtitle}>
            Manage bills, download PDF statements, and review payments.
          </p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3>Total Bills</h3>
          <p>{stats.totalBills}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Paid</h3>
          <p>{stats.paidBills}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Unpaid</h3>
          <p>{stats.unpaidBills}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Pending Approval</h3>
          <p>{stats.pendingBills}</p>
        </div>
      </div>

      {isAdmin && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Generate Monthly Bills</h3>

          <div style={styles.generateGrid}>
            <select
              value={generateMonth}
              onChange={(e) => setGenerateMonth(e.target.value)}
              style={styles.input}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={generateYear}
              onChange={(e) => setGenerateYear(e.target.value)}
              style={styles.input}
              placeholder="Year"
            />

            <input
              type="number"
              value={perMealCost}
              onChange={(e) => setPerMealCost(e.target.value)}
              style={styles.input}
              placeholder="Per meal cost"
            />

            <select
              value={billingType}
              onChange={(e) => {
                setBillingType(e.target.value);
                if (e.target.value === "all") {
                  setSelectedUserId("");
                }
              }}
              style={styles.input}
            >
              <option value="all">All Users</option>
              <option value="single">Single User</option>
            </select>

            {billingType === "single" && (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={styles.input}
              >
                <option value="">Select User</option>
                {users.map((userItem) => (
                  <option key={userItem.id} value={userItem.id}>
                    {userItem.full_name} ({userItem.email})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleGenerateBills}
              disabled={generating}
              style={styles.primaryBtn}
            >
              {generating ? "Generating..." : "Generate Bills"}
            </button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Bills</h3>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {isAdmin && <th style={styles.thLeft}>User</th>}
                <th style={styles.thLeft}>Period</th>
                <th style={styles.thCenter}>Meals</th>
                <th style={styles.thCenter}>Per Meal</th>
                <th style={styles.thCenter}>Total</th>
                <th style={styles.thCenter}>Status</th>
                <th style={styles.thCenter}>PDF</th>
                {!isAdmin && <th style={styles.thCenter}>Payment</th>}
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 8} style={styles.emptyCell}>
                    No bills found
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id}>
                    {isAdmin && <td style={styles.tdLeft}>{bill.user_name}</td>}
                    <td style={styles.tdLeft}>{bill.period}</td>
                    <td style={styles.tdCenter}>{bill.total_meals}</td>
                    <td style={styles.tdCenter}>₹{Number(bill.per_meal_cost || 0).toFixed(2)}</td>
                    <td style={styles.tdCenter}>₹{Number(bill.total_amount || 0).toFixed(2)}</td>
                    <td style={styles.tdCenter}>
                      <div style={styles.centerBox}>
                        <span
                          style={{
                            ...styles.badge,
                            ...(bill.status === "Paid"
                              ? styles.paid
                              : bill.status === "Pending Approval"
                              ? styles.pending
                              : styles.unpaid),
                          }}
                        >
                          {bill.status}
                        </span>
                      </div>
                    </td>
                    <td style={styles.tdCenter}>
                      <div style={styles.centerBox}>
                        <button
                          onClick={() => handleDownloadPdf(bill.id)}
                          style={styles.secondaryBtn}
                        >
                          Download PDF
                        </button>
                      </div>
                    </td>

                    {!isAdmin && (
                      <td style={styles.tdCenter}>
                        {bill.status === "Unpaid" ? (
                          <div style={styles.paymentBox}>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) =>
                                handleFileChange(bill.id, e.target.files?.[0] || null)
                              }
                              style={styles.fileInput}
                            />
                            <input
                              type="text"
                              placeholder="Payment note"
                              value={paymentNote[bill.id] || ""}
                              onChange={(e) => handleNoteChange(bill.id, e.target.value)}
                              style={styles.input}
                            />
                            <button
                              onClick={() => handlePaymentSubmit(bill.id)}
                              style={styles.primaryBtn}
                            >
                              Submit Payment
                            </button>
                          </div>
                        ) : (
                          <span style={styles.muted}>No action needed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Pending Payment Approvals</h3>

          {pendingPayments.length === 0 ? (
            <p style={styles.muted}>No pending payments</p>
          ) : (
            <div style={styles.pendingGrid}>
              {pendingPayments.map((payment) => (
                <div key={payment.id} style={styles.pendingCard}>
                  <h4 style={{ marginBottom: 8 }}>{payment.user_name}</h4>
                  <p><strong>Email:</strong> {payment.user_email}</p>
                  <p><strong>Period:</strong> {payment.bill?.period || "-"}</p>
                  <p><strong>Amount:</strong> ₹{Number(payment.bill?.total_amount || 0).toFixed(2)}</p>
                  <p><strong>Note:</strong> {payment.note || "-"}</p>

                  {payment.proof_url && (
                    <a
                      href={payment.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.link}
                    >
                      View Payment Proof
                    </a>
                  )}

                  <div style={styles.actionRow}>
                    <button
                      onClick={() => approvePayment(payment.id)}
                      style={styles.successBtn}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectPayment(payment.id)}
                      style={styles.dangerBtn}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: "24px",
    background: "#f8fbff",
    minHeight: "100vh",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: "6px",
    color: "#64748b",
  },
  loading: {
    padding: "30px",
    fontSize: "18px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  },
  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "16px",
    color: "#0f172a",
  },
  generateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    alignItems: "center",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    minWidth: "140px",
  },
  primaryBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "#e0f2fe",
    color: "#075985",
    border: "none",
    borderRadius: "10px",
    padding: "8px 12px",
    cursor: "pointer",
  },
  successBtn: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
  },
  dangerBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  thLeft: {
    textAlign: "left",
    padding: "12px 16px",
    color: "#0f172a",
    fontWeight: "700",
  },
  thCenter: {
    textAlign: "center",
    padding: "12px 16px",
    color: "#0f172a",
    fontWeight: "700",
  },
  tdLeft: {
    textAlign: "left",
    padding: "10px 16px",
    verticalAlign: "middle",
    color: "#0f172a",
  },
  tdCenter: {
    textAlign: "center",
    padding: "10px 16px",
    verticalAlign: "middle",
    color: "#0f172a",
  },
  centerBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCell: {
    textAlign: "center",
    padding: "20px",
    color: "#64748b",
  },
  badge: {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "52px",
  },
  paid: {
    background: "#dcfce7",
    color: "#166534",
  },
  unpaid: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  pending: {
    background: "#fef3c7",
    color: "#92400e",
  },
  paymentBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "220px",
  },
  fileInput: {
    fontSize: "13px",
  },
  muted: {
    color: "#64748b",
  },
  pendingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  pendingCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "16px",
    background: "#f8fafc",
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    marginTop: "12px",
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    display: "inline-block",
    marginTop: "8px",
  },
};