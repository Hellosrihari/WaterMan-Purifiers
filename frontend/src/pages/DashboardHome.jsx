import { Icon } from "../components/Icon.jsx";

const summaryCards = [
  {
    key: "inventory_items",
    label: "Inventory items",
    note: "Products",
    caption: "Products tracked in stock",
    icon: "inventory",
    color: "teal",
    section: "inventory",
  },
  {
    key: "low_stock_items",
    label: "Low-stock items",
    note: "Attention",
    caption: "Items at or below their threshold",
    icon: "inventory",
    color: "blue",
    section: "inventory",
  },
  {
    key: "customers",
    label: "Customers",
    note: "Records",
    caption: "Customer records in your shop",
    icon: "customers",
    color: "amber",
    section: "customers",
  },
  {
    key: "staff",
    label: "Staff members",
    note: "Team",
    caption: "Staff records in your shop",
    icon: "staff",
    color: "violet",
    section: "staff",
  },
];

export default function DashboardHome({
  summary,
  summaryError,
  summaryLoading,
  isOwner,
  onNavigate,
}) {
  return (
    <>
      <section className="page-heading" id="overview">
        <div>
          <p className="eyebrow">SHOP OPERATIONS</p>
          <h1>Overview</h1>
          <p className="page-subtitle">
            Keep track of stock, customers and your team.
          </p>
        </div>
        <span className="today-pill">
          <span className="today-dot" />
          {isOwner ? "Owner account" : "Staff account"}
        </span>
      </section>

      <section className="welcome-banner" aria-labelledby="welcome-heading">
        <div className="welcome-copy">
          <span className="welcome-kicker">WELCOME TO YOUR SHOP</span>
          <h2 id="welcome-heading">Your shop, all in one place.</h2>
          <p>
            Manage inventory, customer details and staff records from one
            workspace.
          </p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-ring art-ring-one" />
          <div className="art-ring art-ring-two" />
          <div className="art-drop"><Icon name="water" size={46} /></div>
          <span className="art-sparkle sparkle-one">✦</span>
          <span className="art-sparkle sparkle-two">✦</span>
        </div>
      </section>

      {summaryError && <p className="error page-error" role="alert">{summaryError}</p>}

      <section className="summary-grid" aria-label="Shop summary">
        {summaryCards
          .filter((card) => card.section !== "staff" || isOwner)
          .map((card) => (
            <button
              className="summary-card summary-card-button"
              key={card.key}
              type="button"
              onClick={() => onNavigate(card.section)}
            >
              <span className="summary-card-top">
                <span className={`summary-icon ${card.color}`}>
                  <Icon name={card.icon} />
                </span>
                <span className="summary-note">{card.note}</span>
              </span>
              <span className="summary-label">{card.label}</span>
              <span className="summary-value">
                {summaryLoading ? "…" : summary ? summary[card.key] : "—"}
              </span>
              <span className="summary-caption">{card.caption}</span>
            </button>
          ))}
      </section>

      <section className="dashboard-lower">
        <article className="activity-card">
          <div className="section-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Open a section to add or update shop records</p>
            </div>
            <span className="section-tag">SHOP DATA</span>
          </div>
          <div className="quick-actions">
            <button type="button" className="quick-action" onClick={() => onNavigate("inventory")}>
              <span className="quick-action-icon"><Icon name="inventory" /></span>
              <span><strong>Manage inventory</strong><small>Products and stock levels</small></span>
              <span className="quick-arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" className="quick-action" onClick={() => onNavigate("customers")}>
              <span className="quick-action-icon"><Icon name="customers" /></span>
              <span><strong>Manage customers</strong><small>Contact details and addresses</small></span>
              <span className="quick-arrow" aria-hidden="true">→</span>
            </button>
            {isOwner && (
              <button type="button" className="quick-action" onClick={() => onNavigate("staff")}>
                <span className="quick-action-icon"><Icon name="staff" /></span>
                <span><strong>Manage staff</strong><small>Staff records and login access</small></span>
                <span className="quick-arrow" aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </article>

        <aside className="care-card">
          <span className="care-icon"><Icon name="sparkle" size={20} /></span>
          <p className="care-kicker">INVENTORY WATCH</p>
          <h2>
            {summaryLoading
              ? "Checking stock levels…"
              : summary
                ? summary.low_stock_items > 0
                  ? `${summary.low_stock_items} item${summary.low_stock_items === 1 ? "" : "s"} need attention`
                  : "Stock levels look good."
                : "Stock overview"}
          </h2>
          <p>Low-stock products are counted from the quantities and thresholds you save.</p>
          <button
            type="button"
            className="care-link"
            onClick={() => onNavigate("inventory")}
          >
            View inventory <span aria-hidden="true">→</span>
          </button>
        </aside>
      </section>

      <footer className="dashboard-footer">
        <span>© {new Date().getFullYear()} WaterMan Shop</span>
        <span>Shop operations workspace</span>
      </footer>
    </>
  );
}
