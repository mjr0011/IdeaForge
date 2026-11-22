
document.addEventListener("DOMContentLoaded", async () => {

    // ==========================================
    // 1. INITIALIZE SUPABASE
    // ==========================================

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase client is not initialized.");
        return;
    }


    // ==========================================
    // 2. GET HTML ELEMENTS
    // ==========================================

    const elements = {
        userName: document.getElementById("userName"),
        welcomeName: document.getElementById("welcomeName"),
        userAvatar: document.getElementById("userAvatar"),
        dashboardAvatarImage: document.getElementById("dashboardAvatarImage"),

        totalIdeas: document.getElementById("totalIdeas"),
        totalScripts: document.getElementById("totalScripts"),
        totalFavorites: document.getElementById("totalFavorites"),
        weeklyIdeas: document.getElementById("weeklyIdeas"),

        activityChart: document.getElementById("activityChart"),
        platformBreakdown: document.getElementById("platformBreakdown"),
        recentContent: document.getElementById("recentContent"),

        // Usage & Plan elements
usageMonthLabel: document.getElementById("usageMonthLabel"),

currentPlanName: document.getElementById("currentPlanName"),
planDisplayName: document.getElementById("planDisplayName"),
planDescription: document.getElementById("planDescription"),
planStatus: document.getElementById("planStatus"),

usageIdeasGenerated: document.getElementById("usageIdeasGenerated"),
usageIdeasGeneratedBar: document.getElementById("usageIdeasGeneratedBar"),
usageIdeasGeneratedLimit: document.getElementById("usageIdeasGeneratedLimit"),

usageIdeasSaved: document.getElementById("usageIdeasSaved"),
usageIdeasSavedBar: document.getElementById("usageIdeasSavedBar"),
usageIdeasSavedLimit: document.getElementById("usageIdeasSavedLimit"),

usageScriptsGenerated: document.getElementById("usageScriptsGenerated"),
usageScriptsGeneratedBar: document.getElementById("usageScriptsGeneratedBar"),
usageScriptsGeneratedLimit: document.getElementById("usageScriptsGeneratedLimit"),

        logoutBtn: document.getElementById("logoutBtn"),
        themeToggle: document.getElementById("themeToggle"),
        menuToggle: document.getElementById("menuToggle"),
        sidebar: document.querySelector(".sidebar")
    };


    // ==========================================
    // 3. HELPER FUNCTIONS
    // ==========================================

    function createElement(tag, className = "", text = "") {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = text;
        }

        return element;
    }

    function showMessage(element, text) {
        if (!element) return;

        element.replaceChildren(
            createElement("p", "loading-text", text)
        );
    }

    function formatDate(dateString) {
        if (!dateString) return "Recently saved";

        return new Date(dateString).toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    }

    // ==========================================
    // USAGE & PLAN HELPERS
    // ==========================================

    // Current month in YYYY-MM-01 format.
    // This matches the monthly date stored in Supabase.
    function getCurrentUsageMonth() {
        return new Date().toISOString().slice(0, 7) + "-01";
    }


    // Update one usage metric on the dashboard.
    function updateUsageMetric(
        countElement,
        barElement,
        limitElement,
        count,
        limit = null
    ) {
        if (!countElement || !barElement || !limitElement) {
            return;
        }

        const currentCount = Number(count) || 0;

        countElement.textContent = currentCount.toLocaleString();

        if (Number.isFinite(limit) && limit > 0) {

            const percentage = Math.min(
                100,
                (currentCount / limit) * 100
            );

            barElement.parentElement.hidden = false;
            barElement.style.width = percentage + "%";

            limitElement.textContent =
                `${currentCount.toLocaleString()} of ${limit.toLocaleString()} used`;

        } else {

            // Do not show misleading progress without a real plan limit.
            barElement.parentElement.hidden = true;

            limitElement.textContent =
                "Monthly limit not configured";
        }
    }


    // ==========================================
    // 4. THEME MANAGEMENT
    // ==========================================

    const savedTheme =
        localStorage.getItem("ideaforge-theme") || "light";

    document.documentElement.dataset.theme = savedTheme;

    if (elements.themeToggle) {
        elements.themeToggle.textContent =
            savedTheme === "dark" ? "☀" : "☾";

        elements.themeToggle.addEventListener("click", () => {

            const currentTheme =
                document.documentElement.dataset.theme;

            const nextTheme =
                currentTheme === "dark" ? "light" : "dark";

            document.documentElement.dataset.theme = nextTheme;

            localStorage.setItem(
                "ideaforge-theme",
                nextTheme
            );

            elements.themeToggle.textContent =
                nextTheme === "dark" ? "☀" : "☾";
        });
    }


    // ==========================================
    // 5. MOBILE SIDEBAR
    // ==========================================

    if (elements.menuToggle && elements.sidebar) {

        elements.menuToggle.addEventListener("click", () => {
            elements.sidebar.classList.toggle("open");
        });

        document.addEventListener("click", event => {

            if (
                window.innerWidth <= 700 &&
                !elements.sidebar.contains(event.target) &&
                !elements.menuToggle.contains(event.target)
            ) {
                elements.sidebar.classList.remove("open");
            }

        });
    }


    // ==========================================
    // 6. CHECK AUTHENTICATION
    // ==========================================

    const { data: authData, error: authError } =
        await supabase.auth.getUser();

    if (authError || !authData?.user) {
        window.location.replace("login.html");
        return;
    }

    const user = authData.user;

    // ==========================================
