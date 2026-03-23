import { useEffect, useState } from "react";
import { getData } from "../services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setError("");
      const res = await getData("/reports/summary");
      setSummary(res);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load dashboard");
    }
  };

  const cards = [
    {
      label: "Total Users",
      value: summary?.total_users ?? 0,
      trend: "Live count",
    },
    {
      label: "Monthly Expense",
      value: `₹ ${summary?.total_expense ?? 0}`,
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
  ];

  const expenseChartData = {
    labels: ["Monthly Expense"],
    datasets: [
      {
        label: "Expense",
        data: [summary?.total_expense ?? 0],
        borderRadius: 12,
      },
    ],
  };

  const operationsChartData = {
    labels: ["Complaints", "Unpaid Bills", "Low Stock"],
    datasets: [
      {
        label: "Operations",
        data: [
          summary?.pending_complaints ?? 0,
          summary?.unpaid_bills ?? 0,
          summary?.low_stock_items ?? 0,
        ],
        borderRadius: 10,
      },
    ],
  };

  const doughnutData = {
    labels: ["Resolved Area", "Pending Area", "Stock/Bills Risk"],
    datasets: [
      {
        data: [
          Math.max(
            1,
            (summary?.total_users ?? 0) -
              (summary?.pending_complaints ?? 0) -
              (summary?.unpaid_bills ?? 0)
          ),
          summary?.pending_complaints ?? 0,
          (summary?.unpaid_bills ?? 0) + (summary?.low_stock_items ?? 0),
        ],
      },
    ],
  };

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

  return (
    <div className="page-grid">
      <section className="glass-card">
        <div className="hero-strip">
          <div>
            <h2 className="page-title">Smart Mess Management Overview</h2>
            <p className="page-subtitle">
              Monitor billing, attendance, menu planning, complaints, inventory,
              and operational health from one central dashboard.
            </p>
          </div>

          <div className="hero-kpis">
            <div className="kpi-pill">Role: {user?.role || "user"}</div>
            <div className="kpi-pill">System: Active</div>
            <div className="kpi-pill">Module Count: 10+</div>
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
          <h3 className="section-title">Expense Analytics</h3>
          <Bar data={expenseChartData} options={barOptions} />
        </div>

        <div className="glass-card">
          <h3 className="section-title">Operations Overview</h3>
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </section>

      <section className="glass-card">
        <h3 className="section-title">Operational Status Comparison</h3>
        <Bar data={operationsChartData} options={barOptions} />
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