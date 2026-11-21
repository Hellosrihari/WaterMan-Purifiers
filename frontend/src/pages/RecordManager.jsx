import { useEffect, useState } from "react";

import { Icon } from "../components/Icon.jsx";
import { apiRequest } from "../services/api.js";

const managers = {
  customers: {
    title: "Customers",
    description: "Save and update your shop customer contact details.",
    endpoint: "/customers",
    singular: "customer",
    emptyLabel: "No customers added yet",
    initial: { name: "", phone: "", email: "", address: "" },
    fields: [
      { key: "name", label: "Customer name", type: "text", required: true },
      { key: "phone", label: "Phone number", type: "tel", required: true },
      { key: "email", label: "Email address", type: "email" },
      { key: "address", label: "Address", type: "textarea" },
    ],
    columns: [
      { key: "name", label: "Customer" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
    ],
  },
  inventory: {
    title: "Inventory",
    description: "Track the products in your shop and monitor stock levels.",
    endpoint: "/inventory",
    singular: "inventory item",
    emptyLabel: "No inventory items added yet",
    initial: {
      name: "",
      sku: "",
      category: "",
      quantity: "0",
      purchase_cost: "0.00",
      selling_price: "0.00",
      low_stock_threshold: "0",
    },
    numericFields: [
      "quantity",
      "purchase_cost",
      "selling_price",
      "low_stock_threshold",
    ],
    fields: [
      { key: "name", label: "Product name", type: "text", required: true },
      { key: "sku", label: "SKU / product code", type: "text", required: true },
      { key: "category", label: "Category", type: "text", required: true },
      { key: "quantity", label: "Quantity in stock", type: "number", min: 0, step: 1, required: true },
      { key: "purchase_cost", label: "Purchase cost", type: "number", min: 0, step: "0.01", required: true },
      { key: "selling_price", label: "Selling price", type: "number", min: 0, step: "0.01", required: true },
      { key: "low_stock_threshold", label: "Low-stock threshold", type: "number", min: 0, step: 1, required: true },
    ],
    columns: [
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Category" },
      { key: "quantity", label: "Stock" },
      { key: "purchase_cost", label: "Purchase cost" },
      { key: "selling_price", label: "Selling price" },
    ],
  },
  staff: {
    title: "Staff",
    description: "Manage staff details and their sign-in accounts.",
    endpoint: "/staff",
    singular: "staff member",
    emptyLabel: "No staff members added yet",
    initial: {
      name: "",
      phone: "",
      email: "",
      job_title: "",
      start_date: "",
      is_active: true,
      password: "",
    },
    fields: [
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "phone", label: "Phone number", type: "tel", required: true },
      { key: "email", label: "Login email", type: "email", required: true },
      { key: "job_title", label: "Job title", type: "text", required: true },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "password", label: "Initial password", type: "password", required: true },
      { key: "is_active", label: "Staff account is active", type: "checkbox" },
    ],
    columns: [
      { key: "name", label: "Staff member" },
      { key: "job_title", label: "Job title" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Login email" },
      { key: "is_active", label: "Status" },
    ],
  },
};

function displayValue(record, key) {
  const value = record[key];
  if (key === "quantity") {
    const low = value <= record.low_stock_threshold;
    return (
      <span className={`stock-badge${low ? " low-stock" : ""}`}>
        {value} {low ? "· Low stock" : "in stock"}
      </span>
    );
  }
  if (key === "purchase_cost" || key === "selling_price") {
    return Number(value).toFixed(2);
  }
  if (key === "is_active") {
    return (
      <span className={`status-badge${value ? " active-status" : ""}`}>
        {value ? "Active" : "Inactive"}
      </span>
    );
  }
  return value || "—";
}