// FREE PLAN MONTHLY QUOTAS
// ==========================================

const FREE_PLAN_LIMITS = {
    ideas_generated: 50,
    ideas_saved: 25,
    scripts_generated: 10
};


    // ==========================================
    // 7. DISPLAY USER INFORMATION
    // ==========================================

    const metadata = user.user_metadata || {};

    const fullName =
        metadata.full_name ||
        metadata.name ||
        metadata.display_name ||
        user.email?.split("@")[0] ||
        "Creator";

    const firstName = fullName.split(" ")[0];

    if (elements.userName) {
        elements.userName.textContent = fullName;
    }

    if (elements.welcomeName) {
        elements.welcomeName.textContent = firstName;
    }

    if (elements.userAvatar) {
        elements.userAvatar.textContent =
            firstName.charAt(0).toUpperCase();
    }

    // ==========================================
// 7.1 LOAD CREATOR PROFILE PHOTO
// ==========================================

async function loadDashboardAvatar() {

    const avatarImage = elements.dashboardAvatarImage;
    const avatarInitial = elements.userAvatar;

    if (!avatarImage || !avatarInitial) return;

    try {

        const { data: profile, error } = await supabase
            .from("creator_profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .maybeSingle();

        if (error) {
            console.error("Dashboard avatar error:", error);
            return;
        }

        if (!profile || !profile.avatar_url) {
            avatarImage.hidden = true;
            avatarInitial.hidden = false;
            return;
        }

        avatarImage.onload = () => {
            avatarImage.hidden = false;
            avatarInitial.hidden = true;
        };

        avatarImage.onerror = () => {
            avatarImage.hidden = true;
            avatarInitial.hidden = false;
            console.error("Could not display creator profile photo.");
        };

        avatarImage.src = profile.avatar_url;

    } catch (error) {

        console.error("Unable to load dashboard avatar:", error);

        avatarImage.hidden = true;
        avatarInitial.hidden = false;

    }
}

await loadDashboardAvatar();


    // ==========================================
    // 8. LOGOUT
    // ==========================================

    if (elements.logoutBtn) {

        elements.logoutBtn.addEventListener("click", async () => {

            elements.logoutBtn.disabled = true;
            elements.logoutBtn.textContent = "Logging out...";

            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error("Logout error:", error);

                elements.logoutBtn.disabled = false;
                elements.logoutBtn.textContent = "↪ Logout";

                alert("Unable to log out. Please try again.");
                return;
            }

            window.location.replace("login.html");
        });
    }

    // ==========================================
// LOAD MONTHLY CREATOR USAGE
// ==========================================

