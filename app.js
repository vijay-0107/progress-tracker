import {
  getCloudState,
  initCloudSync,
  loadCloudProfile,
  saveCloudProfile,
  signInOrCreateCloudAccount,
  signOutCloudAccount,
  stopCloudWatch,
  watchCloudProfile,
} from "./cloud-sync.js";

const LEGACY_COMPLETION_KEY = "progress-tracker-completion-v1";
const LEGACY_NOTES_KEY = "progress-tracker-notes-v1";
const USERS_KEY = "progress-tracker-users-v1";
const ACTIVE_USER_KEY = "progress-tracker-active-user-v1";
const DEFAULT_WEEKDAY_TARGET = 1;
const DEFAULT_WEEKEND_TARGET = 4;
const CALENDAR_WINDOW_DAYS = 42;

const SCHEDULES = [
  {
    id: "career",
    title: "Career Study Plan",
    shortTitle: "Career",
    subtitle: "Software, DSA, full stack, quant, and trading mastery",
    accent: "#1f6f68",
  },
  {
    id: "cat",
    title: "CAT 2026 Prep",
    shortTitle: "CAT",
    subtitle: "QA, VARC, DILR, mock analysis, and final revision",
    accent: "#d77a32",
  },
];

const state = {
  data: null,
  users: readJson(USERS_KEY),
  user: null,
  completions: {},
  notes: {},
  review: {},
  query: "",
  incompleteOnly: false,
  focusFilter: "all",
  activeDayId: null,
  cloud: getCloudState(),
};

let cloudSaveTimer = null;

const nodes = {
  app: document.getElementById("app"),
  generatedLabel: document.getElementById("generatedLabel"),
  overallPercent: document.getElementById("overallPercent"),
  overallSubtitle: document.getElementById("overallSubtitle"),
  overallBar: document.getElementById("overallBar"),
  totalTopics: document.getElementById("totalTopics"),
  completedDays: document.getElementById("completedDays"),
  remainingDays: document.getElementById("remainingDays"),
  accountButton: document.getElementById("accountButton"),
  drawerAccount: document.getElementById("drawerAccount"),
  exportProgress: document.getElementById("exportProgress"),
  drawerExport: document.getElementById("drawerExport"),
  jumpNext: document.getElementById("jumpNext"),
  drawerJumpNext: document.getElementById("drawerJumpNext"),
  openNav: document.getElementById("openNav"),
  closeNav: document.getElementById("closeNav"),
  mobileDrawer: document.getElementById("mobileDrawer"),
  dayModal: document.getElementById("dayModal"),
  modalContent: document.getElementById("modalContent"),
  closeModal: document.getElementById("closeModal"),
  toast: document.getElementById("toast"),
};

init();

async function init() {
  bindEvents();
  await initializeCloudSync();
  if (!state.user) {
    state.user = getActiveUser();
    if (state.user) {
      loadUserProgress();
    }
  }

  try {
    const response = await fetch("schedule-data.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load schedule-data.json (${response.status})`);
    }
    state.data = await response.json();
    if (!location.hash) {
      location.hash = "#/home";
    }
    render();
  } catch (error) {
    nodes.generatedLabel.textContent = "No data loaded";
    nodes.app.innerHTML = `
      <section class="empty-state">
        <p class="eyebrow">Data issue</p>
        <h1>Tracker data is missing</h1>
        <p>${escapeHtml(error.message)}. Run <strong>python generate_tracker_data.py</strong> in this folder and refresh.</p>
      </section>
    `;
  }
}

async function initializeCloudSync() {
  state.cloud = await initCloudSync(async (firebaseUser) => {
    state.cloud = getCloudState();
    if (!firebaseUser) {
      if (state.user?.cloudUid) {
        state.user = null;
        state.completions = {};
        state.notes = {};
        state.review = {};
        localStorage.removeItem(ACTIVE_USER_KEY);
      }
      if (state.data) {
        render();
      }
      return;
    }

    await loadCloudUser(firebaseUser, true);
    if (state.data) {
      render();
    }
  });
}

async function loadCloudUser(firebaseUser, migrateLocalProgress = false) {
  let cloudData = await loadCloudProfile(firebaseUser);
  if (migrateLocalProgress) {
    cloudData = await mergeLocalProfileIntoCloud(firebaseUser, cloudData);
  }
  applyCloudData(cloudData);
  watchCloudProfile(firebaseUser, (nextData) => {
    if (!state.user || state.user.cloudUid !== nextData.profile.cloudUid) {
      return;
    }
    applyCloudData(nextData);
    if (state.data) {
      render();
    }
  });
}

async function mergeLocalProfileIntoCloud(firebaseUser, cloudData) {
  const localId = createProfileId(firebaseUser.email || "");
  const localCompletions = readJson(`progress-tracker-user-${localId}-completions-v1`);
  const localNotes = readJson(`progress-tracker-user-${localId}-notes-v1`);
  const localReview = readJson(`progress-tracker-user-${localId}-review-v1`);
  const shouldImport = !Object.keys(cloudData.completions).length && !Object.keys(cloudData.notes).length && !Object.keys(cloudData.review).length;

  if (!shouldImport || (!Object.keys(localCompletions).length && !Object.keys(localNotes).length && !Object.keys(localReview).length)) {
    return cloudData;
  }

  const merged = {
    ...cloudData,
    completions: localCompletions,
    notes: localNotes,
    review: localReview,
  };
  await saveCloudProfile(merged);
  showToast("Local progress imported to cloud");
  return merged;
}

function applyCloudData(cloudData) {
  state.user = cloudData.profile;
  const profileChanged = ensurePlanningDefaults();
  state.users[state.user.id] = state.user;
  saveUsers();
  localStorage.setItem(ACTIVE_USER_KEY, state.user.id);
  state.completions = cloudData.completions || {};
  state.notes = cloudData.notes || {};
  state.review = cloudData.review || {};
  persistLocalProgressOnly();
  state.cloud = getCloudState();
  updateAuthUi();
  if (profileChanged && state.user?.cloudUid) {
    queueCloudSave();
  }
}

function queueCloudSave() {
  if (!state.user?.cloudUid || !state.cloud.configured) {
    return;
  }
  window.clearTimeout(cloudSaveTimer);
  state.cloud.syncState = "saving";
  updateAuthUi();
  cloudSaveTimer = window.setTimeout(async () => {
    try {
      await saveCloudProfile(getCloudPayload());
      state.cloud.syncState = "synced";
      updateAuthUi();
    } catch (error) {
      state.cloud.syncState = "offline";
      showToast(error.message || "Cloud sync failed");
      updateAuthUi();
    }
  }, 350);
}

function getCloudPayload() {
  return {
    profile: {
      id: state.user.id,
      cloudUid: state.user.cloudUid,
      name: state.user.name,
      email: state.user.email,
      dailyTarget: getWeekdayTarget(),
      weekdayTarget: getWeekdayTarget(),
      weekendTarget: getWeekendTarget(),
      planStartDate: getPlanStartDate(),
      createdAt: state.user.createdAt,
      updatedAt: new Date().toISOString(),
    },
    completions: state.completions,
    notes: state.notes,
    review: state.review,
  };
}

function bindEvents() {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  window.addEventListener("hashchange", () => {
    closeDrawer();
    closeModal();
    render();
  });

  window.addEventListener("popstate", () => {
    closeDrawer();
    closeModal();
    render();
  });

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest('a[href^="#/"]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigateTo(anchor.getAttribute("href"));
  });

  nodes.openNav.addEventListener("click", openDrawer);
  nodes.closeNav.addEventListener("click", closeDrawer);
  nodes.mobileDrawer.addEventListener("click", (event) => {
    if (event.target === nodes.mobileDrawer) {
      closeDrawer();
    }
  });

  nodes.app.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-day-id]");
    if (dayButton && !event.target.closest("input, textarea, a, button[data-action]")) {
      openDayModal(dayButton.dataset.dayId);
      return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }

    handlePageAction(action);
  });

  nodes.app.addEventListener("submit", (event) => {
    const authForm = event.target.closest("[data-auth-form]");
    if (authForm) {
      event.preventDefault();
      handleAuthSubmit(authForm);
      return;
    }

    const profileForm = event.target.closest("[data-profile-form]");
    if (profileForm) {
      event.preventDefault();
      handleProfileSubmit(profileForm);
    }
  });

  nodes.app.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-day-check]");
    if (!checkbox) {
      return;
    }
    setDayCompletion(checkbox.dataset.dayCheck, checkbox.checked);
    render();
  });

  nodes.app.addEventListener("input", (event) => {
    const search = event.target.closest("[data-search]");
    if (search) {
      state.query = search.value.trim().toLowerCase();
      renderRoute(false);
      return;
    }

    const incomplete = event.target.closest("[data-incomplete-only]");
    if (incomplete) {
      state.incompleteOnly = incomplete.checked;
      renderRoute(false);
    }
  });

  nodes.app.addEventListener("change", (event) => {
    const focusFilter = event.target.closest("[data-focus-filter]");
    if (focusFilter) {
      state.focusFilter = focusFilter.value;
      renderRoute(false);
    }
  });

  nodes.closeModal.addEventListener("click", closeModal);
  nodes.dayModal.addEventListener("click", (event) => {
    if (event.target === nodes.dayModal) {
      closeModal();
      return;
    }

    const action = event.target.closest("[data-action]");
    if (action) {
      handlePageAction(action);
    }
  });

  nodes.dayModal.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-modal-day-check]");
    if (!checkbox) {
      return;
    }
    setDayCompletion(checkbox.dataset.modalDayCheck, checkbox.checked);
    renderSummary();
    renderRoute(false);
    refreshModal();
    return;
  });

  nodes.dayModal.addEventListener("change", (event) => {
    const reviewInput = event.target.closest("[data-review-field]");
    if (!reviewInput || !state.activeDayId) {
      return;
    }
    updateReview(state.activeDayId, { [reviewInput.dataset.reviewField]: reviewInput.value });
    renderRoute(false);
    refreshModal();
  });

  nodes.dayModal.addEventListener("input", (event) => {
    const note = event.target.closest("[data-note-id]");
    if (!note) {
      return;
    }
    saveNote(note.dataset.noteId, note.value);
  });

  nodes.exportProgress.addEventListener("click", exportProgress);
  nodes.drawerExport.addEventListener("click", exportProgress);
  nodes.accountButton.addEventListener("click", openAccountView);
  nodes.drawerAccount.addEventListener("click", openAccountView);
  nodes.jumpNext.addEventListener("click", jumpToNextIncomplete);
  nodes.drawerJumpNext.addEventListener("click", jumpToNextIncomplete);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeDrawer();
    }
  });
}

