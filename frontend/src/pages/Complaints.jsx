import { useEffect, useState } from "react";
import { getData, postData, putData } from "../services/api";

const box = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  border: "1px solid #e5eaf2",
};

export default function Complaints() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    complaint_type: "Food",
    message: "",
  });

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    const res = await getData("/complaints/");
    setRows(res);
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    await postData("/complaints/", form);
    setForm({ complaint_type: "Food", message: "" });
    loadComplaints();
  };

  const changeStatus = async (id, status) => {
    await putData(`/complaints/${id}/status`, { status });
    loadComplaints();
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={box}>
        <h2 style={{ marginTop: 0 }}>Complaint Module</h2>
        <p style={{ color: "#64748b" }}>
          Students can raise complaints. Admin can update complaint status.
        </p>
      </div>

      {!isAdmin && (
        <form onSubmit={submitComplaint} style={{ ...box, display: "grid", gap: 12 }}>
          <h3 style={{ marginTop: 0 }}>Raise Complaint</h3>

          <select
            value={form.complaint_type}
            onChange={(e) => setForm({ ...form, complaint_type: e.target.value })}
          >
            <option>Food</option>
            <option>Hygiene</option>
            <option>Staff</option>
            <option>Billing</option>
            <option>Technical</option>
          </select>

          <textarea
            placeholder="Describe your complaint"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />

          <button type="submit">Submit Complaint</button>
        </form>
      )}

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Complaint List</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">User</th>
              <th align="left">Type</th>
              <th align="left">Message</th>
              <th align="left">Status</th>
              {isAdmin && <th align="left">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "10px 0" }}>{row.user_name}</td>
                <td>{row.type}</td>
                <td>{row.message}</td>
                <td>{row.status}</td>
                {isAdmin && (
                  <td>
                    <button onClick={() => changeStatus(row.id, "Open")}>Open</button>{" "}
                    <button onClick={() => changeStatus(row.id, "In Progress")}>In Progress</button>{" "}
                    <button onClick={() => changeStatus(row.id, "Resolved")}>Resolved</button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4}>No complaints found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}