async function loadUsageData() {

    try {

        const currentMonth = getCurrentUsageMonth();

        // Display the current plan.
if (elements.currentPlanName) {
    elements.currentPlanName.textContent = "Free Plan";
}

if (elements.planDisplayName) {
    elements.planDisplayName.textContent = "Free Plan";
}

if (elements.planDescription) {
    elements.planDescription.textContent =
        "A starter workspace for creating and organizing content.";
}

if (elements.planStatus) {
    elements.planStatus.textContent = "Active";
}

        // Display current month.
        const monthDate = new Date(
            currentMonth + "T00:00:00Z"
        );

        if (elements.usageMonthLabel) {
            elements.usageMonthLabel.textContent =
                monthDate.toLocaleDateString(
                    undefined,
                    {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC"
                    }
                );
        }

        // Retrieve only the logged-in creator's usage.
        const { data: usage, error } = await supabase
            .from("creator_usage")
            .select(`
                usage_month,
                ideas_generated,
                ideas_saved,
                scripts_generated
            `)
            .eq("user_id", user.id)
            .eq("usage_month", currentMonth)
            .maybeSingle();

        if (error) {
            throw error;
        }

        // No row means no recorded usage this month.
        const usageData = usage || {
            ideas_generated: 0,
            ideas_saved: 0,
            scripts_generated: 0
        };

        // Display usage metrics and monthly quotas.
updateUsageMetric(
    elements.usageIdeasGenerated,
    elements.usageIdeasGeneratedBar,
    elements.usageIdeasGeneratedLimit,
    usageData.ideas_generated,
    FREE_PLAN_LIMITS.ideas_generated
);

updateUsageMetric(
    elements.usageIdeasSaved,
    elements.usageIdeasSavedBar,
    elements.usageIdeasSavedLimit,
    usageData.ideas_saved,
    FREE_PLAN_LIMITS.ideas_saved
);

updateUsageMetric(
    elements.usageScriptsGenerated,
    elements.usageScriptsGeneratedBar,
    elements.usageScriptsGeneratedLimit,
    usageData.scripts_generated,
    FREE_PLAN_LIMITS.scripts_generated
);

        console.log(
            "IdeaForge monthly usage loaded successfully:",
            usageData
        );

    } catch (error) {

        console.error(
            "Unable to load creator usage:",
            error
        );

        // Show a useful error state.
        const usageElements = [
            elements.usageIdeasGenerated,
            elements.usageIdeasSaved,
            elements.usageScriptsGenerated
        ];

        usageElements.forEach(element => {
            if (element) {
                element.textContent = "--";
            }
        });

        const limitElements = [
            elements.usageIdeasGeneratedLimit,
            elements.usageIdeasSavedLimit,
            elements.usageScriptsGeneratedLimit
        ];

        limitElements.forEach(element => {
            if (element) {
                element.textContent = "Unable to load usage";
            }
        });
    }
}

    // ==========================================
    // 9. LOAD SAVED CONTENT FROM SUPABASE
    // ==========================================

    async function loadDashboardData() {

        showMessage(
            elements.activityChart,
            "Loading your activity..."
        );

        showMessage(
            elements.platformBreakdown,
            "Loading platforms..."
        );

        showMessage(
            elements.recentContent,
            "Loading saved content..."
        );

        const { data: ideas, error } = await supabase
            .from("content_ideas")
            .select(`
                id,
                title,
                description,
                script,
                is_favorite,
                platform,
                content_format,
                created_at
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Dashboard database error:", error);

            const errorMessage =
                "Unable to load dashboard data: " + error.message;

            showMessage(elements.activityChart, errorMessage);
            showMessage(elements.platformBreakdown, errorMessage);
            showMessage(elements.recentContent, errorMessage);

            return;
        }

        const savedIdeas = ideas || [];


        // ======================================
        // 10. CALCULATE STATISTICS
        // ======================================

        const totalIdeas = savedIdeas.length;

        const totalScripts = savedIdeas.filter(idea =>
            typeof idea.script === "string" &&
            idea.script.trim().length > 0
        ).length;

        const totalFavorites = savedIdeas.filter(
            idea => idea.is_favorite === true
        ).length;

        // Calculate the last seven calendar days.
        const today = new Date();

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const weeklyIdeas = savedIdeas.filter(idea => {

            if (!idea.created_at) return false;

            const createdAt = new Date(idea.created_at);

            return (
                !Number.isNaN(createdAt.getTime()) &&
                createdAt >= sevenDaysAgo &&
                createdAt <= today
            );

        }).length;


        // ======================================
        // 11. UPDATE STATISTIC CARDS
        // ======================================

        if (elements.totalIdeas) {
            elements.totalIdeas.textContent = totalIdeas;
        }

        if (elements.totalScripts) {
            elements.totalScripts.textContent = totalScripts;
        }

        if (elements.totalFavorites) {
            elements.totalFavorites.textContent = totalFavorites;
        }

        if (elements.weeklyIdeas) {
            elements.weeklyIdeas.textContent = weeklyIdeas;
        }


        // ======================================
        // 12. RENDER WEEKLY ACTIVITY CHART
        // ======================================

        function renderActivityChart() {

            if (!elements.activityChart) return;

            elements.activityChart.replaceChildren();

            const days = [];

            for (let i = 6; i >= 0; i--) {

                const date = new Date();

                date.setHours(0, 0, 0, 0);
                date.setDate(date.getDate() - i);

                days.push({
                    date,
                    count: 0
                });
            }

            savedIdeas.forEach(idea => {

                if (!idea.created_at) return;

                const createdAt = new Date(idea.created_at);

                if (Number.isNaN(createdAt.getTime())) return;

                const matchingDay = days.find(day =>
                    day.date.getFullYear() === createdAt.getFullYear() &&
                    day.date.getMonth() === createdAt.getMonth() &&
                    day.date.getDate() === createdAt.getDate()
                );

                if (matchingDay) {
                    matchingDay.count++;
                }

            });

            const maximum = Math.max(
                1,
                ...days.map(day => day.count)
            );

            days.forEach(day => {

                const dayContainer = createElement(
                    "div",
                    "activity-day"
                );

                const barArea = createElement(
                    "div",
                    "activity-bar-area"
                );

                const bar = createElement(
                    "div",
                    "activity-bar"
                );

                const height =
                    day.count === 0
                        ? 3
                        : Math.max(
                            8,
                            (day.count / maximum) * 130
                        );

                bar.style.height = height + "px";

                bar.title = `${day.count} saved item(s)`;

                const count = createElement(
                    "strong",
                    "",
                    day.count.toString()
                );

                const label = createElement(
                    "small",
                    "",
                    day.date.toLocaleDateString(
                        undefined,
                        { weekday: "short" }
                    )
                );

                barArea.appendChild(bar);

                dayContainer.append(
                    barArea,
                    count,
                    label
                );

                elements.activityChart.appendChild(dayContainer);

            });
        }


        // ======================================
        // 13. RENDER PLATFORM BREAKDOWN
        // ======================================

        function renderPlatforms() {

            if (!elements.platformBreakdown) return;

            elements.platformBreakdown.replaceChildren();

            if (savedIdeas.length === 0) {

                showMessage(
                    elements.platformBreakdown,
                    "Save your first idea to see platform analytics."
                );

                return;
            }

            const platformCounts = {};

            savedIdeas.forEach(idea => {

                const platform = idea.platform || "Other";

                platformCounts[platform] =
                    (platformCounts[platform] || 0) + 1;

            });

            const sortedPlatforms = Object.entries(platformCounts)
                .sort((a, b) => b[1] - a[1]);

            sortedPlatforms.forEach(([platform, count]) => {

                const percentage = Math.round(
                    (count / savedIdeas.length) * 100
                );

                const item = createElement(
                    "div",
                    "platform-item"
                );

                const info = createElement(
                    "div",
                    "platform-info"
                );

                const name = createElement(
                    "strong",
                    "",
                    platform
                );

                const value = createElement(
                    "span",
                    "",
                    `${count} (${percentage}%)`
                );

                const progress = createElement(
                    "div",
                    "platform-progress"
                );

                const fill = createElement(
                    "div",
                    "platform-progress-fill"
                );

                fill.style.width = percentage + "%";

                info.append(name, value);
                progress.appendChild(fill);

                item.append(info, progress);

                elements.platformBreakdown.appendChild(item);

            });
        }


        // ======================================
        // 14. RENDER RECENT SAVED CONTENT
        // ======================================

        function renderRecentContent() {

            if (!elements.recentContent) return;

            elements.recentContent.replaceChildren();

            if (savedIdeas.length === 0) {

                const empty = createElement(
                    "div",
                    "empty-state"
                );

                empty.append(
                    createElement("h4", "", "No saved content yet"),
                    createElement(
                        "p",
                        "",
                        "Generate some ideas and save your favorites to see them here."
                    )
                );

                const link = createElement(
                    "a",
                    "primary-btn",
                    "Generate Your First Ideas"
                );

                link.href = "idea-generator.html";

                link.style.marginTop = "15px";

                empty.appendChild(link);

                elements.recentContent.appendChild(empty);

                return;
            }

            savedIdeas.slice(0, 5).forEach(idea => {

                const item = createElement(
                    "div",
                    "recent-item"
                );

                const details = createElement("div");

                const title = createElement(
                    "h4",
                    "",
                    idea.title || "Untitled Idea"
                );

                const description = createElement(
                    "p",
                    "",
                    `${idea.platform || "Other"} · ${
                        idea.content_format || "Content"
                    } · ${formatDate(idea.created_at)}`
                );

                details.append(title, description);

                const badge = createElement(
                    "span",
                    "recent-badge",
                    idea.script && idea.script.trim()
                        ? "Script"
                        : "Idea"
                );

                item.append(details, badge);

                elements.recentContent.appendChild(item);

            });
        }


        // ======================================
        // 15. DISPLAY ALL DASHBOARD SECTIONS
        // ======================================

        renderActivityChart();
        renderPlatforms();
        renderRecentContent();

        console.log("IdeaForge dashboard data loaded successfully.");

    }


    // ==========================================
// 16. INITIALIZE DASHBOARD
// ==========================================

await Promise.all([
    loadDashboardData(),
    loadUsageData()
]);

console.log(
    "IdeaForge dashboard and usage analytics initialized."
);

});