function navigateTo(hash) {
  closeDrawer();
  closeModal();
  if (location.hash === hash) {
    render();
    return;
  }
  history.pushState(null, "", hash);
  render();
}

function render() {
  if (!state.data) {
    return;
  }
  updateAuthUi();
  if (!state.user) {
    renderSignedOutState();
    return;
  }
  document.body.classList.remove("signed-out");
  renderSummary();
  renderRoute(true);
  updateNavState();
}

function renderRoute(resetScroll) {
  const route = getRoute();

  if (route.view === "schedule") {
    renderSchedulePage(route.scheduleTitle);
  } else if (route.view === "topic") {
    renderTopicPage(route.topicId);
  } else if (route.view === "subtopic") {
    renderSubtopicPage(route.subtopicId);
  } else if (route.view === "plan") {
    renderPlanPage();
  } else if (route.view === "analytics") {
    renderAnalyticsPage();
  } else if (route.view === "calendar") {
    renderCalendarPage();
  } else if (route.view === "account") {
    renderAccountPage();
  } else {
    renderHomePage();
  }

  updateNavState();
  if (resetScroll) {
    resetPagePosition();
  }
}

function resetPagePosition() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  scrollTop();
  window.requestAnimationFrame(scrollTop);
  window.setTimeout(scrollTop, 0);
  window.setTimeout(scrollTop, 120);
}

function renderSummary() {
  const topicProgress = getTopicProgress(state.data.topics);
  const percent = topicProgress.percent;

  nodes.generatedLabel.textContent = `${state.user.name} - ${getSyncStatusLabel()} - data refreshed ${formatDateTime(state.data.generatedAt)}`;
  nodes.overallPercent.textContent = `${percent}%`;
  nodes.overallSubtitle.textContent = `${topicProgress.completed} of ${topicProgress.total} courses complete`;
  nodes.overallBar.style.width = `${percent}%`;
  nodes.totalTopics.textContent = state.data.topics.length;
  nodes.completedDays.textContent = topicProgress.completed;
  nodes.remainingDays.textContent = topicProgress.remaining;
}

function renderSignedOutState(error = "") {
  document.body.classList.add("signed-out");
  nodes.generatedLabel.textContent = "Sign in to track progress";
  nodes.overallPercent.textContent = "0%";
  nodes.overallSubtitle.textContent = "Sign in to load your progress";
  nodes.overallBar.style.width = "0%";
  nodes.totalTopics.textContent = state.data?.topics.length || 0;
  nodes.completedDays.textContent = "0";
  nodes.remainingDays.textContent = "0";
  nodes.app.innerHTML = renderAuthPanel(error);
  updateAuthUi();
}

function renderAuthPanel(error = "") {
  const isCloudMode = state.cloud.configured && !state.cloud.error;
  const profileList = Object.values(state.users)
    .filter((user) => !isCloudMode || !user.cloudUid)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((user) => `
      <button class="profile-pill" type="button" data-action="fill-profile" data-profile-name="${escapeAttr(user.name)}">
        <span>${escapeHtml(getInitials(user.name))}</span>
        ${escapeHtml(user.name)}
      </button>
    `)
    .join("");

  return `
    <section class="auth-shell">
      <form class="auth-card" data-auth-form>
        <p class="eyebrow">${isCloudMode ? "Cloud sync" : "Personal tracker"}</p>
        <h1>${isCloudMode ? "Sign in anywhere" : "Sign in"}</h1>
        <p>${isCloudMode ? "Use email/password login. Your completion, notes, review queue, and preferences sync through Firestore." : "Use a local profile so completion, notes, streaks, and exports stay separate for each user on this browser."}</p>
        ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ""}
        <label>
          <span>${isCloudMode ? "Email" : "Name or email"}</span>
          <input name="profileName" type="${isCloudMode ? "email" : "text"}" autocomplete="username" placeholder="${isCloudMode ? "vijay@example.com" : "Vijay"}" required>
        </label>
        <label>
          <span>${isCloudMode ? "Password" : "Profile PIN"}</span>
          <input name="profilePin" type="password" autocomplete="current-password" minlength="${isCloudMode ? "6" : "4"}" placeholder="${isCloudMode ? "6+ characters" : "4+ digits"}" required>
        </label>
        <button class="solid-button" type="submit">${isCloudMode ? "Continue with cloud sync" : "Continue"}</button>
        ${state.cloud.error ? `<div class="form-error">Cloud sync is configured but failed to start: ${escapeHtml(state.cloud.error)}</div>` : ""}
        ${!isCloudMode ? renderCloudSetupNotice() : ""}
        ${profileList ? `<div class="profile-list"><strong>Existing local profiles</strong><div>${profileList}</div></div>` : ""}
      </form>
      <aside class="auth-side">
        <span class="brand-mark">PT</span>
        <h2>${isCloudMode ? "Progress follows you." : "Progress is now personal."}</h2>
        <p>${isCloudMode ? "Once Firebase is configured, the same account works from laptop, phone, or any browser." : "Career and CAT completion data is loaded from the signed-in profile only."}</p>
        <div class="sync-badge ${isCloudMode ? "online" : "local"}">${isCloudMode ? "Firestore ready" : "Local storage mode"}</div>
        <div class="auth-metric"><strong>${state.data?.topics.length || 0}</strong><span>topics available after login</span></div>
      </aside>
    </section>
  `;
}

function renderCloudSetupNotice() {
  const missing = state.cloud.missingConfigFields || [];
  if (!missing.length && !state.cloud.error) {
    return "";
  }

  return `
    <section class="setup-panel">
      <strong>Cloud sync setup pending</strong>
      <p>${missing.length ? `Missing Firebase config: ${missing.map(escapeHtml).join(", ")}.` : "Firebase config exists, but initialization failed."}</p>
      <p>Add a Firebase Web App config, enable Email/Password Auth, create Firestore, and authorize <span>vijay-0107.github.io</span>.</p>
    </section>
  `;
}

function renderHomePage() {
  const allStats = progressStats(getAllSessions(state.data.topics));
  const planner = getPlannerBuckets();
  const todayTarget = getTargetForDate(new Date());
  nodes.app.innerHTML = `
    <section class="home-hero">
      <div class="hero-copy">
        <p class="eyebrow">Home</p>
        <h1>Study command center</h1>
        <p>Pick a track when you want to browse, or start from the planner when you want the next useful task without thinking about where it lives.</p>
        <div class="hero-actions">
          <button class="solid-button" type="button" data-action="start-focus">Start next task</button>
          <a class="ghost-button" href="#/plan">Open planner</a>
          <a class="solid-button" href="#/schedule/Career%20Study%20Plan">Open Career</a>
          <a class="ghost-button" href="#/schedule/CAT%202026%20Prep">Open CAT</a>
        </div>
      </div>
      <div class="hero-visual" aria-label="Overall progress visualization">
        <span>${allStats.percent}%</span>
        <div class="orbital-ring" style="--progress:${allStats.percent * 3.6}deg"></div>
        <p>${allStats.done} of ${allStats.total} days complete</p>
      </div>
    </section>
    <section class="mission-strip" aria-label="Planning summary">
      ${renderMissionMetric("Streak", getCompletionStreak(), "Days with any course completed")}
      ${renderMissionMetric("Today", `${planner.today.length}/${todayTarget}`, "Hours in current queue")}
      ${renderMissionMetric("Upcoming", planner.upcoming.length, "Next 7 days")}
      ${renderMissionMetric("Review", getReviewQueue().length, "Bookmarked or low confidence")}
    </section>
    ${renderPersonalDashboard()}
    <section class="track-grid" aria-label="Schedules">
      ${SCHEDULES.map(renderScheduleCard).join("")}
    </section>
  `;
}

