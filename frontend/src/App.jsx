import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "./components/Icon.jsx";
import { apiRequest } from "./services/api.js";
import DashboardHome from "./pages/DashboardHome.jsx";
import RecordManager from "./pages/RecordManager.jsx";

const SESSION_STORAGE_KEY = "waterman.shop.session";

const navigationItems = [
  { id: "overview", label: "Dashboard", icon: "overview" },
  { id: "inventory", label: "Inventory", icon: "inventory" },
  { id: "customers", label: "Customers", icon: "customers" },
  { id: "staff", label: "Staff", icon: "staff", ownerOnly: true },
];

function readStoredSession() {
  const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    const stored = JSON.parse(saved);
    if (
      typeof stored.access_token === "string" &&
      typeof stored.user?.email === "string" &&
      ["owner", "staff"].includes(stored.user.role)
    ) {
      return stored;
    }
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }

  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  return null;
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(readStoredSession);
  const [authReady, setAuthReady] = useState(false);
  const [setupRequired, setSetupRequired] = useState(null);
  const [currentPage, setCurrentPage] = useState("overview");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryRefresh, setSummaryRefresh] = useState(0);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  const isRegistering = mode === "register";

  const handleUnauthorized = useCallback((requestError) => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setCurrentPage("overview");
    setError(requestError.message || "Your session has expired. Please sign in again.");
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSetupStatus() {
      try {
        const result = await apiRequest("/auth/setup-status");
        if (active) {
          setSetupRequired(result.owner_setup_required);
          if (result.owner_setup_required) {
            setMode("register");
          }
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      }
    }

    async function initializeSession() {
      if (session) {
        try {
          const user = await apiRequest("/auth/me", { token: session.access_token });
          if (active) {
            setSession((current) => current && ({ ...current, user }));
            setSetupRequired(false);
            setError("");
          }
        } catch (requestError) {
          if (active && (requestError.status === 401 || requestError.status === 403)) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            setSession(null);
            setError("Your session has expired. Please sign in again.");
            await loadSetupStatus();
          } else if (active) {
            setError(`Could not verify your saved session: ${requestError.message}`);
            setSetupRequired(false);
          }
        }
      } else {
        await loadSetupStatus();
      }
      if (active) {
        setAuthReady(true);
      }
    }

    initializeSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setSummary(null);
      return undefined;
    }

    let active = true;
    setSummaryLoading(true);
    setSummaryError("");

    apiRequest("/dashboard/summary", { token: session.access_token })
      .then((result) => {
        if (active) {
          setSummary(result);
        }
      })
      .catch((requestError) => {
        if (active) {
          setSummaryError(requestError.message);
          if (requestError.status === 401 || requestError.status === 403) {
            handleUnauthorized(requestError);
          }
        }
      })
      .finally(() => {
        if (active) {
          setSummaryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [handleUnauthorized, session?.access_token, summaryRefresh]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
        profileButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest(
        `/auth/${isRegistering ? "register" : "login"}`,
        { method: "POST", body: { email, password } },
      );

      setPassword("");
      if (isRegistering) {
        setSetupRequired(false);
        setNotice("Owner account created. You can now sign in.");
        setMode("login");
      } else {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
        setSession(data);
        setCurrentPage("overview");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the server.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setIsProfileMenuOpen(false);
    setCurrentPage("overview");
    setMode("login");
    setPassword("");
    setNotice("");
    setError("");
  }

  if (!authReady) {
    return (
      <main className="auth-page">
        <p className="auth-loading">Loading your shop workspace...</p>
      </main>
    );
  }

  const isOwner = session?.user?.role === "owner";

  const profileTitle = isOwner
    ? "Owner"
    : session?.user?.job_title || "Staff";
  const visibleNavigationItems = navigationItems.filter(
    (item) => !item.ownerOnly || isOwner,
  );

  if (session) {
    return (
      <div className="dashboard-shell">
        <aside className="sidebar">
          <a className="sidebar-brand" href="#overview" aria-label="WaterMan home">
            <span className="brand-mark" aria-hidden="true">
              <Icon name="water" size={24} />
            </span>
            <span className="brand-copy">
              <strong>WaterMan</strong>
              <small>SHOP MANAGEMENT</small>
            </span>
          </a>

          <p className="sidebar-label">Shop operations</p>
          <nav className="sidebar-nav" aria-label="Main navigation">
            {visibleNavigationItems.map((item) => (
              <button
                className={`nav-link${currentPage === item.id ? " active" : ""}`}
                type="button"
                key={item.id}
                aria-current={currentPage === item.id ? "page" : undefined}
                onClick={() => setCurrentPage(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-help">
              <span className="help-icon"><Icon name="sparkle" size={18} /></span>
              <strong>Shop workspace</strong>
              <p>Keep products, customers and daily activity organized.</p>
            </div>
            <div className="sidebar-version">WATERMAN SHOP <span>•</span> 1.0</div>
          </div>
        </aside>

        <div className="dashboard-column">
          <header className="topbar">
            <div className="topbar-context">
              <span className="context-dot" />
              <span>Shop management</span>
            </div>
            <div className="topbar-actions">
              <span className="icon-button notification-button" aria-hidden="true">
                <Icon name="bell" />
              </span>
              <div className="profile-menu" ref={profileMenuRef}>
                <button
                  className="profile-trigger"
                  type="button"
                  ref={profileButtonRef}
                  aria-label={`Profile menu for ${profileTitle}, ${session.user.email}`}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  onClick={() => setIsProfileMenuOpen((open) => !open)}
                >
                  <span className="avatar">{session.user.email.charAt(0).toUpperCase()}</span>
                  <span className="profile-identity">
                    <strong title={profileTitle}>{profileTitle}</strong>
                    <small title={session.user.email}>{session.user.email.slice(0, 10)}</small>
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
                {isProfileMenuOpen && (
                  <div className="profile-dropdown" role="menu">
                    <div className="dropdown-user">
                      <span className="avatar avatar-small">
                        {session.user.email.charAt(0).toUpperCase()}
                      </span>
                      <span className="dropdown-user-copy">
                        <strong>{isOwner ? "Shop owner" : session.user.job_title || "Staff account"}</strong>
                        <small>{session.user.email}</small>
                      </span>
                    </div>
                    <div className="dropdown-divider" />
                    <button className="logout-button" type="button" role="menuitem" onClick={handleLogout}>
                      <Icon name="logout" size={18} />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="dashboard-content">
            {error && <p className="error page-error" role="alert">{error}</p>}
            {currentPage === "overview" ? (
              <DashboardHome
                summary={summary}
                summaryError={summaryError}
                summaryLoading={summaryLoading}
                isOwner={isOwner}
                onNavigate={setCurrentPage}
              />
            ) : (
              <RecordManager
                key={currentPage}
                section={currentPage}
                token={session.access_token}
                onUnauthorized={handleUnauthorized}
                onDataChanged={() => setSummaryRefresh((value) => value + 1)}
              />
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="brand-mark" aria-hidden="true">W</div>
        <p className="eyebrow">WaterMan Shop</p>
        <h1 id="auth-heading">
          {isRegistering ? "Set up your shop" : "Shop sign in"}
        </h1>
        <p className="supporting-text">
          {isRegistering
            ? "Create the owner account to get started. You can add staff logins from the Staff section."
            : "Sign in to manage your shop records."}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            placeholder={isRegistering ? "At least 8 characters" : "Your password"}
            minLength={isRegistering ? 8 : undefined}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {isRegistering && (
            <p className="setup-note">
              This first account will be the shop owner account.
            </p>
          )}
          {notice && <p className="notice" role="status">{notice}</p>}
          {error && <p className="error" role="alert">{error}</p>}

          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting || (isRegistering && setupRequired !== true)}
          >
            {isSubmitting
              ? "Please wait..."
              : isRegistering
                ? "Create owner account"
                : "Sign in"}
          </button>
        </form>

        {!isRegistering && (
          <p className="switch-mode">
            Staff accounts are created by the shop owner.
          </p>
        )}
      </section>
    </main>
  );
}
