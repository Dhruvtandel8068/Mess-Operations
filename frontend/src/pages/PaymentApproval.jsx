import { useEffect, useMemo, useState } from "react";
import { getData, putData } from "../services/api";
import { showError, showSuccess } from "../utils/toast";

const cardStyle = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: 24,
  border: "1px solid rgba(148,163,184,0.14)",
  boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid #dbe3ef",
  outline: "none",
  fontSize: 15,
  background: "#fff",
  boxSizing: "border-box",
};

const buttonBase = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
};

export default function PaymentApproval() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [remarkMap, setRemarkMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadPayments();
    }
  }, [isAdmin]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await getData("/billing/payments/pending");
      setPayments(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error("Failed to load payments", error);

      if (error?.response?.status === 403) {
        showError("Only admin can access payment approval");
        return;
      }

      showError(error?.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId) => {
    try {
      await putData(`/billing/payments/${paymentId}/approve`, {
        admin_remark: remarkMap[paymentId] || "",
      });
      showSuccess("Payment approved successfully");
      await loadPayments();
    } catch (error) {
      console.error(error);
      showError(error?.response?.data?.message || "Failed to approve payment");
    }
  };

  const handleReject = async (paymentId) => {
    try {
      await putData(`/billing/payments/${paymentId}/reject`, {
        admin_remark: remarkMap[paymentId] || "",
      });
      showSuccess("Payment rejected successfully");
      await loadPayments();
    } catch (error) {
      console.error(error);
      showError(error?.response?.data?.message || "Failed to reject payment");
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      const text = `${item.user_name || ""} ${item.user_email || ""} ${item.receipt_no || ""} ${item.status || ""}`
        .toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [payments, search]);

  if (!isAdmin) {
    return (
      <div style={{ ...cardStyle, padding: 28 }}>
        <h2 style={{ marginTop: 0, color: "#0f172a" }}>Payment Approval</h2>
        <p style={{ color: "#64748b", marginBottom: 0 }}>
          Only admin can access this module.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div style={{ ...cardStyle, padding: 28 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
          Payment Approval
        </h2>
        <p style={{ color: "#64748b", marginTop: 10, marginBottom: 0 }}>
          Review payment submissions and approve or reject user payments.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 22, display: "grid", gap: 16 }}>
        <input
          style={inputStyle}
          placeholder="Search by user, email, receipt, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div style={{ padding: 20, color: "#64748b" }}>Loading payments...</div>
        ) : !filteredPayments.length ? (
          <div style={{ padding: 20, color: "#64748b" }}>No payments found.</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {filteredPayments.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #e5eaf2",
                  borderRadius: 18,
                  padding: 18,
                  background: "#fff",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <strong>{item.user_name}</strong>
                  <span>{item.user_email}</span>
                  <span>Bill Period: {item.bill?.period || "-"}</span>
                  <span>Amount: ₹ {item.bill?.total_amount || 0}</span>
                  <span>Receipt No: {item.receipt_no || "-"}</span>
                  <span>Status: {item.status}</span>
                  {item.note ? <span>Note: {item.note}</span> : null}
                </div>

                <input
                  style={inputStyle}
                  placeholder="Admin remark"
                  value={remarkMap[item.id] || ""}
                  onChange={(e) =>
                    setRemarkMap((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    style={{
                      ...buttonBase,
                      background: "rgba(16,185,129,0.14)",
                      color: "#059669",
                    }}
                    onClick={() => handleApprove(item.id)}
                  >
                    Approve
                  </button>

                  <button
                    style={{
                      ...buttonBase,
                      background: "rgba(239,68,68,0.14)",
                      color: "#dc2626",
                    }}
                    onClick={() => handleReject(item.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}