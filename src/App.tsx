import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  FolderGit2,
  GraduationCap,
  LayoutDashboard,
  Leaf,
  Menu,
  Search,
  Settings2,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import { getCatalog, trackMeta } from "./content/catalog";
import {
  CORE_TRACK_IDS,
  EXTRA_TOPIC_IDS,
  TRACK_IDS,
  type TrackId,
} from "./domain/types";
import { useWorkspace, type Workspace } from "./state/useWorkspace";
import { Dashboard } from "./ui/Dashboard";
import { EmptyState } from "./ui/shared";

const Legacy = lazy(() =>
  import("./ui/Legacy").then((module) => ({ default: module.Legacy })),
);
const Roadmap = lazy(() =>
  import("./ui/Roadmap").then((module) => ({ default: module.Roadmap })),
);
const LessonPage = lazy(() =>
  import("./ui/LessonPage").then((module) => ({ default: module.LessonPage })),
);
const Projects = lazy(() =>
  import("./ui/Projects").then((module) => ({ default: module.Projects })),
);
const ProjectPage = lazy(() =>
  import("./ui/Projects").then((module) => ({ default: module.ProjectPage })),
);
const Review = lazy(() =>
  import("./ui/Review").then((module) => ({ default: module.Review })),
);
const Planner = lazy(() =>
  import("./ui/Planner").then((module) => ({ default: module.Planner })),
);
const Library = lazy(() =>
  import("./ui/Library").then((module) => ({ default: module.Library })),
);
const SearchPage = lazy(() =>
  import("./ui/Library").then((module) => ({ default: module.SearchPage })),
);
const Practice = lazy(() =>
  import("./ui/Practice").then((module) => ({ default: module.Practice })),
);
const Settings = lazy(() =>
  import("./ui/Settings").then((module) => ({ default: module.Settings })),
);
const build = import.meta.env.VITE_BUILD_SHA?.slice(0, 8) || "local";

function useRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/dashboard");
  useEffect(() => {
    const change = () => {
      setHash(window.location.hash || "#/dashboard");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const [path, search] = hash.slice(1).split("?");
  let segments: string[] = [];
  try {
    segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    segments = ["invalid"];
  }
  const parameters = new URLSearchParams(search);
  const requestedPaper = parameters.get("paper") || "all";
  return {
    hash,
    page: segments[0] || "dashboard",
    id: segments[1] || "",
    query: parameters.get("q") || "",
    paper: ["all", "CS", "DA", "VARC", "DILR", "QA"].includes(requestedPaper)
      ? requestedPaper
      : "all",
  };
}

export default function App() {
  const catalog = getCatalog();
  const workspace = useWorkspace();
  const route = useRoute();
  const [search, setSearch] = useState(route.query);
  const searchInput = useRef<HTMLInputElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const { state, notify, mutate } = workspace;
  const props = { catalog, state, mutate, notify };

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key === "/" &&
        !(
          target instanceof HTMLElement &&
          (target.matches("input, textarea, select") ||
            target.isContentEditable)
        )
      ) {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        state.settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : state.settings.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state.settings.theme]);
  useEffect(() => {
    drawer.current?.close();
    main.current?.focus({ preventScroll: true });
    document.title = `Progress | ${route.page === "path" && TRACK_IDS.includes(route.id as TrackId) ? trackMeta[route.id as TrackId].label : route.page === "dashboard" ? "Your learning workspace" : route.page.charAt(0).toUpperCase() + route.page.slice(1)}`;
  }, [route.hash, route.id, route.page]);

  let page: ReactNode;
  if (["dashboard", "home", "analytics"].includes(route.page))
    page = <Dashboard {...props} />;
  else if (route.page === "path" && TRACK_IDS.includes(route.id as TrackId))
    page = (
      <Roadmap
        key={route.id}
        {...props}
        trackId={route.id as TrackId}
        selectedPaper={route.paper}
      />
    );
  else if (route.page === "lesson")
    page = (
      <LessonPage
        key={`${state.ownerId}:${route.id}`}
        {...props}
        id={route.id}
        paper={route.paper}
      />
    );
  else if (route.page === "projects") page = <Projects {...props} />;
  else if (route.page === "project")
    page = (
      <ProjectPage
        key={`${state.ownerId}:${route.id}`}
        {...props}
        id={route.id}
      />
    );
  else if (route.page === "review") page = <Review {...props} />;
  else if (["planner", "plan", "calendar"].includes(route.page))
    page = <Planner {...props} />;
  else if (route.page === "library") page = <Library {...props} />;
  else if (route.page === "search")
    page = <SearchPage {...props} query={route.query} />;
  else if (route.page === "practice" && TRACK_IDS.includes(route.id as TrackId))
    page = (
      <Practice
        key={`${state.ownerId}:${route.id}`}
        {...props}
        trackId={route.id as TrackId}
      />
    );
  else if (["settings", "account"].includes(route.page))
    page = <Settings key={state.ownerId} workspace={workspace} />;
  else if (["legacy", "schedule", "topic", "subtopic"].includes(route.page))
    page = (
      <Suspense
        fallback={<p role="status">Loading your historical archive...</p>}
      >
        <Legacy key={state.ownerId} {...props} />
      </Suspense>
    );
  else
    page = (
      <EmptyState
        title="This page took a different path."
        action={
          <a className="button primary" href="#/dashboard">
            Back to your workspace
          </a>
        }
      >
        Your learning is safe. Use the navigation to find a current lesson or
        explore the original archive.
      </EmptyState>
    );

  const active = route.page === "path" ? `path/${route.id}` : route.page;
  const syncLabel = !workspace.user
    ? "Saved on this browser"
    : {
        local: "Account workspace",
        loading: "Loading account",
        queued: "Edits queued",
        saving: "Syncing...",
        synced:
          workspace.client?.mode === "emulator"
            ? "Emulator synced"
            : "Cloud synced",
        conflict: "Review sync conflict",
        error: "Sync needs attention",
      }[workspace.syncStatus];
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to learning content
      </a>
      <div className="app-layout">
        <Navigation active={active} workspace={workspace} />
        <div className="workspace-main">
          <header className="topbar">
            <button
              className="round-button mobile-menu"
              onClick={() => drawer.current?.showModal()}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <form
              className="topbar-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                window.location.hash = `/search?q=${encodeURIComponent(search.trim())}`;
              }}
            >
              <Search size={17} />
              <label className="sr-only" htmlFor="global-search">
                Search your learning workspace
              </label>
              <input
                ref={searchInput}
                id="global-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a topic, lesson or project..."
                autoComplete="off"
              />
              <kbd>/</kbd>
            </form>
            <div className="topbar-actions">
              <a
                className={`sync-indicator ${workspace.syncStatus === "error" ? "error" : ""}`}
                href="#/settings"
              >
                <i />
                {syncLabel}
              </a>
              <a className="button secondary small" href="#/settings">
                {workspace.user ? "My account" : "Sign in to sync"}
                <ArrowUpRight size={14} />
              </a>
            </div>
          </header>
          <main
            className="main-content"
            id="main-content"
            ref={main}
            tabIndex={-1}
          >
            {workspace.error && (
              <div className="notice error" role="alert">
                <div>
                  <strong>Something needs your attention.</strong>
                  <p>{workspace.error}</p>
                  <div className="button-row">
                    {workspace.user && (
                      <button
                        className="button secondary small"
                        onClick={() => {
                          void workspace.retrySync();
                        }}
                      >
                        Retry sync
                      </button>
                    )}
                    {workspace.conflicts.length > 0 && (
                      <a className="button secondary small" href="#/settings">
                        Compare conflicting versions
                      </a>
                    )}
                    <button
                      className="text-button"
                      onClick={() => workspace.setError("")}
                    >
                      Dismiss message
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!workspace.ready && (
              <p role="status" className="notice info">
                Opening your account's private workspace. Learning edits are
                paused until the account load finishes.
              </p>
            )}
            <div key={state.ownerId}>
              <Suspense
                fallback={
                  <p className="notice info" role="status">
                    Opening your learning space...
                  </p>
                }
              >
                {page}
              </Suspense>
            </div>
            <footer className="footer">
              <span>
                Built for steady learning. No shortcuts, no invented progress.
              </span>
              <span>
                Curriculum {catalog.version} · Build {build}
              </span>
            </footer>
          </main>
        </div>
      </div>
      <dialog
        className="mobile-drawer"
        ref={drawer}
        aria-label="Learning navigation"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <button
          className="drawer-close"
          aria-label="Close navigation"
          onClick={() => drawer.current?.close()}
        >
          <X size={18} />
        </button>
        <Navigation
          active={active}
          workspace={workspace}
          onNavigate={() => drawer.current?.close()}
        />
      </dialog>
      {workspace.notice && (
        <div className="toast" role="status" aria-live="polite">
          {workspace.notice}
        </div>
      )}
    </>
  );
}

