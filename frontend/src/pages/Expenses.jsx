import { useEffect, useMemo, useState } from "react";
import { getData, postData } from "../services/api";

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

const labelStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 8,
  display: "block",
};

const buttonStyle = {
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(37,99,235,0.22)",
};

export default function Expenses() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expRes, catRes] = await Promise.all([
        getData("/expenses/"),
        getData("/expenses/categories"),
      ]);
      setExpenses(Array.isArray(expRes) ? expRes : []);
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (error) {
      console.error("Failed to load expenses", error);
    } finally {
      setLoading(false);
    }
  };

  const submitExpense = async (e) => {
    e.preventDefault();

    if (!form.title || !form.category_id || !form.amount || !form.expense_date) {
      alert("Please fill all fields.");
      return;
    }

    try {
      setSaving(true);
      await postData("/expenses/", {
        ...form,
        category_id: Number(form.category_id),
        amount: Number(form.amount),
      });

      setForm({
        title: "",
        category_id: "",
        amount: "",
        expense_date: new Date().toISOString().slice(0, 10),
      });

      await loadData();
    } catch (error) {
      console.error("Failed to add expense", error);
      alert("Failed to add expense");
    } finally {
      setSaving(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesSearch = `${item.title} ${item.category_name || ""} ${item.amount || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all"
          ? true
          : String(item.category_id) === String(categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, categoryFilter]);

  const total = filteredExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const monthlyTotal = filteredExpenses
    .filter((item) => {
      if (!item.expense_date) return false;
      const d = new Date(item.expense_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const avgExpense = filteredExpenses.length ? total / filteredExpenses.length : 0;

  const getCategoryBadge = (name) => {
    const n = (name || "").toLowerCase();

    if (n.includes("vegetable")) {
      return { background: "rgba(34,197,94,0.14)", color: "#15803d" };
    }
    if (n.includes("milk")) {
      return { background: "rgba(59,130,246,0.14)", color: "#1d4ed8" };
    }
    if (n.includes("gas")) {
      return { background: "rgba(249,115,22,0.14)", color: "#c2410c" };
    }
    if (n.includes("clean")) {
      return { background: "rgba(168,85,247,0.14)", color: "#7e22ce" };
    }

    return { background: "rgba(100,116,139,0.14)", color: "#334155" };
  };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div
        style={{
          ...cardStyle,
          padding: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Expense Management
          </h2>
          <p
            style={{
              color: "#64748b",
              marginTop: 10,
              marginBottom: 0,
              fontSize: 15,
            }}
          >
            Track category-wise mess expenses with better monitoring and monthly totals.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(37,99,235,0.10)",
              color: "#2563eb",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Records: {filteredExpenses.length}
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(16,185,129,0.10)",
              color: "#059669",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Total: ₹ {total.toFixed(2)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ color: "#64748b", fontWeight: 600, marginBottom: 10 }}>
            Total Expense
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>
            ₹ {total.toFixed(2)}
          </div>
          <div style={{ color: "#10b981", marginTop: 10, fontWeight: 600 }}>
            Filtered records total
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ color: "#64748b", fontWeight: 600, marginBottom: 10 }}>
            This Month
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>
            ₹ {monthlyTotal.toFixed(2)}
          </div>
          <div style={{ color: "#10b981", marginTop: 10, fontWeight: 600 }}>
            Current month spending
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 22 }}>
          <div style={{ color: "#64748b", fontWeight: 600, marginBottom: 10 }}>
            Average Expense
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>
            ₹ {avgExpense.toFixed(2)}
          </div>
          <div style={{ color: "#10b981", marginTop: 10, fontWeight: 600 }}>
            Per entry average
          </div>
        </div>
      </div>

      {isAdmin && (
        <form
          onSubmit={submitExpense}
          style={{
            ...cardStyle,
            padding: 28,
            display: "grid",
            gap: 18,
          }}
        >
          <div>
            <h3
              style={{
                marginTop: 0,
                marginBottom: 6,
                fontSize: 22,
                color: "#0f172a",
              }}
            >
              Add Expense
            </h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Add and maintain daily mess expenses by category.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Expense Title</label>
            <input
              style={inputStyle}
              placeholder="Enter expense title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <label style={labelStyle}>Category</label>
              <select
                style={inputStyle}
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={labelStyle}>Amount</label>
              <input
                style={inputStyle}
                type="number"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Expense Date</label>
            <input
              style={inputStyle}
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            />
          </div>

          <div>
            <button type="submit" style={buttonStyle} disabled={saving}>
              {saving ? "Adding Expense..." : "Add Expense"}
            </button>
          </div>
        </form>
      )}

      <div
        style={{
          ...cardStyle,
          padding: 22,
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 22 }}>Expenses</h3>
            <p style={{ margin: "8px 0 0", color: "#64748b" }}>
              Search and review all recorded expense entries.
            </p>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(16,185,129,0.12)",
              color: "#059669",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Total: ₹ {total.toFixed(2)}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 220px",
            gap: 16,
          }}
        >
          <input
            style={inputStyle}
            placeholder="Search by title, category, amount..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={inputStyle}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "#64748b",
              border: "1px dashed #d9e2ef",
              borderRadius: 18,
            }}
          >
            Loading expenses...
          </div>
        ) : !filteredExpenses.length ? (
          <div
            style={{
              padding: 28,
              textAlign: "center",
              color: "#64748b",
              border: "1px dashed #d9e2ef",
              borderRadius: 18,
              background: "rgba(248,250,252,0.8)",
            }}
          >
            No expenses found.
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              border: "1px solid #edf2f7",
              borderRadius: 18,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
                background: "#fff",
              }}
            >
              <thead>
                <tr style={{ background: "rgba(248,250,252,0.9)" }}>
                  <th
                    align="left"
                    style={{
                      padding: "16px 18px",
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Title
                  </th>
                  <th
                    align="left"
                    style={{
                      padding: "16px 18px",
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Category
                  </th>
                  <th
                    align="left"
                    style={{
                      padding: "16px 18px",
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Amount
                  </th>
                  <th
                    align="left"
                    style={{
                      padding: "16px 18px",
                      color: "#64748b",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: "1px solid #eef2f7",
                      background: index % 2 === 0 ? "#fff" : "#fcfdff",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px 18px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {item.title}
                    </td>

                    <td style={{ padding: "16px 18px" }}>
                      <span
                        style={{
                          ...getCategoryBadge(item.category_name),
                          padding: "8px 12px",
                          borderRadius: "999px",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "inline-block",
                        }}
                      >
                        {item.category_name}
                      </span>
                    </td>

                    <td
                      style={{
                        padding: "16px 18px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      ₹ {Number(item.amount || 0).toFixed(2)}
                    </td>

                    <td style={{ padding: "16px 18px", color: "#475569" }}>
                      {item.expense_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}