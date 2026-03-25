import { useEffect, useMemo, useState } from "react";
import { getData } from "../services/api";
import { showError } from "../utils/toast";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

function buildChartData(items = [], label = "Value") {
  return {
    labels: items.map((item) => item.label),
    datasets: [
      {
        label,
        data: items.map((item) => Number(item.value || 0)),
        borderRadius: 12,
      },
    ],
  };
}

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [summary, setSummary] = useState(null);
  const [expenseChart, setExpenseChart] = useState([]);
  const [complaintChart, setComplaintChart] = useState([]);
  const [billingChart, setBillingChart] = useState([]);
  const [attendanceChart, setAttendanceChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryRes, expenseRes, complaintRes, billingRes, attendanceRes] =
        await Promise.all([
          getData("/reports/summary"),
          getData("/reports/charts/expenses"),
          getData("/reports/charts/complaints"),
          getData("/reports/charts/billing"),
          getData("/reports/charts/attendance"),
        ]);

      setSummary(summaryRes || null);
      setExpenseChart(Array.isArray(expenseRes) ? expenseRes : []);
      setComplaintChart(Array.isArray(complaintRes) ? complaintRes : []);
      setBillingChart(Array.isArray(billingRes) ? billingRes : []);
      setAttendanceChart(Array.isArray(attendanceRes) ? attendanceRes : []);
    } catch (err) {
      console.error("Dashboard load failed", err);
      const message =
        err?.response?.data?.message || "Failed to load dashboard";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const cards = useMemo(
    () => [
      {
        label: "Total Users",
        value: summary?.total_users ?? 0,
        trend: "Live count",
      },
      {
        label: "Monthly Expense",
        value: `₹ ${Number(summary?.total_expense ?? 0).toFixed(2)}`,
        trend: "This month",
      },
      {
        label: "Meals Served Today",
        value: summary?.meals_today ?? 0,
        trend: "Today’s operations",
      },
      {
        label: "Pending Complaints",
        value: summary?.pending_complaints ?? 0,
        trend: "Needs action",
      },
      {
        label: "Unpaid Bills",
        value: summary?.unpaid_bills ?? 0,
        trend: "Awaiting payment",
      },
      {
        label: "Low Stock Items",
        value: summary?.low_stock_items ?? 0,
        trend: "Inventory alert",
      },
    ],
    [summary]
  );

  const expenseBarData = buildChartData(expenseChart, "Expense by Category");
  const complaintDoughnutData = {
    labels: complaintChart.map((item) => item.label),
    datasets: [
      {
        data: complaintChart.map((item) => Number(item.value || 0)),
      },
    ],
  };

  const billingBarData = buildChartData(billingChart, "Billing Status");
  const attendanceLineData = {
    labels: attendanceChart.map((item) => item.label),
    datasets: [
      {
        label: "Meals Analytics",
        data: attendanceChart.map((item) => Number(item.value || 0)),
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const mealBreakdown = summary?.meal_breakdown || {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  };

  const summaryCards = [
    {
      title: "Breakfast Count",
      value: mealBreakdown.breakfast || 0,
      note: "Monthly breakfast attendance",
    },
    {
      title: "Lunch Count",
      value: mealBreakdown.lunch || 0,
      note: "Monthly lunch attendance",
    },
    {
      title: "Dinner Count",
      value: mealBreakdown.dinner || 0,
      note: "Monthly dinner attendance",
    },
  ];

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
    cutout: "65%",
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
  };

  return (
    <div className="page-grid">
      <section className="glass-card">
        <div className="hero-strip">
          <div>
            <h2 className="page-title">Smart Mess Management Overview</h2>
            <p className="page-subtitle">
              Monitor billing, attendance, expenses, complaints, inventory, and
              overall mess operations from one dashboard.
            </p>
          </div>

          <div className="hero-kpis">
            <div className="kpi-pill">Role: {user?.role || "user"}</div>
            <div className="kpi-pill">System: Active</div>
            <div className="kpi-pill">Analytics: Live</div>
          </div>
        </div>
      </section>

      {error && (
        <section className="glass-card">
          <span className="badge badge-danger">{error}</span>
        </section>
      )}

      <section className="stats-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-trend">{card.trend}</div>
          </div>
        ))}
      </section>

      <section className="content-two">
        <div className="glass-card">
          <h3 className="section-title">Monthly Expense Bar Chart</h3>
          {loading ? (
            <div className="empty-state">Loading chart...</div>
          ) : expenseChart.length ? (
            <Bar data={expenseBarData} options={barOptions} />
          ) : (
            <div className="empty-state">No expense chart data available.</div>
          )}
        </div>

        <div className="glass-card">
          <h3 className="section-title">Complaint Status Doughnut Chart</h3>
          {loading ? (
            <div className="empty-state">Loading chart...</div>
          ) : complaintChart.length ? (
            <Doughnut data={complaintDoughnutData} options={doughnutOptions} />
          ) : (
            <div className="empty-state">No complaint chart data available.</div>
          )}
        </div>
      </section>

      <section className="content-two">
        <div className="glass-card">
          <h3 className="section-title">Billing Status Chart</h3>
          {loading ? (
            <div className="empty-state">Loading chart...</div>
          ) : billingChart.length ? (
            <Bar data={billingBarData} options={barOptions} />
          ) : (
            <div className="empty-state">No billing chart data available.</div>
          )}
        </div>

        <div className="glass-card">
          <h3 className="section-title">Attendance / Meals Analytics</h3>
          {loading ? (
            <div className="empty-state">Loading chart...</div>
          ) : attendanceChart.length ? (
            <Line data={attendanceLineData} options={lineOptions} />
          ) : (
            <div className="empty-state">No attendance chart data available.</div>
          )}
        </div>
      </section>

      <section className="stats-grid">
        {summaryCards.map((card) => (
          <div key={card.title} className="stat-card">
            <div className="stat-label">{card.title}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-trend">{card.note}</div>
          </div>
        ))}
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
                    <span className="badge badge-info">
                      ₹ {Number(item.amount || 0).toFixed(2)}
                    </span>
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
                    <div className="muted" style={{ marginTop: 6 }}>
                      Priority: {item.priority || "Medium"}
                    </div>
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