function renderMissionMetric(label, value, detail) {
  return `
    <article class="mission-card">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function renderPersonalDashboard() {
  const todays = getTodayRecords();
  const target = getTargetForDate(new Date());
  const doneToday = getCompletedTodayCount();
  const streak = getCompletionStreak();
  const planItems = todays;
  const dayType = isWeekendDate(new Date()) ? "Weekend" : "Weekday";

  return `
    <section class="insight-grid" aria-label="Personal progress guidance">
      <article class="insight-card profile-card">
        <p class="eyebrow">Signed in</p>
        <div class="profile-lockup">
          <span>${escapeHtml(getInitials(state.user.name))}</span>
          <div>
            <h2>${escapeHtml(state.user.name)}</h2>
            <p>${doneToday} of ${target} planned ${formatHourLabel(target)} completed today</p>
          </div>
        </div>
        <div class="button-row">
          <a class="ghost-button" href="#/account">Profile settings</a>
          <a class="ghost-button" href="#/analytics">Analytics</a>
        </div>
      </article>
      <article class="insight-card today-card">
        <p class="eyebrow">Today</p>
        <h2>Priority queue</h2>
        <p class="muted-line">${dayType} workload: ${target} ${formatHourLabel(target)}. Extra completions pull later work forward.</p>
        <div class="today-list">
          ${planItems.length ? planItems.map(renderTodayItem).join("") : `<p class="muted-line">Everything is complete. Nice and tidy.</p>`}
        </div>
      </article>
      <article class="insight-card streak-card">
        <p class="eyebrow">Momentum</p>
        <strong>${streak}</strong>
        <span>${streak === 1 ? "day streak" : "day streak"}</span>
        <p>${getNotesCount()} saved notes across this profile.</p>
      </article>
    </section>
  `;
}

function renderTodayItem(record) {
  const done = Boolean(state.completions[record.day.id]);
  return `
    <button class="today-item${done ? " done" : ""}" type="button" data-action="open-day" data-day-id="${escapeAttr(record.day.id)}">
      <span>${escapeHtml(record.topic.shortTitle || getScheduleShortTitle(record.topic.schedule))}</span>
      <strong>${escapeHtml(record.day.title)}</strong>
      <small>${escapeHtml(record.subtopic.title)}</small>
    </button>
  `;
}

function renderAccountPage() {
  const allSessions = getAllSessions(state.data.topics);
  const stats = progressStats(allSessions);
  const notesCount = getNotesCount();
  const streak = getCompletionStreak();

  nodes.app.innerHTML = `
    ${renderBreadcrumb([{ label: "Home", href: "#/home" }, { label: "Account" }])}
    <section class="account-hero">
      <div>
        <p class="eyebrow">Profile</p>
        <h1>${escapeHtml(state.user.name)}</h1>
        <p>This profile has its own completion state, notes, rolling plan start date, weekday/weekend workload, and export file.</p>
      </div>
      ${renderProgressDial(stats)}
    </section>
    <section class="account-grid">
      <form class="account-panel" data-profile-form>
        <h2>Preferences</h2>
        <label>
          <span>Display name</span>
          <input name="displayName" type="text" value="${escapeAttr(state.user.name)}" required>
        </label>
        <label>
          <span>Weekday hours</span>
          <input name="weekdayTarget" type="number" min="1" max="12" value="${getWeekdayTarget()}" required>
        </label>
        <label>
          <span>Weekend hours</span>
          <input name="weekendTarget" type="number" min="1" max="12" value="${getWeekendTarget()}" required>
        </label>
        <p class="muted-line">Plan starts ${escapeHtml(formatDate(getPlanStartDate()))}. Your streak builds with any course completion per day and resets after 2 consecutive days without completions.</p>
        <button class="solid-button" type="submit">Save profile</button>
      </form>
      <article class="account-panel stat-panel">
        <h2>Profile stats</h2>
        <div><strong>${stats.done}</strong><span>completed days</span></div>
        <div><strong>${streak}</strong><span>current streak</span></div>
        <div><strong>${notesCount}</strong><span>saved notes</span></div>
      </article>
      <article class="account-panel sync-panel">
        <h2>Sync status</h2>
        <div class="sync-badge ${state.user.cloudUid ? "online" : "local"}">${escapeHtml(getSyncStatusLabel())}</div>
        <p>${state.user.cloudUid ? "This profile is connected to Firebase Auth and Firestore for cross-device progress sync." : "This profile is still local to this browser. Add Firebase config and sign in with email/password for anywhere sync."}</p>
      </article>
      <article class="account-panel action-panel">
        <h2>Account actions</h2>
        <a class="ghost-button full-width" href="#/plan">Open planner</a>
        <a class="ghost-button full-width" href="#/analytics">Open analytics</a>
        <a class="ghost-button full-width" href="#/calendar">Open calendar</a>
        <button class="ghost-button full-width" type="button" data-action="jump-next">Open next incomplete</button>
        <button class="ghost-button full-width" type="button" data-action="export-progress">Export this profile</button>
        <button class="solid-button full-width danger-button" type="button" data-action="sign-out">Sign out</button>
      </article>
    </section>
  `;
}

function renderScheduleCard(schedule) {
  const topics = getTopicsBySchedule(schedule.title);
  const sessions = getAllSessions(topics);
  const stats = progressStats(sessions);
  const topFocus = topics.slice(0, 4).map((topic) => topic.title).join(", ");
  return `
    <a class="track-card" href="#/schedule/${encodeRoute(schedule.title)}" style="--accent:${schedule.accent}">
      <span class="track-icon">${escapeHtml(schedule.shortTitle)}</span>
      <span class="badge">${topics.length} topics</span>
      <h2>${escapeHtml(schedule.title)}</h2>
      <p>${escapeHtml(schedule.subtitle)}</p>
      <small>${escapeHtml(topFocus)}</small>
      <div class="progress-row">
        <span>${stats.done} / ${stats.total} days</span>
        <strong>${stats.percent}%</strong>
      </div>
      <div class="meter"><span style="width:${stats.percent}%"></span></div>
    </a>
  `;
}

function renderSchedulePage(scheduleTitle) {
  const schedule = SCHEDULES.find((item) => item.title === scheduleTitle) || SCHEDULES[0];
  const topics = filterTopics(getTopicsBySchedule(schedule.title));
  const scheduleStats = progressStats(getAllSessions(getTopicsBySchedule(schedule.title)));

  nodes.app.innerHTML = `
    ${renderBreadcrumb([{ label: "Home", href: "#/home" }, { label: schedule.shortTitle }])}
    <section class="page-hero compact" style="--accent:${schedule.accent}">
      <div>
        <p class="eyebrow">${escapeHtml(schedule.shortTitle)} dashboard</p>
        <h1>${escapeHtml(schedule.title)}</h1>
        <p>${escapeHtml(schedule.subtitle)}</p>
      </div>
      ${renderProgressDial(scheduleStats)}
    </section>
    ${renderFilters("Search topics, subtopics, resources")}
    <section class="section-heading-row">
      <div>
        <p class="eyebrow">Topics</p>
        <h2>${topics.length} topics shown</h2>
      </div>
    </section>
    <section class="card-grid topic-grid">
      ${topics.length ? topics.map(renderTopicCard).join("") : renderEmpty("No topics found", "Try a different search or clear incomplete-only.")}
    </section>
  `;
}

function renderTopicCard(topic) {
  const stats = progressStats(getTopicSessions(topic));
  return `
    <a class="topic-card" href="#/topic/${encodeRoute(topic.id)}" style="--accent:${escapeAttr(topic.accent)}">
      <div class="card-topline">
        <span class="badge">${escapeHtml(topic.category)}</span>
        <strong>${stats.percent}%</strong>
      </div>
      <h3>${escapeHtml(topic.title)}</h3>
      <p>${escapeHtml(topic.description)}</p>
      <div class="topic-meta">
        <span>${topic.subtopics.length} subtopics</span>
        <span>${stats.total} days</span>
      </div>
      <div class="progress-row">
        <span>${stats.done} / ${stats.total} complete</span>
      </div>
      <div class="meter"><span style="width:${stats.percent}%"></span></div>
    </a>
  `;
}

function renderTopicPage(topicId) {
  const topic = findTopic(topicId);
  if (!topic) {
    renderMissingPage("Topic not found");
    return;
  }

  const visibleSubtopics = filterSubtopics(topic.subtopics);
  const stats = progressStats(getTopicSessions(topic));
  nodes.app.innerHTML = `
    ${renderBreadcrumb([
      { label: "Home", href: "#/home" },
      { label: getScheduleShortTitle(topic.schedule), href: `#/schedule/${encodeRoute(topic.schedule)}` },
      { label: topic.title },
    ])}
    <section class="page-hero compact" style="--accent:${escapeAttr(topic.accent)}">
      <div>
        <p class="eyebrow">Topic</p>
        <h1>${escapeHtml(topic.title)}</h1>
        <p>${escapeHtml(topic.description)}</p>
      </div>
      ${renderProgressDial(stats)}
    </section>
    <section class="quick-actions">
      <button class="solid-button" type="button" data-action="mark-topic-done" data-topic-id="${escapeAttr(topic.id)}">Mark topic done</button>
      <button class="ghost-button" type="button" data-action="clear-topic" data-topic-id="${escapeAttr(topic.id)}">Clear topic</button>
      <a class="ghost-button" href="#/schedule/${encodeRoute(topic.schedule)}">Back to topics</a>
    </section>
    ${renderFilters("Search subtopics and daily concepts")}
    <section class="section-heading-row">
      <div>
        <p class="eyebrow">Subtopics</p>
        <h2>${visibleSubtopics.length} subtopics shown</h2>
      </div>
    </section>
    <section class="card-grid subtopic-grid">
      ${visibleSubtopics.length ? visibleSubtopics.map((subtopic) => renderSubtopicCard(topic, subtopic)).join("") : renderEmpty("No subtopics found", "Try a different search or clear incomplete-only.")}
    </section>
  `;
}

function renderSubtopicCard(topic, subtopic) {
  const stats = progressStats(subtopic.sessions);
  const nextDay = subtopic.sessions.find((day) => !state.completions[day.id]) || subtopic.sessions[0];
  return `
    <a class="subtopic-card" href="#/subtopic/${encodeRoute(subtopic.id)}" style="--accent:${escapeAttr(topic.accent)}">
      <div class="card-topline">
        <span class="badge">${escapeHtml(subtopic.subtitle)}</span>
        <strong>${stats.percent}%</strong>
      </div>
      <h3>${escapeHtml(subtopic.title)}</h3>
      <p>${escapeHtml(subtopic.description)}</p>
      <div class="topic-meta">
        <span>${stats.total} days</span>
        <span>Next: ${escapeHtml(formatDate(nextDay?.date))}</span>
      </div>
      <div class="meter"><span style="width:${stats.percent}%"></span></div>
    </a>
  `;
}

function renderSubtopicPage(subtopicId) {
  const found = findSubtopic(subtopicId);
  if (!found) {
    renderMissingPage("Subtopic not found");
    return;
  }

  const { topic, subtopic } = found;
  const visibleDays = filterDays(subtopic.sessions);
  const stats = progressStats(subtopic.sessions);
  nodes.app.innerHTML = `
    ${renderBreadcrumb([
      { label: "Home", href: "#/home" },
      { label: getScheduleShortTitle(topic.schedule), href: `#/schedule/${encodeRoute(topic.schedule)}` },
      { label: topic.title, href: `#/topic/${encodeRoute(topic.id)}` },
      { label: subtopic.title },
    ])}
    <section class="page-hero compact" style="--accent:${escapeAttr(topic.accent)}">
      <div>
        <p class="eyebrow">Subtopic</p>
        <h1>${escapeHtml(subtopic.title)}</h1>
        <p>${escapeHtml(subtopic.description)}</p>
      </div>
      ${renderProgressDial(stats)}
    </section>
    <section class="quick-actions">
      <button class="solid-button" type="button" data-action="mark-subtopic-done" data-subtopic-id="${escapeAttr(subtopic.id)}">Mark subtopic done</button>
      <button class="ghost-button" type="button" data-action="clear-subtopic" data-subtopic-id="${escapeAttr(subtopic.id)}">Clear subtopic</button>
      <a class="ghost-button" href="#/topic/${encodeRoute(topic.id)}">Back to subtopics</a>
    </section>
    ${renderFilters("Search daily concepts, resources, practice")}
    <section class="section-heading-row">
      <div>
        <p class="eyebrow">Daily concepts</p>
        <h2>${visibleDays.length} days shown</h2>
      </div>
      <span class="hint-pill">Click a day to open details</span>
    </section>
    <section class="day-grid">
      ${visibleDays.length ? visibleDays.map((day) => renderDayTile(day, topic)).join("") : renderEmpty("No days found", "Try a different search or clear incomplete-only.")}
    </section>
  `;
}

function renderDayTile(day, topic) {
  const done = Boolean(state.completions[day.id]);
  const review = getDayReview(day.id);
  const reviewBadges = renderReviewBadges(day.id);
  return `
    <article class="day-tile${done ? " done" : ""}" data-day-id="${escapeAttr(day.id)}" style="--accent:${escapeAttr(topic.accent)}" tabindex="0">
      <div class="day-tile-head">
        <div>
          <span class="badge">Day ${day.dayNumber}</span>
          <span class="badge">${escapeHtml(formatDate(day.date))}</span>
        </div>
        <label class="complete-check">
          <input type="checkbox" data-day-check="${escapeAttr(day.id)}" ${done ? "checked" : ""}>
          <span>Done</span>
        </label>
      </div>
      <h3>${escapeHtml(day.title)}</h3>
      <p>${escapeHtml(day.brief)}</p>
      ${reviewBadges ? `<div class="review-badges">${reviewBadges}</div>` : ""}
      <div class="day-footer">
        <span>${escapeHtml(day.focus)}</span>
        <button class="text-button" type="button" data-day-id="${escapeAttr(day.id)}">${review.bookmarked ? "Review" : "Details"}</button>
      </div>
    </article>
  `;
}

function renderFilters(placeholder) {
  return `
    <section class="route-toolbar" aria-label="Page filters">
      <label class="search-box">
        <span>Search</span>
        <input data-search type="search" value="${escapeAttr(state.query)}" placeholder="${escapeAttr(placeholder)}">
      </label>
      <label class="toggle-row">
        <input data-incomplete-only type="checkbox" ${state.incompleteOnly ? "checked" : ""}>
        <span>Incomplete only</span>
      </label>
      <label class="select-box">
        <span>Focus</span>
        <select data-focus-filter>
          ${renderFilterOption("all", "All work")}
          ${renderFilterOption("bookmarked", "Bookmarked")}
          ${renderFilterOption("weak", "Low confidence")}
          ${renderFilterOption("difficult", "High difficulty")}
          ${renderFilterOption("unstarted", "Unstarted")}
        </select>
      </label>
    </section>
  `;
}

function renderFilterOption(value, label) {
  return `<option value="${escapeAttr(value)}" ${state.focusFilter === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderReviewBadges(dayId) {
  const review = getDayReview(dayId);
  const badges = [];
  if (review.bookmarked) {
    badges.push("Bookmarked");
  }
  if (review.confidence <= 2) {
    badges.push("Low confidence");
  }
  if (review.difficulty >= 4) {
    badges.push("Hard");
  }
  if (review.status === "review") {
    badges.push("Review");
  }
  return badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("");
}

function renderScaleOptions(selected) {
  return [1, 2, 3, 4, 5].map((value) => `<option value="${value}" ${Number(selected) === value ? "selected" : ""}>${value}</option>`).join("");
}

function renderStatusOptions(selected) {
  const options = [
    ["learning", "Learning"],
    ["review", "Needs review"],
    ["stable", "Stable"],
  ];
  return options.map(([value, label]) => `<option value="${escapeAttr(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function renderBreadcrumb(items) {
  return `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      ${items.map((item, index) => {
        const isLast = index === items.length - 1;
        if (isLast || !item.href) {
          return `<span>${escapeHtml(item.label)}</span>`;
        }
        return `<a href="${escapeAttr(item.href)}">${escapeHtml(item.label)}</a>`;
      }).join("<span>/</span>")}
    </nav>
  `;
}

function renderProgressDial(stats) {
  return `
    <div class="progress-dial" style="--progress:${stats.percent * 3.6}deg">
      <strong>${stats.percent}%</strong>
      <span>${stats.done} / ${stats.total}</span>
    </div>
  `;
}

function renderEmpty(title, message) {
  return `
    <div class="empty-state inline-empty">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderMissingPage(title) {
  nodes.app.innerHTML = `
    ${renderBreadcrumb([{ label: "Home", href: "#/home" }, { label: title }])}
    <section class="empty-state">
      <p class="eyebrow">Missing</p>
      <h1>${escapeHtml(title)}</h1>
      <p>The selected item is not available in the generated schedule data.</p>
      <a class="solid-button" href="#/home">Return home</a>
    </section>
  `;
}

function handlePageAction(action) {
  const { action: type } = action.dataset;

  if (type === "fill-profile") {
    const input = nodes.app.querySelector('input[name="profileName"]');
    const pin = nodes.app.querySelector('input[name="profilePin"]');
    if (input) {
      input.value = action.dataset.profileName || "";
      pin?.focus();
    }
    return;
  }

  if (type === "open-day") {
    openDayInContext(action.dataset.dayId);
    return;
  }

  if (type === "start-focus") {
    const next = getRecommendedRecords(1)[0] || getNextIncompleteRecord();
    if (next) {
      openDayInContext(next.day.id);
    } else {
      showToast("No open tasks found");
    }
    return;
  }

  if (type === "toggle-bookmark") {
    const dayId = action.dataset.dayId || state.activeDayId;
    if (dayId) {
      const current = getDayReview(dayId);
      updateReview(dayId, { bookmarked: !current.bookmarked });
      renderRoute(false);
      refreshModal();
      showToast(current.bookmarked ? "Bookmark removed" : "Bookmarked for review");
    }
    return;
  }

  if (type === "jump-next") {
    jumpToNextIncomplete();
    return;
  }

  if (type === "export-progress") {
    exportProgress();
    return;
  }

  if (type === "sign-out") {
    signOut();
    return;
  }

  if (type === "mark-topic-done" || type === "clear-topic") {
    const topic = findTopic(action.dataset.topicId);
    if (!topic) {
      return;
    }
    const value = type === "mark-topic-done";
    getTopicSessions(topic).forEach((day) => setDayCompletion(day.id, value, false));
    persistCompletion();
    render();
    showToast(value ? "Topic marked complete" : "Topic progress cleared");
  }

  if (type === "mark-subtopic-done" || type === "clear-subtopic") {
    const found = findSubtopic(action.dataset.subtopicId);
    if (!found) {
      return;
    }
    const value = type === "mark-subtopic-done";
    found.subtopic.sessions.forEach((day) => setDayCompletion(day.id, value, false));
    persistCompletion();
    render();
    showToast(value ? "Subtopic marked complete" : "Subtopic progress cleared");
  }
}

function openDayModal(dayId) {
  state.activeDayId = dayId;
  refreshModal();
  nodes.dayModal.hidden = false;
  document.body.classList.add("modal-open");
}

function refreshModal() {
  if (!state.activeDayId) {
    return;
  }

  const found = findDay(state.activeDayId);
  if (!found) {
    return;
  }

  const { topic, subtopic, day } = found;
  const done = Boolean(state.completions[day.id]);
  const notes = state.notes[day.id] || "";
  const links = getEnrichedLinks(day);
  const review = getDayReview(day.id);

  nodes.modalContent.innerHTML = `
    <div class="modal-kicker">
      <span class="badge">${escapeHtml(topic.schedule)}</span>
      <span class="badge">${escapeHtml(subtopic.title)}</span>
      <span class="badge">${escapeHtml(formatDate(day.date))}</span>
    </div>
    <h2 id="modalTitle">${escapeHtml(day.title)}</h2>
    <p class="modal-brief">${escapeHtml(day.brief)}</p>
    <label class="modal-complete">
      <input type="checkbox" data-modal-day-check="${escapeAttr(day.id)}" ${done ? "checked" : ""}>
      <span>Mark this day complete</span>
    </label>
    <section class="review-panel">
      <div class="review-panel-head">
        <div>
          <p class="eyebrow">Review signal</p>
          <h3>Confidence and difficulty</h3>
        </div>
        <button class="icon-text-button${review.bookmarked ? " active" : ""}" type="button" data-action="toggle-bookmark" data-day-id="${escapeAttr(day.id)}">${review.bookmarked ? "Bookmarked" : "Bookmark"}</button>
      </div>
      <div class="review-controls">
        <label>
          <span>Confidence</span>
          <select data-review-field="confidence">
            ${renderScaleOptions(review.confidence)}
          </select>
        </label>
        <label>
          <span>Difficulty</span>
          <select data-review-field="difficulty">
            ${renderScaleOptions(review.difficulty)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select data-review-field="status">
            ${renderStatusOptions(review.status)}
          </select>
        </label>
      </div>
    </section>
    <div class="detail-grid">
      ${renderDetailBox("Resource", day.resource)}
      ${renderDetailBox("Daily block", day.actionPlan)}
      ${renderDetailBox("Practice target", day.practiceTarget)}
      ${renderDetailBox("Success metric", day.successMetric)}
      ${renderDetailBox("Stretch", day.optionalStretch)}
      ${renderDetailBox("Context", day.description)}
    </div>
    <section class="resource-panel">
      <h3>Resources, tests, and references</h3>
      <div class="link-row">
        ${links.map((link) => `<a class="link-chip" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(link.type || "Link")}</span>${escapeHtml(link.label)}</a>`).join("")}
      </div>
    </section>
    <label class="note-box">
      <strong>Notes</strong>
      <textarea data-note-id="${escapeAttr(day.id)}" placeholder="Mistakes, score, questions to revisit">${escapeHtml(notes)}</textarea>
    </label>
  `;
}

function renderDetailBox(title, value) {
  return `
    <div class="detail-box">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(value || "Not specified")}</p>
    </div>
  `;
}

function closeModal() {
  nodes.dayModal.hidden = true;
  document.body.classList.remove("modal-open");
  state.activeDayId = null;
}

function openDrawer() {
  nodes.mobileDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeDrawer() {
  nodes.mobileDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
}

function jumpToNextIncomplete() {
  const route = getRoute();
  let scopeTopics = state.data.topics;
  if (route.view === "schedule") {
    scopeTopics = getTopicsBySchedule(route.scheduleTitle);
  }
  if (route.view === "topic") {
    const topic = findTopic(route.topicId);
    scopeTopics = topic ? [topic] : scopeTopics;
  }
  if (route.view === "subtopic") {
    const found = findSubtopic(route.subtopicId);
    if (found) {
      const next = found.subtopic.sessions.find((day) => !state.completions[day.id]);
      if (next) {
        openDayModal(next.id);
      } else {
        showToast("This subtopic is complete");
      }
      return;
    }
  }

  const next = getAllSessions(scopeTopics).find((day) => !state.completions[day.id]);
  if (!next) {
    showToast("Everything in this view is complete");
    return;
  }
  openDayInContext(next.id);
}

function exportProgress() {
  if (!state.user) {
    showToast("Sign in to export progress");
    return;
  }
  const payload = {
    profile: {
      id: state.user.id,
      name: state.user.name,
      dailyTarget: getWeekdayTarget(),
      weekdayTarget: getWeekdayTarget(),
      weekendTarget: getWeekendTarget(),
      planStartDate: getPlanStartDate(),
      cloudUid: state.user.cloudUid || null,
      sync: getSyncStatusLabel(),
    },
    exportedAt: new Date().toISOString(),
    sourceGeneratedAt: state.data?.generatedAt,
    completedDayIds: Object.keys(state.completions),
    notes: state.notes,
    review: state.review,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `study-progress-${state.user.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  closeDrawer();
  showToast("Progress exported");
}

function filterTopics(topics) {
  return topics.filter((topic) => {
    const sessions = getTopicSessions(topic);
    if (state.incompleteOnly && progressStats(sessions).done === sessions.length) {
      return false;
    }
    if (!sessions.some(matchesFocusFilter)) {
      return false;
    }
    if (!state.query) {
      return true;
    }
    return getTopicSearchText(topic).includes(state.query);
  });
}

function filterSubtopics(subtopics) {
  return subtopics.filter((subtopic) => {
    if (state.incompleteOnly && progressStats(subtopic.sessions).done === subtopic.sessions.length) {
      return false;
    }
    if (!subtopic.sessions.some(matchesFocusFilter)) {
      return false;
    }
    if (!state.query) {
      return true;
    }
    return getSubtopicSearchText(subtopic).includes(state.query);
  });
}

function filterDays(days) {
  return days.filter((day) => {
    if (state.incompleteOnly && state.completions[day.id]) {
      return false;
    }
    if (!matchesFocusFilter(day)) {
      return false;
    }
    if (!state.query) {
      return true;
    }
    return getDaySearchText(day).includes(state.query);
  });
}

function getRoute() {
  const parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/").map(decodeRoute);
  const [view, id] = parts;

  if (view === "schedule") {
    return { view, scheduleTitle: id || "Career Study Plan" };
  }
  if (view === "topic") {
    return { view, topicId: id };
  }
  if (view === "subtopic") {
    return { view, subtopicId: id };
  }
  if (["plan", "analytics", "calendar"].includes(view)) {
    return { view };
  }
  if (view === "account") {
    return { view };
  }
  return { view: "home" };
}

function updateNavState() {
  const route = getRoute();
  const activeKey = ["home", "plan", "analytics", "calendar"].includes(route.view)
    ? route.view
    : route.view === "schedule"
      ? route.scheduleTitle
      : getRouteSchedule(route);
  document.querySelectorAll("[data-nav]").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === activeKey);
  });
}

function getRouteSchedule(route) {
  if (route.view === "topic") {
    return findTopic(route.topicId)?.schedule;
  }
  if (route.view === "subtopic") {
    return findSubtopic(route.subtopicId)?.topic.schedule;
  }
  return "home";
}

function getTopicsBySchedule(scheduleTitle) {
  return state.data.topics.filter((topic) => topic.schedule === scheduleTitle);
}

function findTopic(topicId) {
  return state.data?.topics.find((topic) => topic.id === topicId) || null;
}

function findSubtopic(subtopicId) {
  for (const topic of state.data?.topics || []) {
    const subtopic = topic.subtopics.find((item) => item.id === subtopicId);
    if (subtopic) {
      return { topic, subtopic };
    }
  }
  return null;
}

function findDay(dayId) {
  for (const topic of state.data?.topics || []) {
    for (const subtopic of topic.subtopics) {
      const day = subtopic.sessions.find((item) => item.id === dayId);
      if (day) {
        return { topic, subtopic, day };
      }
    }
  }
  return null;
}

function getAllSessions(topics) {
  return topics.flatMap(getTopicSessions);
}

function getTopicSessions(topic) {
  return topic.subtopics.flatMap((subtopic) => subtopic.sessions);
}

function progressStats(sessions) {
  const total = sessions.length;
  const done = sessions.filter((day) => state.completions[day.id]).length;
  return { total, done, percent: percentage(done, total) };
}

function getTopicProgress(topics) {
  const total = topics.length;
  const completed = topics.filter((topic) =>
    topic.subtopics.some((subtopic) =>
      subtopic.sessions.some((session) => state.completions[session.id])
    )
  ).length;
  return { total, completed, remaining: total - completed, percent: percentage(completed, total) };
}

function getPlannerBuckets() {
  const todayIso = getLocalDateIso(new Date());
  const missed = getCalendarCells().filter((cell) => cell.date < todayIso && cell.status === "missed");
  return {
    missed,
    today: getTodayRecords(),
    upcoming: getUpcomingPlanRecords(7),
  };
}

function getRecommendedRecords(limit = 5) {
  return getTodayRecords().slice(0, limit);
}

function getPriorityScore(record) {
  const review = getDayReview(record.day.id);
  const today = getLocalDateIso(new Date());
  const date = normalizeDate(record.day.date);
  let score = 10;
  if (date && date < today) {
    score += 35;
  }
  if (date === today) {
    score += 25;
  }
  if (review.bookmarked) {
    score += 18;
  }
  score += Math.max(0, 3 - review.confidence) * 8;
  score += Math.max(0, review.difficulty - 3) * 6;
  if (review.status === "review") {
    score += 14;
  }
  return score;
}

function getReviewQueue() {
  return getDayRecords()
    .filter((record) => {
      const review = getDayReview(record.day.id);
      return review.bookmarked || review.confidence <= 2 || review.difficulty >= 4 || review.status === "review";
    })
    .sort((first, second) => getPriorityScore(second) - getPriorityScore(first));
}

function getCompletionTrend(days = 14) {
  const counts = Object.values(state.completions).reduce((accumulator, value) => {
    const date = getCompletionDate(value);
    if (date) {
      accumulator[date] = (accumulator[date] || 0) + 1;
    }
    return accumulator;
  }, {});

  return Array.from({ length: days }, (_, index) => {
    const date = getLocalDateIso(addDays(new Date(), index - days + 1));
    return {
      date,
      count: counts[date] || 0,
      label: date.slice(5).replace("-", "/"),
    };
  });
}

function getCalendarCells() {
  const today = new Date();
  const start = addDays(today, -((today.getDay() + 6) % 7));
  const todayIso = getLocalDateIso(today);
  const planStartDate = getPlanStartDate();

  return Array.from({ length: CALENDAR_WINDOW_DAYS }, (_, index) => {
    const date = getLocalDateIso(addDays(start, index));
    const target = date >= planStartDate ? getTargetForDate(date) : 0;
    const completed = getCompletionCountForDate(date);
    const records = date >= todayIso ? getPlanRecordsForDate(date) : getCompletedRecordsForDate(date);
    let status = "empty";
    if (target && date > todayIso) {
      status = "future";
    } else if (target && completed >= target) {
      status = "complete";
    } else if (target && date === todayIso) {
      status = "today-open";
    } else if (target && date < todayIso) {
      status = "missed";
    }
    return {
      date,
      completed,
      records,
      status,
      target,
    };
  });
}

function getForecastSummary() {
  const allSessions = getAllSessions(state.data.topics);
  const stats = progressStats(allSessions);
  const remaining = allSessions.length - stats.done;
  const trend = getCompletionTrend(14);
  const totalRecent = trend.reduce((sum, item) => sum + item.count, 0);
  const average = Math.max(totalRecent / 14, 0);
  const targetPace = Math.max(getDailyTarget(), average || getDailyTarget());
  const daysRemaining = remaining ? Math.ceil(remaining / targetPace) : 0;
  const finishDate = daysRemaining ? formatDate(getLocalDateIso(addDays(new Date(), daysRemaining))) : "today";
  const message = remaining
    ? `At the current target pace, the remaining ${remaining} sessions finish around ${finishDate}.`
    : "All sessions are complete for this profile.";
  return {
    averagePerDay: average.toFixed(1),
    daysRemaining,
    message,
  };
}

function getWeakTopicRecords() {
  return state.data.topics.map((topic) => {
    const sessions = getTopicSessions(topic);
    const incomplete = sessions.filter((day) => !state.completions[day.id]).length;
    const score = sessions.reduce((sum, day) => {
      const review = getDayReview(day.id);
      if (review.bookmarked) {
        sum += 3;
      }
      if (review.confidence <= 2) {
        sum += 3;
      }
      if (review.difficulty >= 4) {
        sum += 2;
      }
      if (review.status === "review") {
        sum += 2;
      }
      return sum;
    }, 0);
    return { topic, incomplete, score };
  }).filter((record) => record.score || record.incomplete)
    .sort((first, second) => second.score - first.score || second.incomplete - first.incomplete);
}

function matchesFocusFilter(day) {
  const review = getDayReview(day.id);
  if (state.focusFilter === "bookmarked") {
    return review.bookmarked;
  }
  if (state.focusFilter === "weak") {
    return review.confidence <= 2 || review.status === "review";
  }
  if (state.focusFilter === "difficult") {
    return review.difficulty >= 4;
  }
  if (state.focusFilter === "unstarted") {
    return !state.completions[day.id];
  }
  return true;
}

function getDayReview(dayId) {
  const raw = state.review[dayId] || {};
  return {
    confidence: clampScale(raw.confidence || 3),
    difficulty: clampScale(raw.difficulty || 3),
    status: raw.status || "learning",
    bookmarked: Boolean(raw.bookmarked),
  };
}

function updateReview(dayId, patch) {
  const current = getDayReview(dayId);
  const next = { ...current, ...patch };
  next.confidence = clampScale(next.confidence);
  next.difficulty = clampScale(next.difficulty);
  next.bookmarked = Boolean(next.bookmarked);
  next.status = ["learning", "review", "stable"].includes(next.status) ? next.status : "learning";
  state.review[dayId] = next;
  persistReview();
}

function persistReview() {
  if (!state.user) {
    return;
  }
  localStorage.setItem(getUserStorageKey("review"), JSON.stringify(state.review));
  queueCloudSave();
}

function clampScale(value) {
  return Math.min(Math.max(Number.parseInt(value, 10) || 3, 1), 5);
}

function getDayRecords(topics = state.data?.topics || []) {
  return topics.flatMap((topic) => topic.subtopics.flatMap((subtopic) => subtopic.sessions.map((day) => ({ topic, subtopic, day }))));
}

function getIncompleteDayRecords(topics = state.data?.topics || []) {
  return getDayRecords(topics).filter((record) => !state.completions[record.day.id]);
}

function getTodayRecords() {
  return getPlanRecordsForDate(new Date());
}

function getNextIncompleteRecord(topics = state.data?.topics || []) {
  return getIncompleteDayRecords(topics)[0] || null;
}

function getPlanRecordsForDate(dateValue) {
  const date = normalizeDateValue(dateValue);
  if (!date || date < getPlanStartDate()) {
    return [];
  }
  const startIndex = getPlanStartIndexForDate(date);
  const target = getTargetForDate(date);
  return getIncompleteDayRecords()
    .slice(startIndex, startIndex + target)
    .map((record, index) => decoratePlanRecord(record, date, index));
}

function getUpcomingPlanRecords(days = 7) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => getLocalDateIso(addDays(today, index + 1)))
    .flatMap((date) => getPlanRecordsForDate(date));
}

function getPlanStartIndexForDate(date) {
  const todayIso = getLocalDateIso(new Date());
  if (date <= todayIso) {
    return 0;
  }

  let index = Math.max(getTargetForDate(todayIso) - getCompletedTodayCount(), 0);
  let cursor = addDays(parseLocalDate(todayIso), 1);
  while (getLocalDateIso(cursor) < date) {
    index += getTargetForDate(cursor);
    cursor = addDays(cursor, 1);
  }
  return index;
}

function decoratePlanRecord(record, planDate, planIndex) {
  return {
    ...record,
    planDate,
    planIndex,
    planTarget: getTargetForDate(planDate),
  };
}

function getCompletedRecordsForDate(date) {
  return getDayRecords().filter((record) => getCompletionDate(state.completions[record.day.id]) === date);
}

function getCompletionCountForDate(date) {
  return getCompletedRecordsForDate(date).length;
}

function getDailyTarget(dateValue = new Date()) {
  return getTargetForDate(dateValue);
}

function getTargetForDate(dateValue) {
  return isWeekendDate(dateValue) ? getWeekendTarget() : getWeekdayTarget();
}

function getWeekdayTarget() {
  return clampTarget(state.user?.weekdayTarget ?? DEFAULT_WEEKDAY_TARGET);
}

function getWeekendTarget() {
  return clampTarget(state.user?.weekendTarget ?? DEFAULT_WEEKEND_TARGET);
}

function clampTarget(value) {
  return Math.min(Math.max(Number.parseInt(value, 10) || DEFAULT_WEEKDAY_TARGET, 1), 12);
}

function getPlanStartDate() {
  return normalizeDateValue(state.user?.planStartDate) || getLocalDateIso(new Date());
}

function ensurePlanningDefaults() {
  return ensurePlanningDefaultsForProfile(state.user);
}

function ensurePlanningDefaultsForProfile(profile) {
  if (!profile) {
    return false;
  }
  let changed = false;
  if (!normalizeDateValue(profile.planStartDate)) {
    profile.planStartDate = getLocalDateIso(new Date());
    changed = true;
  }
  if (!Number.isFinite(Number.parseInt(profile.weekdayTarget, 10))) {
    profile.weekdayTarget = DEFAULT_WEEKDAY_TARGET;
    changed = true;
  }
  if (!Number.isFinite(Number.parseInt(profile.weekendTarget, 10))) {
    profile.weekendTarget = DEFAULT_WEEKEND_TARGET;
    changed = true;
  }
  profile.weekdayTarget = clampTarget(profile.weekdayTarget);
  profile.weekendTarget = clampTarget(profile.weekendTarget);
  profile.dailyTarget = profile.weekdayTarget;
  return changed;
}

function getCompletedTodayCount() {
  const today = getLocalDateIso(new Date());
  return Object.values(state.completions).filter((value) => getCompletionDate(value) === today).length;
}

function getCompletionStreak() {
  const dates = new Set(Object.values(state.completions).map(getCompletionDate).filter(Boolean));
  if (!dates.size) {
    return 0;
  }

  let cursor = new Date();
  const todayIso = getLocalDateIso(cursor);
  
  // If today has no completion, check yesterday
  if (!dates.has(todayIso)) {
    cursor = addDays(cursor, -1);
    const yesterdayIso = getLocalDateIso(cursor);
    // If yesterday also has no completion, streak is 0 (2-day skip resets)
    if (!dates.has(yesterdayIso)) {
      return 0;
    }
    // Yesterday has completion, so start streak from there
  }

  let streak = 0;
  let consecutiveMissed = 0;
  
  // Walk backwards from cursor
  while (true) {
    const currentDateIso = getLocalDateIso(cursor);
    if (dates.has(currentDateIso)) {
      streak += 1;
      consecutiveMissed = 0; // Reset missed counter on completion
    } else {
      consecutiveMissed += 1;
      if (consecutiveMissed >= 2) {
        // 2 consecutive days without completion breaks the streak
        break;
      }
    }
    cursor = addDays(cursor, -1);
    
    // Safety check: don't go before plan start date
    if (getLocalDateIso(cursor) < getPlanStartDate()) {
      break;
    }
  }
  
  return streak;
}

function getNotesCount() {
  return Object.keys(state.notes).length;
}

function getCompletionDate(value) {
  if (value && typeof value === "object" && value.completedAt) {
    return getLocalDateIso(new Date(value.completedAt));
  }
  return null;
}

function normalizeDate(value) {
  return String(value || "").slice(0, 10);
}

function normalizeDateValue(value) {
  if (!value) {
    return "";
  }
  if (value instanceof Date) {
    return getLocalDateIso(value);
  }
  return normalizeDate(value);
}

function parseLocalDate(value) {
  const normalized = normalizeDateValue(value);
  return new Date(`${normalized}T00:00:00`);
}

function isWeekendDate(value) {
  const day = parseLocalDate(value).getDay();
  return day === 0 || day === 6;
}

function formatHourLabel(value) {
  return Number(value) === 1 ? "hour" : "hours";
}

function getLocalDateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, delta) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function createProfileId(identity) {
  const normalized = identity.trim().toLowerCase();
  const base = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "profile";
  return `${base.slice(0, 36)}-${simpleHash(normalized).slice(0, 6)}`;
}

function formatProfileName(identity) {
  const clean = identity.trim();
  if (!clean.includes("@")) {
    return clean;
  }
  return clean.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(name) {
  const letters = String(name || "PT").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return letters || "PT";
}

function simpleHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function percentage(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function setDayCompletion(dayId, value, persist = true) {
  if (!state.user) {
    showToast("Sign in to track progress");
    return;
  }
  if (value) {
    state.completions[dayId] = state.completions[dayId] || { completedAt: new Date().toISOString() };
  } else {
    delete state.completions[dayId];
  }
  if (persist) {
    persistCompletion();
  }
}

function persistCompletion() {
  if (!state.user) {
    return;
  }
  localStorage.setItem(getUserStorageKey("completions"), JSON.stringify(state.completions));
  queueCloudSave();
}

function saveNote(dayId, value) {
  if (!state.user) {
    return;
  }
  const cleanValue = value.trim();
  if (cleanValue) {
    state.notes[dayId] = cleanValue;
  } else {
    delete state.notes[dayId];
  }
  localStorage.setItem(getUserStorageKey("notes"), JSON.stringify(state.notes));
  queueCloudSave();
}

function persistLocalProgressOnly() {
  if (!state.user) {
    return;
  }
  localStorage.setItem(getUserStorageKey("completions"), JSON.stringify(state.completions));
  localStorage.setItem(getUserStorageKey("notes"), JSON.stringify(state.notes));
  localStorage.setItem(getUserStorageKey("review"), JSON.stringify(state.review));
}

function getEnrichedLinks(day) {
  const links = [...(day.links || [])];
  const searchTitle = day.title.replace(/\([^)]*\)$/g, "").trim();
  links.push(
    { label: "YouTube search", url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTitle)}`, type: "Video" },
    { label: "Book and reference search", url: `https://www.google.com/search?q=${encodeURIComponent(`${searchTitle} books reference guide`)}`, type: "Book" },
    { label: "Problem set search", url: `https://www.google.com/search?q=${encodeURIComponent(`${searchTitle} practice problems`)}`, type: "Practice" },
    { label: "Test or quiz search", url: `https://www.google.com/search?q=${encodeURIComponent(`${searchTitle} quiz test`)}`, type: "Test" },
  );

  const seen = new Set();
  return links.filter((link) => {
    if (!link.url || seen.has(link.url)) {
      return false;
    }
    seen.add(link.url);
    return true;
  });
}

function getTopicSearchText(topic) {
  return [
    topic.title,
    topic.schedule,
    topic.category,
    topic.description,
    ...topic.subtopics.map(getSubtopicSearchText),
  ].join(" ").toLowerCase();
}

function getSubtopicSearchText(subtopic) {
  return [
    subtopic.title,
    subtopic.subtitle,
    subtopic.description,
    ...subtopic.sessions.map(getDaySearchText),
  ].join(" ").toLowerCase();
}

function getDaySearchText(day) {
  return [day.title, day.focus, day.resource, day.brief, day.practiceTarget, day.successMetric].join(" ").toLowerCase();
}

function getScheduleShortTitle(scheduleTitle) {
  return SCHEDULES.find((item) => item.title === scheduleTitle)?.shortTitle || scheduleTitle;
}

function showToast(message) {
  nodes.toast.textContent = message;
  nodes.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => nodes.toast.classList.remove("show"), 1800);
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function formatDateTime(value) {
  if (!value) {
    return "now";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  const input = String(value).length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function encodeRoute(value) {
  return encodeURIComponent(value);
}

function decodeRoute(value = "") {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

async function handleAuthSubmit(form) {
  const identity = form.elements.profileName.value.trim();
  const pin = form.elements.profilePin.value.trim();
  if (state.cloud.configured && !state.cloud.error) {
    try {
      const firebaseUser = await signInOrCreateCloudAccount(identity, pin);
      await loadCloudUser(firebaseUser, true);
      showToast(`Cloud sync active for ${state.user.name}`);
      navigateTo("#/home");
    } catch (error) {
      renderSignedOutState(getFirebaseAuthMessage(error));
    }
    return;
  }

  const result = signInProfile(identity, pin);

  if (!result.ok) {
    renderSignedOutState(result.message);
    return;
  }

  showToast(`Signed in as ${state.user.name}`);
  navigateTo("#/home");
}

function handleProfileSubmit(form) {
  const name = form.elements.displayName.value.trim();
  const weekdayTarget = Number.parseInt(form.elements.weekdayTarget.value, 10);
  const weekendTarget = Number.parseInt(form.elements.weekendTarget.value, 10);

  if (!name) {
    showToast("Display name is required");
    return;
  }

  state.user.name = name;
  state.user.weekdayTarget = Number.isFinite(weekdayTarget) ? clampTarget(weekdayTarget) : getWeekdayTarget();
  state.user.weekendTarget = Number.isFinite(weekendTarget) ? clampTarget(weekendTarget) : getWeekendTarget();
  state.user.dailyTarget = state.user.weekdayTarget;
  state.user.planStartDate = getPlanStartDate();
  state.user.updatedAt = new Date().toISOString();
  state.users[state.user.id] = state.user;
  saveUsers();
  queueCloudSave();
  updateAuthUi();
  render();
  showToast("Profile saved");
}

function openAccountView() {
  closeDrawer();
  navigateTo(state.user ? "#/account" : "#/home");
}

function openDayInContext(dayId) {
  const found = findDay(dayId);
  if (!found) {
    return;
  }
  navigateTo(`#/subtopic/${encodeRoute(found.subtopic.id)}`);
  window.setTimeout(() => openDayModal(dayId), 120);
}

function updateAuthUi() {
  const signedIn = Boolean(state.user);
  const label = signedIn ? `${state.user.name}${state.user.cloudUid ? " (cloud)" : ""}` : "Sign in";
  nodes.accountButton.textContent = label;
  nodes.drawerAccount.textContent = signedIn ? `Profile: ${state.user.name}` : "Sign in";
  [nodes.jumpNext, nodes.drawerJumpNext, nodes.exportProgress, nodes.drawerExport].forEach((button) => {
    button.disabled = !signedIn;
  });
}

function getSyncStatusLabel() {
  if (state.user?.cloudUid) {
    if (state.cloud.syncState === "saving") {
      return "Cloud sync saving";
    }
    if (state.cloud.syncState === "offline") {
      return "Cloud sync needs connection";
    }
    return "Cloud sync active";
  }
  if (state.cloud.configured && !state.cloud.error) {
    return "Cloud ready";
  }
  return "Local storage mode";
}

function getFirebaseAuthMessage(error) {
  if (error?.code === "auth/email-already-in-use") {
    return "That email is already registered. Use the same password to sign in.";
  }
  if (error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential") {
    return "The email/password combination did not match.";
  }
  if (error?.code === "auth/weak-password") {
    return "Use a password with at least 6 characters.";
  }
  if (error?.code === "auth/invalid-email") {
    return "Enter a valid email address for cloud sync.";
  }
  return error?.message || "Cloud sign-in failed.";
}

function signInProfile(identity, pin) {
  if (!identity) {
    return { ok: false, message: "Enter a name or email." };
  }
  if (!pin || pin.length < 4) {
    return { ok: false, message: "Use a profile PIN with at least 4 characters." };
  }

  const id = createProfileId(identity);
  const pinHash = simpleHash(`${id}:${pin}`);
  const now = new Date().toISOString();
  let user = state.users[id];
  const created = !user;

  if (user && user.pinHash !== pinHash) {
    return { ok: false, message: "That PIN does not match this profile." };
  }

  if (!user) {
    user = {
      id,
      name: formatProfileName(identity),
      pinHash,
      dailyTarget: DEFAULT_WEEKDAY_TARGET,
      weekdayTarget: DEFAULT_WEEKDAY_TARGET,
      weekendTarget: DEFAULT_WEEKEND_TARGET,
      planStartDate: getLocalDateIso(new Date()),
      createdAt: now,
      updatedAt: now,
    };
  }

  ensurePlanningDefaultsForProfile(user);
  user.lastLoginAt = now;
  state.users[id] = user;
  saveUsers();
  state.user = user;
  localStorage.setItem(ACTIVE_USER_KEY, id);
  loadUserProgress();
  if (created) {
    maybeImportLegacyProgress();
  }
  loadUserProgress();
  updateAuthUi();
  return { ok: true };
}

async function signOut() {
  closeDrawer();
  closeModal();
  if (state.user?.cloudUid) {
    try {
      await signOutCloudAccount();
    } catch (error) {
      showToast(error.message || "Cloud sign-out failed locally");
    }
  }
  stopCloudWatch();
  localStorage.removeItem(ACTIVE_USER_KEY);
  state.user = null;
  state.completions = {};
  state.notes = {};
  state.review = {};
  navigateTo("#/home");
  showToast("Signed out");
}

function getActiveUser() {
  const userId = localStorage.getItem(ACTIVE_USER_KEY);
  return userId && state.users[userId] ? state.users[userId] : null;
}

function loadUserProgress() {
  if (!state.user) {
    state.completions = {};
    state.notes = {};
    state.review = {};
    return;
  }
  state.completions = readJson(getUserStorageKey("completions"));
  state.notes = readJson(getUserStorageKey("notes"));
  state.review = readJson(getUserStorageKey("review"));
}

function maybeImportLegacyProgress() {
  if (!state.user || Object.keys(state.users).length !== 1) {
    return;
  }

  const legacyCompletions = readJson(LEGACY_COMPLETION_KEY);
  const legacyNotes = readJson(LEGACY_NOTES_KEY);
  if (!Object.keys(state.completions).length && Object.keys(legacyCompletions).length) {
    localStorage.setItem(getUserStorageKey("completions"), JSON.stringify(legacyCompletions));
  }
  if (!Object.keys(state.notes).length && Object.keys(legacyNotes).length) {
    localStorage.setItem(getUserStorageKey("notes"), JSON.stringify(legacyNotes));
  }
}

function getUserStorageKey(scope) {
  return `progress-tracker-user-${state.user.id}-${scope}-v1`;
}

function saveUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(state.users));
}

function renderPlanPage() {
  const planner = getPlannerBuckets();
  const todayTarget = getTargetForDate(new Date());
  const recommended = getRecommendedRecords(todayTarget);
  const dayType = isWeekendDate(new Date()) ? "weekend" : "weekday";

  nodes.app.innerHTML = `
    ${renderBreadcrumb([{ label: "Home", href: "#/home" }, { label: "Plan" }])}
    <section class="page-hero compact plan-hero" style="--accent:var(--brand)">
      <div>
        <p class="eyebrow">Smart planner</p>
        <h1>What to do next</h1>
        <p>Today is a ${dayType} plan: ${todayTarget} ${formatHourLabel(todayTarget)}. Completing extra work pulls later lessons forward without changing the learning order.</p>
      </div>
      ${renderProgressDial(progressStats(getAllSessions(state.data.topics)))}
    </section>
    <section class="planner-layout">
      <article class="planner-column priority-column">
        <div class="section-heading-row compact-heading"><div><p class="eyebrow">Priority queue</p><h2>${recommended.length} ${formatHourLabel(recommended.length)}</h2></div></div>
        <div class="planner-list">${recommended.length ? recommended.map((record, index) => renderPlannerItem(record, index + 1)).join("") : renderEmpty("No priority items", "You are fully caught up.")}</div>
      </article>
      <article class="planner-column">
        <div class="section-heading-row compact-heading"><div><p class="eyebrow">Upcoming</p><h2>${planner.upcoming.length}</h2></div></div>
        <div class="planner-list slim-list">${planner.upcoming.slice(0, 8).map((record, index) => renderPlannerItem(record, index + 1)).join("") || `<p class="muted-line">Continue the queue you've already started.</p>`}</div>
      </article>
    </section>
  `;
}

function renderPlannerItem(record, index) {
  const review = getDayReview(record.day.id);
  const classes = ["planner-item"];
  if (state.completions[record.day.id]) {
    classes.push("done");
  }
  if (review.bookmarked) {
    classes.push("bookmarked");
  }

  return `
    <button class="${classes.join(" ")}" type="button" data-action="open-day" data-day-id="${escapeAttr(record.day.id)}">
      <span class="rank-pill">${index}</span>
      <span class="planner-copy">
        <strong>${escapeHtml(record.day.title)}</strong>
        <small>${escapeHtml(record.topic.title)} / ${escapeHtml(record.subtopic.title)}</small>
      </span>
    </button>
  `;
}



function renderAnalyticsPage() {
  const allSessions = getAllSessions(state.data.topics);
  const stats = progressStats(allSessions);
  const trend = getCompletionTrend(14);
  const forecast = getForecastSummary();
  const weakTopics = getWeakTopicRecords().slice(0, 6);

  nodes.app.innerHTML = `
    ${renderBreadcrumb([{ label: "Home", href: "#/home" }, { label: "Analytics" }])}
    <section class="page-hero compact analytics-hero" style="--accent:var(--brand)">
      <div>
        <p class="eyebrow">Analytics</p>
        <h1>Progress intelligence</h1>
        <p>Velocity, forecast, review pressure, and weak-area signals for this profile.</p>
      </div>
      ${renderProgressDial(stats)}
    </section>
    <section class="analytics-grid">
      <article class="analytics-panel velocity-panel">
        <div class="panel-title"><p class="eyebrow">Velocity</p><h2>${forecast.averagePerDay} / day</h2></div>
        <div class="bar-chart" aria-label="Completion trend">
          ${trend.map(renderTrendBar).join("")}
        </div>
      </article>
      <article class="analytics-panel forecast-panel">
        <div class="panel-title"><p class="eyebrow">Forecast</p><h2>${forecast.daysRemaining} days</h2></div>
        <p>${escapeHtml(forecast.message)}</p>
        <div class="forecast-row"><span>Today's target</span><strong>${getDailyTarget()}</strong></div>
        <div class="forecast-row"><span>Open sessions</span><strong>${allSessions.length - stats.done}</strong></div>
        <div class="forecast-row"><span>Review queue</span><strong>${getReviewQueue().length}</strong></div>
      </article>
      <article class="analytics-panel split-panel">
        <div class="panel-title"><p class="eyebrow">Tracks</p><h2>Split</h2></div>
        <div class="track-split-list">
          ${SCHEDULES.map(renderTrackSplit).join("")}
        </div>
      </article>
      <article class="analytics-panel weak-panel">
        <div class="panel-title"><p class="eyebrow">Weak areas</p><h2>${weakTopics.length} focus zones</h2></div>
        <div class="weak-list">
          ${weakTopics.length ? weakTopics.map(renderWeakTopic).join("") : `<p class="muted-line">No weak-area signals yet.</p>`}
        </div>
      </article>
    </section>
  `;
}

function renderTrendBar(item) {
  const height = Math.max(item.count * 18, item.count ? 18 : 4);
  return `
    <div class="trend-bar" title="${escapeAttr(formatDate(item.date))}: ${item.count}">
      <span style="height:${height}px"></span>
      <small>${escapeHtml(item.label)}</small>
    </div>
  `;
}

function renderTrackSplit(schedule) {
  const topics = getTopicsBySchedule(schedule.title);
  const stats = progressStats(getAllSessions(topics));
  return `
    <a class="track-split" href="#/schedule/${encodeRoute(schedule.title)}" style="--accent:${schedule.accent}">
      <span>${escapeHtml(schedule.shortTitle)}</span>
      <strong>${stats.percent}%</strong>
      <div class="meter"><span style="width:${stats.percent}%"></span></div>
      <small>${stats.done} / ${stats.total} days</small>
    </a>
  `;
}

function renderWeakTopic(record) {
  return `
    <a class="weak-topic" href="#/topic/${encodeRoute(record.topic.id)}" style="--accent:${escapeAttr(record.topic.accent)}">
      <span>${escapeHtml(record.topic.category)}</span>
      <strong>${escapeHtml(record.topic.title)}</strong>
      <small>${record.score} review points / ${record.incomplete} open days</small>
    </a>
  `;
}

function renderCalendarPage() {
  const cells = getCalendarCells();
  const heatmap = getCompletionTrend(35);
  const todayRecords = getTodayRecords();
  const todayTarget = getTargetForDate(new Date());

  nodes.app.innerHTML = `
    ${renderBreadcrumb([{ label: "Home", href: "#/home" }, { label: "Calendar" }])}
    <section class="page-hero compact calendar-hero" style="--accent:var(--brand)">
      <div>
        <p class="eyebrow">Calendar</p>
        <h1>Schedule pressure map</h1>
        <p>Green days met the target. Red days missed it. Future days preview the rolling lesson order from your current progress.</p>
      </div>
      <div class="calendar-today-card">
        <strong>${todayRecords.length}</strong>
        <span>of ${todayTarget} ${formatHourLabel(todayTarget)}</span>
      </div>
    </section>
    <section class="calendar-layout">
      <article class="calendar-panel full-calendar">
        <div class="section-heading-row compact-heading"><div><p class="eyebrow">Next 6 weeks</p><h2>Progress calendar</h2></div></div>
        <div class="calendar-legend" aria-label="Calendar legend">
          <span><i class="legend-dot complete"></i>Complete</span>
          <span><i class="legend-dot missed"></i>Incomplete</span>
          <span><i class="legend-dot future"></i>Planned</span>
        </div>
        <div class="calendar-weekdays">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<span>${day}</span>`).join("")}</div>
        <div class="calendar-grid">${cells.map(renderCalendarCell).join("")}</div>
      </article>
      <article class="calendar-panel heatmap-panel">
        <div class="section-heading-row compact-heading"><div><p class="eyebrow">Consistency</p><h2>Last 35 days</h2></div></div>
        <div class="heatmap-grid">${heatmap.map(renderHeatmapCell).join("")}</div>
      </article>
    </section>
  `;
}

function renderCalendarCell(cell) {
  const isToday = cell.date === getLocalDateIso(new Date());
  const firstOpen = cell.records.find((record) => !state.completions[record.day.id]) || cell.records[0];
  const load = Math.min(cell.target || cell.records.length, 5);
  const classes = ["calendar-cell", cell.status];
  if (isToday) {
    classes.push("today");
  }

  return `
    <button class="${classes.join(" ")}" type="button" ${firstOpen ? `data-action="open-day" data-day-id="${escapeAttr(firstOpen.day.id)}"` : "disabled"} style="--load:${load}">
      <span>${escapeHtml(String(new Date(`${cell.date}T00:00:00`).getDate()))}</span>
      <strong>${cell.target ? `${cell.completed}/${cell.target}` : "-"}</strong>
      <small>${cell.target ? formatHourLabel(cell.target) : "No plan"}</small>
    </button>
  `;
}

function renderHeatmapCell(item) {
  const level = Math.min(item.count, 5);
  return `<span class="heat-cell" data-level="${level}" title="${escapeAttr(formatDate(item.date))}: ${item.count}"></span>`;
}