import { useEffect, useState } from "react";
import { getData } from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await getData("/reports/summary");
      setSummary(res);
    } catch (error) {
      console.error("Failed to load reports", error);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!summary) return;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Mess Operations Report", 14, 18);

    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);

    autoTable(doc, {
      startY: 34,
      head: [["Metric", "Value"]],
      body: [
        ["Total Users", summary.total_users ?? 0],
        ["Total Expense", `₹ ${summary.total_expense ?? 0}`],
        ["Total Meals", summary.total_attendance ?? 0],
        ["Meals Today", summary.meals_today ?? 0],
        ["Pending Complaints", summary.pending_complaints ?? 0],
        ["Unpaid Bills", summary.unpaid_bills ?? 0],
        ["Low Stock Items", summary.low_stock_items ?? 0],
      ],
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["Recent Expense", "Amount", "Date"]],
      body: (summary.recent_expenses || []).map((item) => [
        item.title,
        `₹ ${item.amount}`,
        item.expense_date,
      ]),
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["Complaint Type", "Message", "Status"]],
      body: (summary.recent_complaints || []).map((item) => [
        item.type,
        item.message,
        item.status,
      ]),
    });

    doc.save("mess-operations-report.pdf");
  };

  return (
    <div className="page-grid">
      <section className="glass-card">
        <div className="hero-strip">
          <div>
            <h2 className="page-title">Reports & Analytics</h2>
            <p className="page-subtitle">
              View system summary and export a professional PDF report for admin records.
            </p>
          </div>

          <div className="button-group">
            <button className="button button-primary" onClick={exportPDF} type="button">
              Export PDF
            </button>
          </div>
        </div>
      </section>

      <section className="glass-card">
        <h3 className="section-title">Monthly Summary</h3>

        {loading ? (
          <div className="empty-state">Loading reports...</div>
        ) : summary ? (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{summary.total_users}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Expense</div>
              <div className="stat-value">₹ {summary.total_expense}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Meals</div>
              <div className="stat-value">{summary.total_attendance}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Meals Today</div>
              <div className="stat-value">{summary.meals_today}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Pending Complaints</div>
              <div className="stat-value">{summary.pending_complaints}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Unpaid Bills</div>
              <div className="stat-value">{summary.unpaid_bills}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Low Stock Items</div>
              <div className="stat-value">{summary.low_stock_items}</div>
            </div>
          </div>
        ) : (
          <div className="empty-state">No report data found.</div>
        )}
      </section>

      <section className="content-two">
        <div className="glass-card">
          <h3 className="section-title">Recent Expenses</h3>

          {summary?.recent_expenses?.length ? (
            <div className="list-stack">
              {summary.recent_expenses.map((item, index) => (
                <div key={index} className="list-item">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="muted">{item.expense_date}</div>
                  </div>
                  <div>
                    <span className="badge badge-info">₹ {item.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No recent expenses available.</div>
          )}
        </div>

        <div className="glass-card">
          <h3 className="section-title">Recent Complaints</h3>

          {summary?.recent_complaints?.length ? (
            <div className="list-stack">
              {summary.recent_complaints.map((item) => (
                <div key={item.id} className="list-item">
                  <div>
                    <strong>{item.type}</strong>
                    <div className="muted">{item.message}</div>
                  </div>
                  <div>
                    <span
                      className={`badge ${
                        item.status === "Resolved"
                          ? "badge-success"
                          : item.status === "In Progress"
                          ? "badge-warning"
                          : "badge-danger"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No complaints available.</div>
          )}
        </div>
      </section>
    </div>
  );
}