import { useEffect, useMemo, useState } from "react";
import { getData, postData, putData, deleteData } from "../services/api";

export default function Menu() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    meal_date: new Date().toISOString().slice(0, 10),
    meal_type: "breakfast",
    item_name: "",
    description: "",
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const res = await getData("/menu/");
    setItems(res);
  };

  const submitForm = async (e) => {
    e.preventDefault();

    if (editingId) {
      await putData(`/menu/${editingId}`, form);
    } else {
      await postData("/menu/", form);
    }

    setForm({
      meal_date: new Date().toISOString().slice(0, 10),
      meal_type: "breakfast",
      item_name: "",
      description: "",
    });
    setEditingId(null);
    loadItems();
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm({
      meal_date: row.meal_date,
      meal_type: row.meal_type,
      item_name: row.item_name,
      description: row.description || "",
    });
  };

  const handleDelete = async (id) => {
    await deleteData(`/menu/${id}`);
    loadItems();
  };

  const filteredItems = useMemo(() => {
    return items.filter((row) =>
      `${row.item_name} ${row.meal_type} ${row.description || ""} ${row.meal_date}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [items, search]);

  return (
    <div className="page-grid">
      <section className="glass-card">
        <h2 className="page-title">Menu Management</h2>
        <p className="page-subtitle">
          Manage breakfast, lunch, and dinner schedules with a cleaner admin experience.
        </p>
      </section>

      <section className="content-two">
        {isAdmin && (
          <form className="glass-card form-grid" onSubmit={submitForm}>
            <h3 className="section-title">
              {editingId ? "Update Meal Item" : "Create Meal Item"}
            </h3>

            <div className="form-row">
              <input
                className="input"
                type="date"
                value={form.meal_date}
                onChange={(e) => setForm({ ...form, meal_date: e.target.value })}
              />

              <select
                className="select"
                value={form.meal_type}
                onChange={(e) => setForm({ ...form, meal_type: e.target.value })}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            <input
              className="input"
              placeholder="Meal item name"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            />

            <textarea
              className="textarea"
              placeholder="Description, special notes, weekly plan details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="button-group">
              <button className="button button-primary" type="submit">
                {editingId ? "Update Menu" : "Add Menu"}
              </button>

              {editingId && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      meal_date: new Date().toISOString().slice(0, 10),
                      meal_type: "breakfast",
                      item_name: "",
                      description: "",
                    });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <section className="glass-card form-grid">
          <h3 className="section-title">Quick Insights</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Menu Items</div>
              <div className="stat-value">{items.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Today’s Date</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="glass-card">
        <div className="search-row">
          <input
            className="input"
            placeholder="Search menu by item, type, date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="glass-card">
        <h3 className="section-title">Meal List</h3>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Item</th>
                <th>Description</th>
                {isAdmin && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((row) => (
                <tr key={row.id}>
                  <td>{row.meal_date}</td>
                  <td>
                    <span className="badge badge-info">{row.meal_type}</span>
                  </td>
                  <td><strong>{row.item_name}</strong></td>
                  <td>{row.description || "-"}</td>
                  {isAdmin && (
                    <td>
                      <div className="button-group">
                        <button
                          className="button button-secondary"
                          onClick={() => handleEdit(row)}
                        >
                          Edit
                        </button>
                        <button
                          className="button button-danger"
                          onClick={() => handleDelete(row.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {!filteredItems.length && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4}>
                    <div className="empty-state">No menu items found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}