export default function RecordManager({
  section,
  token,
  onUnauthorized,
  onDataChanged,
}) {
  const config = managers[section];
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(config.initial);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [staffStatusFilter, setStaffStatusFilter] = useState("all");

  const categoryOptions = [...new Set(
    records.map((record) => record.category).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
  const searchFields = section === "customers"
    ? ["name", "phone", "email", "address"]
    : section === "inventory"
      ? ["name", "sku", "category"]
      : ["name", "phone", "email", "job_title"];
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredRecords = records.filter((record) => {
    const matchesSearch = !normalizedSearch || searchFields.some((field) =>
      String(record[field] ?? "").toLowerCase().includes(normalizedSearch),
    );
    const matchesCategory = !categoryFilter || record.category === categoryFilter;
    const isLowStock = record.quantity <= record.low_stock_threshold;
    const matchesStock = section !== "inventory"
      || stockFilter === "all"
      || (stockFilter === "low" ? isLowStock : !isLowStock);
    const matchesStaffStatus = section !== "staff"
      || staffStatusFilter === "all"
      || (staffStatusFilter === "active" ? record.is_active : !record.is_active);

    return matchesSearch && matchesCategory && matchesStock && matchesStaffStatus;
  });
  const filtersAreActive = Boolean(
    normalizedSearch
    || categoryFilter
    || stockFilter !== "all"
    || staffStatusFilter !== "all",
  );

  useEffect(() => {
    let active = true;

    async function loadRecords() {
      setIsLoading(true);
      setError("");
      try {
        const data = await apiRequest(config.endpoint, { token });
        if (active) {
          setRecords(data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
          if (requestError.status === 401 || requestError.status === 403) {
            onUnauthorized(requestError);
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadRecords();
    return () => {
      active = false;
    };
  }, [config.endpoint, onUnauthorized, token]);

  function startCreate() {
    setEditingId(null);
    setForm({ ...config.initial });
    setIsFormOpen(true);
    setNotice("");
    setError("");
  }

  function startEdit(record) {
    const editableFields = Object.fromEntries(
      config.fields
        .filter((field) => field.key !== "password")
        .map((field) => [field.key, record[field.key] ?? config.initial[field.key]]),
    );
    setEditingId(record.id);
    setForm({
      ...config.initial,
      ...editableFields,
      password: "",
      start_date: record.start_date ?? "",
    });
    setIsFormOpen(true);
    setNotice("");
    setError("");
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveRecord(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);

    const payload = { ...form };
    for (const key of config.numericFields ?? []) {
      payload[key] = Number(payload[key]);
    }
    if (section === "staff" && !payload.password) {
      delete payload.password;
    }
    if (section === "staff" && !payload.start_date) {
      payload.start_date = null;
    }

    try {
      const saved = await apiRequest(
        editingId ? `${config.endpoint}/${editingId}` : config.endpoint,
        {
          token,
          method: editingId ? "PUT" : "POST",
          body: payload,
        },
      );
      setRecords((current) =>
        editingId
          ? current.map((record) => (record.id === editingId ? saved : record))
          : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNotice(`${config.singular} ${editingId ? "updated" : "added"}.`);
      setEditingId(null);
      setIsFormOpen(false);
      onDataChanged();
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 401 || requestError.status === 403) {
        onUnauthorized(requestError);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function cancelForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm({ ...config.initial });
    setError("");
  }

  function clearFilters() {
    setSearchText("");
    setCategoryFilter("");
    setStockFilter("all");
    setStaffStatusFilter("all");
  }

  return (
    <section className="manager-page">
      <header className="manager-heading">
        <div>
          <p className="eyebrow">SHOP DATA</p>
          <h1>{config.title}</h1>
          <p className="page-subtitle">{config.description}</p>
        </div>
        {!isFormOpen && (
          <button className="primary-button manager-add-button" type="button" onClick={startCreate}>
            <span aria-hidden="true">+</span> Add {config.singular}
          </button>
        )}
      </header>

      {error && <p className="error manager-message" role="alert">{error}</p>}
      {notice && <p className="notice manager-message" role="status">{notice}</p>}

      {isFormOpen && (
        <section className="record-form-card" aria-labelledby="record-form-heading">
          <div className="record-form-heading">
            <div>
              <p className="eyebrow">{editingId ? "UPDATE RECORD" : "NEW RECORD"}</p>
              <h2 id="record-form-heading">
                {editingId ? `Edit ${config.singular}` : `Add ${config.singular}`}
              </h2>
            </div>
            <button className="close-form-button" type="button" onClick={cancelForm} aria-label="Close form">
              ×
            </button>
          </div>

          <form className="record-form" onSubmit={saveRecord}>
            {config.fields.map((field) => {
              const fieldId = `${section}-${field.key}`;
              if (field.type === "checkbox") {
                return (
                  <label className="checkbox-field" htmlFor={fieldId} key={field.key}>
                    <input
                      id={fieldId}
                      type="checkbox"
                      checked={Boolean(form[field.key])}
                      onChange={(event) => updateField(field.key, event.target.checked)}
                    />
                    <span>{field.label}</span>
                  </label>
                );
              }

              const passwordIsOptional = field.key === "password" && editingId;
              const maxLengthByKey = {
                name: section === "inventory" ? 160 : 120,
                sku: 80,
                category: 100,
                phone: 30,
                email: 320,
                job_title: 100,
                password: 128,
              };
              return (
                <label className={`record-field${field.type === "textarea" ? " field-wide" : ""}`} htmlFor={fieldId} key={field.key}>
                  <span>
                    {field.label}
                    {passwordIsOptional ? " (leave blank to keep current)" : ""}
                  </span>
                  {field.type === "textarea" ? (
                    <textarea
                      id={fieldId}
                      value={form[field.key] ?? ""}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                  ) : (
                    <input
                      id={fieldId}
                      type={field.type}
                      value={form[field.key] ?? ""}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      required={Boolean(field.required && !passwordIsOptional)}
                      min={field.min}
                      step={field.step}
                      maxLength={maxLengthByKey[field.key]}
                      minLength={field.key === "password" ? 8 : undefined}
                      autoComplete={field.key === "password" ? "new-password" : undefined}
                    />
                  )}
                </label>
              );
            })}
            <div className="record-form-actions">
              <button className="secondary-button" type="button" onClick={cancelForm}>
                Cancel
              </button>
              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingId ? "Save changes" : `Add ${config.singular}`}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="records-card">
        <div className="records-toolbar">
          <div>
            <h2>{config.title} list</h2>
            <p>
              {filteredRecords.length === records.length
                ? `${records.length} ${records.length === 1 ? "record" : "records"}`
                : `${filteredRecords.length} of ${records.length} records`}
            </p>
          </div>
          <span className="section-tag">ADD & EDIT</span>
        </div>

        {!isLoading && records.length > 0 && (
          <div className="records-filters">
            <label className="records-search-field">
              <span>Search</span>
              <input
                type="search"
                aria-label={`Search ${config.title.toLowerCase()}`}
                placeholder={
                  section === "customers"
                    ? "Name, phone, email or address"
                    : section === "inventory"
                      ? "Product, SKU or category"
                      : "Name, phone, email or job title"
                }
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </label>

            {section === "inventory" && (
              <>
                <label className="record-filter-field">
                  <span>Category</span>
                  <select
                    aria-label="Filter inventory by category"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="">All categories</option>
                    {categoryOptions.map((category) => (
                      <option value={category} key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="record-filter-field">
                  <span>Stock level</span>
                  <select
                    aria-label="Filter inventory by stock level"
                    value={stockFilter}
                    onChange={(event) => setStockFilter(event.target.value)}
                  >
                    <option value="all">All stock levels</option>
                    <option value="low">At or below threshold</option>
                    <option value="above">Above threshold</option>
                  </select>
                </label>
              </>
            )}

            {section === "staff" && (
              <label className="record-filter-field">
                <span>Staff status</span>
                <select
                  aria-label="Filter staff by status"
                  value={staffStatusFilter}
                  onChange={(event) => setStaffStatusFilter(event.target.value)}
                >
                  <option value="all">All staff</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            )}

            {filtersAreActive && (
              <button className="clear-filters-button" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="records-state">Loading {config.title.toLowerCase()}...</p>
        ) : records.length === 0 ? (
          <div className="records-state empty-records">
            <span className="empty-icon"><Icon name={section === "inventory" ? "inventory" : section === "customers" ? "customers" : "staff"} /></span>
            <strong>{config.emptyLabel}</strong>
            <p>Add your first {config.singular} to get started.</p>
            {!isFormOpen && (
              <button className="text-button" type="button" onClick={startCreate}>
                Add {config.singular}
              </button>
            )}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="records-state empty-records">
            <strong>No matching {config.title.toLowerCase()} found</strong>
            <p>Try changing your search or filters.</p>
            <button className="text-button" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="records-table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  {config.columns.map((column) => <th key={column.key}>{column.label}</th>)}
                  {section === "staff" && <th>Login</th>}
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    {config.columns.map((column) => (
                      <td key={column.key}>{displayValue(record, column.key)}</td>
                    ))}
                    {section === "staff" && (
                      <td>
                        <span className="status-badge active-status">
                          {record.has_login ? "Enabled" : "No login"}
                        </span>
                      </td>
                    )}
                    <td className="record-action-cell">
                      <button className="table-edit-button" type="button" onClick={() => startEdit(record)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