function Navigation({
  active,
  workspace,
  onNavigate,
}: {
  active: string;
  workspace: Workspace;
  onNavigate?: () => void;
}) {
  const name = workspace.state.settings.displayName || "Your workspace";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const nav = (id: string, label: string, icon: ReactNode, badge?: string) => (
    <a
      className={`nav-link ${active === id ? "active" : ""}`}
      href={`#/${id}`}
      aria-current={active === id ? "page" : undefined}
      onClick={onNavigate}
      key={id}
    >
      {icon}
      <span className="nav-label">{label}</span>
      {badge && <span className="nav-count">{badge}</span>}
    </a>
  );
  return (
    <aside className="sidebar">
      <a className="brand" href="#/dashboard" onClick={onNavigate}>
        <span className="brand-mark">
          <Sprout size={23} strokeWidth={1.6} />
        </span>
        <span>
          <strong>progress</strong>
          <small>YOUR LEARNING SPACE</small>
        </span>
      </a>
      <nav aria-label="Primary navigation">
        {nav("dashboard", "My workspace", <LayoutDashboard size={17} />)}
        <p className="nav-section-label">YOUR LEARNING PATHS</p>
        {CORE_TRACK_IDS.map((id) =>
          nav(
            `path/${id}`,
            id === "foundation"
              ? "Common Foundation"
              : id === "data"
                ? "Data Engineering"
                : id === "sde"
                  ? "Software Engineering"
                  : id === "quant"
                    ? "Quant Development"
                    : id === "ai"
                      ? "Applied AI"
                      : `${id.toUpperCase()} Preparation`,
            id === "foundation" ? (
              <Sprout size={17} />
            ) : id === "gate" || id === "cat" ? (
              <GraduationCap size={17} />
            ) : (
              <span className="nav-dot" />
            ),
            id === "foundation" ? "START" : undefined,
          ),
        )}
        <p className="nav-section-label">EXTRA TOPICS</p>
        {EXTRA_TOPIC_IDS.map((id) =>
          nav(`path/${id}`, trackMeta[id].label, <span className="nav-dot" />),
        )}
        <p className="nav-section-label">PUT IT INTO PRACTICE</p>
        {nav("projects", "Project studio", <FolderGit2 size={17} />, "21")}
        {nav("review", "Review & recall", <ChartNoAxesCombined size={17} />)}
        {nav("planner", "Calendar & goals", <CalendarDays size={17} />)}
        {nav("library", "Resource library", <BookOpen size={17} />)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <Leaf size={20} />
          <strong>A little, consistently.</strong>
          <p>
            Build the foundations.
            <br />
            Make something you can explain.
          </p>
        </div>
        <nav aria-label="Workspace settings">
          {nav("settings", "Settings & data", <Settings2 size={16} />)}
        </nav>
        <a className="sidebar-profile" href="#/settings" onClick={onNavigate}>
          <span className="avatar">{initials}</span>
          <span>
            <strong>{name}</strong>
            <small>
              {workspace.user
                ? "Private cloud workspace"
                : "Guest learning workspace"}
            </small>
          </span>
          <ChevronRight size={15} />
        </a>
      </div>
    </aside>
  );
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "Learning workspace failed to render",
      error.message,
      info.componentStack,
    );
  }
  render() {
    if (this.state.error)
      return (
        <div className="boot-state">
          <section>
            <Sparkles size={27} />
            <p className="eyebrow">YOUR DATA HAS NOT BEEN RESET</p>
            <h1>The workspace could not open.</h1>
            <p>{this.state.error.message}</p>
            <p>
              Reload to retry. If browser storage is corrupt, keep a backup
              before clearing anything. A missing curriculum is never replaced
              with invented lessons.
            </p>
            <button
              className="button primary"
              onClick={() => window.location.reload()}
            >
              Reload workspace
            </button>
            <details className="section-block">
              <summary>
                <CircleHelp size={15} /> Technical detail
              </summary>
              <pre>{this.state.error.stack}</pre>
            </details>
          </section>
        </div>
      );
    return this.props.children;
  }
}
