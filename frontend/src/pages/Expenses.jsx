import { useEffect, useState } from "react";
import { getData, postData } from "../services/api";

const box = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  border: "1px solid #e5eaf2",
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [expRes, catRes] = await Promise.all([
      getData("/expenses/"),
      getData("/expenses/categories"),
    ]);
    setExpenses(expRes);
    setCategories(catRes);
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    await postData("/expenses/", form);
    setForm({
      title: "",
      category_id: "",
      amount: "",
      expense_date: new Date().toISOString().slice(0, 10),
    });
    loadData();
  };

  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={box}>
        <h2 style={{ marginTop: 0 }}>Expense Management</h2>
        <p style={{ color: "#64748b" }}>
          Track category-wise mess expenses with monthly total.
        </p>
      </div>

      {isAdmin && (
        <form onSubmit={submitExpense} style={{ ...box, display: "grid", gap: 12 }}>
          <h3 style={{ marginTop: 0 }}>Add Expense</h3>

          <input
            placeholder="Expense title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <select
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

          <input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <input
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
          />

          <button type="submit">Add Expense</button>
        </form>
      )}

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Expenses</h3>
        <p><strong>Total:</strong> ₹ {total.toFixed(2)}</p>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Title</th>
              <th align="left">Category</th>
              <th align="left">Amount</th>
              <th align="left">Date</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((item) => (
              <tr key={item.id}>
                <td style={{ padding: "10px 0" }}>{item.title}</td>
                <td>{item.category_name}</td>
                <td>₹ {item.amount}</td>
                <td>{item.expense_date}</td>
              </tr>
            ))}
            {!expenses.length && (
              <tr>
                <td colSpan="4">No expenses found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}