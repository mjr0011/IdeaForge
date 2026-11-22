
document.addEventListener("DOMContentLoaded", async () => {

    // ==========================================
    // 1. SUPABASE INITIALIZATION
    // ==========================================

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase client is not initialized.");
        alert("Supabase is not initialized. Check js/supabase-config.js.");
        return;
    }

    // ==========================================
    // 2. HTML ELEMENTS
    // ==========================================

    const libraryGrid = document.getElementById("libraryGrid");
    const loadingState = document.getElementById("loadingState");
    const emptyState = document.getElementById("emptyState");
    const emptyTitle = document.getElementById("emptyTitle");
    const emptyDescription = document.getElementById("emptyDescription");

    const searchInput = document.getElementById("searchInput");
    const platformFilter = document.getElementById("platformFilter");
    const formatFilter = document.getElementById("formatFilter");
    const sortFilter = document.getElementById("sortFilter");

    const totalIdeas = document.getElementById("totalIdeas");
    const totalFavorites = document.getElementById("totalFavorites");
    const totalScripts = document.getElementById("totalScripts");

    const libraryMessage = document.getElementById("libraryMessage");

    const editModal = document.getElementById("editModal");
    const editForm = document.getElementById("editForm");
    const deleteModal = document.getElementById("deleteModal");

    const themeToggle = document.getElementById("themeToggle");
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const logoutBtn = document.getElementById("logoutBtn");

    // Milestone 12: Creator profile elements
    const libraryAvatarInitial = document.getElementById("libraryAvatarInitial");
    const libraryAvatarImage = document.getElementById("libraryAvatarImage");
    const libraryProfileName = document.getElementById("libraryProfileName");

    // ==========================================
    // 3. APPLICATION STATE
    // ==========================================

    let currentUser = null;
    let allIdeas = [];
    let activeTab = "all";
    let deleteTargetId = null;
    let messageTimeout = null;

    // ==========================================
    // 4. AUTHENTICATION
    // ==========================================

    const { data: authData, error: authError } =
        await supabase.auth.getUser();

    if (authError || !authData?.user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = authData.user;

    // ==========================================
    // 5. LOAD CREATOR PROFILE
    // ==========================================

    async function loadLibraryProfile() {

        if (!libraryAvatarInitial && !libraryAvatarImage && !libraryProfileName) {
            return;
        }

        const metadata = currentUser.user_metadata || {};

        const fallbackName =
            metadata.full_name ||
            metadata.name ||
            metadata.display_name ||
            currentUser.email?.split("@")[0] ||
            "Creator";

        function showInitial(name) {
            if (libraryAvatarInitial) {
                libraryAvatarInitial.textContent =
                    (name || "U").trim().charAt(0).toUpperCase();

                libraryAvatarInitial.hidden = false;
            }

            if (libraryAvatarImage) {
                libraryAvatarImage.hidden = true;
                libraryAvatarImage.removeAttribute("src");
            }
        }

        try {

            const { data: profile, error } = await supabase
                .from("creator_profiles")
                .select("full_name, avatar_url")
                .eq("id", currentUser.id)
                .maybeSingle();

            if (error) {
                console.error("Library profile error:", error);
                showInitial(fallbackName);

                if (libraryProfileName) {
                    libraryProfileName.textContent = fallbackName;
                }

                return;
            }

            const displayName =
                profile?.full_name?.trim() || fallbackName;

            if (libraryProfileName) {
                libraryProfileName.textContent = displayName;
                libraryProfileName.title = displayName;
            }

            showInitial(displayName);

            if (profile?.avatar_url && libraryAvatarImage) {

                libraryAvatarImage.onload = () => {
                    libraryAvatarImage.hidden = false;

                    if (libraryAvatarInitial) {
                        libraryAvatarInitial.hidden = true;
                    }
                };

                libraryAvatarImage.onerror = () => {
                    showInitial(displayName);
                    console.error("Unable to display library profile photo.");
                };

                libraryAvatarImage.src = profile.avatar_url;
            }

        } catch (error) {

            console.error("Unable to load library profile:", error);

            showInitial(fallbackName);

            if (libraryProfileName) {
                libraryProfileName.textContent = fallbackName;
            }
        }
    }

    // ==========================================
    // 6. UTILITY FUNCTIONS
    // ==========================================

    function showMessage(text, type = "success") {

        if (!libraryMessage) return;

        libraryMessage.textContent = text;

        libraryMessage.style.color =
            type === "error"
                ? "var(--danger, #ef4444)"
                : "var(--primary, #6366f1)";

        clearTimeout(messageTimeout);

        messageTimeout = setTimeout(() => {
            libraryMessage.textContent = "";
        }, 4000);
    }

    function createElement(tag, className = "", text = "") {

        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }

    function createButton(text, className, callback) {

        const button = createElement("button", className, text);

        button.type = "button";
        button.addEventListener("click", callback);

        return button;
    }

    function formatDate(date) {

        if (!date) return "Saved content";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return "Saved content";
        }

        return parsed.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function hasScript(idea) {

        return Boolean(
            String(idea.script || "").trim() ||
            String(idea.call_to_action || "").trim()
        );
    }

    function getFormat(idea) {
        return idea.content_format || idea.format || "General";
    }

    function isIdeaFavorite(idea) {
        return Boolean(idea.is_favorite);
    }

    // ==========================================
    // 7. FILTERING, SEARCHING AND SORTING
    // ==========================================

    function getFilteredIdeas() {

        const search = (searchInput?.value || "").trim().toLowerCase();
        const platform = (platformFilter?.value || "").trim().toLowerCase();
        const format = (formatFilter?.value || "").trim().toLowerCase();
        const sort = sortFilter?.value || "newest";

        let filtered = [...allIdeas];

        if (search) {

            filtered = filtered.filter(idea => {

                const searchableText = [
                    idea.title,
                    idea.description,
                    idea.hook,
                    idea.creative_angle,
                    idea.niche,
                    idea.topic,
                    idea.platform,
                    getFormat(idea),
                    idea.script,
                    idea.call_to_action
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(search);
            });
        }

        if (platform) {

            filtered = filtered.filter(
                idea =>
                    String(idea.platform || "").trim().toLowerCase() === platform
            );
        }

        if (format) {

            filtered = filtered.filter(
                idea => getFormat(idea).trim().toLowerCase() === format
            );
        }

        if (activeTab === "favorites") {
            filtered = filtered.filter(isIdeaFavorite);

        } else if (activeTab === "scripts") {
            filtered = filtered.filter(hasScript);

        } else if (activeTab === "ideas") {
            filtered = filtered.filter(idea => !hasScript(idea));
        }

        if (sort === "newest") {

            filtered.sort(
                (a, b) =>
                    new Date(b.created_at || 0) -
                    new Date(a.created_at || 0)
            );

        } else if (sort === "oldest") {

            filtered.sort(
                (a, b) =>
                    new Date(a.created_at || 0) -
                    new Date(b.created_at || 0)
            );

        } else if (sort === "az") {

            filtered.sort((a, b) =>
                String(a.title || "").localeCompare(String(b.title || ""))
            );
        }

        return filtered;
    }

    // ==========================================
    // 8. UPDATE STATISTICS
    // ==========================================

    function updateStatistics() {

        if (totalIdeas) {
            totalIdeas.textContent = allIdeas.length;
        }

        if (totalFavorites) {
            totalFavorites.textContent =
                allIdeas.filter(isIdeaFavorite).length;
        }

        if (totalScripts) {
            totalScripts.textContent =
                allIdeas.filter(hasScript).length;
        }
    }

    // ==========================================
    // 9. LOAD CONTENT FROM SUPABASE
    // ==========================================

    async function loadLibrary() {

        if (loadingState) loadingState.hidden = false;
        if (libraryGrid) libraryGrid.replaceChildren();
        if (emptyState) emptyState.hidden = true;

        try {

            const { data, error } = await supabase
                .from("content_ideas")
                .select("*")
                .eq("user_id", currentUser.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            allIdeas = (data || []).map(item => ({
                ...item,
                is_favorite: Boolean(item.is_favorite)
            }));

            updateStatistics();
            renderLibrary();

            console.log(
                "IdeaForge library loaded:",
                allIdeas.length,
                "items"
            );

        } catch (error) {

            console.error("Library loading error:", error);

            showMessage(
                "Unable to load your library: " + error.message,
                "error"
            );

            if (emptyState) {

                emptyState.hidden = false;

                if (emptyTitle) {
                    emptyTitle.textContent = "Could not load library";
                }

                if (emptyDescription) {
                    emptyDescription.textContent = error.message;
                }
            }

        } finally {

            if (loadingState) {
                loadingState.hidden = true;
            }
        }
    }

    // ==========================================
    // 10. RENDER LIBRARY
    // ==========================================

    function renderLibrary() {

        if (!libraryGrid) return;

        libraryGrid.replaceChildren();

        const filtered = getFilteredIdeas();

        if (filtered.length === 0) {

            if (emptyState) {

                emptyState.hidden = false;

                if (allIdeas.length === 0) {

                    if (emptyTitle) {
                        emptyTitle.textContent = "Your library is empty";
                    }

                    if (emptyDescription) {
                        emptyDescription.textContent =
                            "Generate and save your first content idea to start building your library.";
                    }

                } else {

                    if (emptyTitle) {
                        emptyTitle.textContent = "No matching content found";
                    }

                    if (emptyDescription) {
                        emptyDescription.textContent =
                            "Try changing your search or filters to find your saved content.";
                    }
                }
            }

            return;
        }

        if (emptyState) {
            emptyState.hidden = true;
        }

        filtered.forEach(idea => {
            libraryGrid.appendChild(createIdeaCard(idea));
        });
    }

    // ==========================================
    // 11. CREATE CONTENT CARD
    // ==========================================

    function createIdeaCard(idea) {

        const card = createElement("article", "content-card");
        const fav = isIdeaFavorite(idea);

        const top = createElement("div", "card-top");

        const meta = createElement(
            "span",
            "card-meta",
            `${idea.platform || "General"} · ${getFormat(idea)}`
        );

        const favoriteButton = createButton(
            fav ? "♥" : "♡",
            "favorite-btn" + (fav ? " active" : ""),
            () => toggleFavorite(idea, favoriteButton)
        );

        favoriteButton.setAttribute("aria-pressed", String(fav));

        favoriteButton.title = fav
            ? "Remove from favorites"
            : "Add to favorites";

        top.append(meta, favoriteButton);

        const title = createElement(
            "h3",
            "",
            idea.title || "Untitled Idea"
        );

        const description = createElement(
            "p",
            "card-description",
            idea.description || "No description available."
        );

        const hookSection = createElement("div", "card-section");

        hookSection.append(
            createElement("strong", "", "Opening Hook"),
            createElement("p", "", idea.hook || "No opening hook available.")
        );

        const angleSection = createElement("div", "card-section");

        angleSection.append(
            createElement("strong", "", "Creative Angle"),
            createElement("p", "", idea.creative_angle || "No creative angle available.")
        );

        const scriptIndicator = hasScript(idea)
            ? createElement("span", "script-indicator", "✎ Script saved")
            : null;

        const footer = createElement("div", "card-footer");

        const editButton = createButton(
            "✎ Edit",
            "card-action",
            () => openEditModal(idea)
        );

        const copyButton = createButton(
            "Copy",
            "card-action",
            () => copyIdea(idea, copyButton)
        );

        const deleteButton = createButton(
            "Delete",
            "card-action delete",
            () => openDeleteModal(idea.id)
        );

        footer.append(editButton, copyButton, deleteButton);

        const date = createElement(
            "p",
            "card-date",
            "Saved " + formatDate(idea.created_at)
        );

        card.append(top, title, description, hookSection, angleSection);

        if (scriptIndicator) {
            card.appendChild(scriptIndicator);
        }

        card.append(footer, date);

        return card;
    }

    // ==========================================
    // 12. FAVORITE FUNCTIONALITY
    // ==========================================

    async function toggleFavorite(idea, button) {

        const previousValue = isIdeaFavorite(idea);
        const newValue = !previousValue;

        button.disabled = true;

        try {

            const { data, error } = await supabase
                .from("content_ideas")
                .update({ is_favorite: newValue })
                .eq("id", idea.id)
                .eq("user_id", currentUser.id)
                .select()
                .single();

            if (error) throw error;

            idea.is_favorite = data
                ? Boolean(data.is_favorite)
                : newValue;

            updateStatistics();
            renderLibrary();

            showMessage(
                idea.is_favorite
                    ? "Added to favorites."
                    : "Removed from favorites."
            );

        } catch (error) {

            console.error("Favorite error:", error);

            showMessage(
                "Unable to update favorite: " + error.message,
                "error"
            );

            button.disabled = false;
        }
    }

    // ==========================================
    // 13. COPY CONTENT
    // ==========================================

    async function copyIdea(idea, button) {

        const content = `
${idea.title || ""}

DESCRIPTION:
${idea.description || ""}

OPENING HOOK:
${idea.hook || ""}

CREATIVE ANGLE:
${idea.creative_angle || ""}

SCRIPT:
${idea.script || ""}

CALL TO ACTION:
${idea.call_to_action || ""}
`;

        try {

            await navigator.clipboard.writeText(content.trim());

            const originalText = button.textContent;

            button.textContent = "✓ Copied";

            setTimeout(() => {
                button.textContent = originalText;
            }, 1800);

            showMessage("Content copied to clipboard.");

        } catch (error) {

            console.error("Copy error:", error);

            showMessage(
                "Unable to copy content. Check clipboard permissions.",
                "error"
            );
        }
    }

    // ==========================================
    // 14. EDIT MODAL
    // ==========================================

    function openEditModal(idea) {

        document.getElementById("editId").value = idea.id;
        document.getElementById("editTitle").value = idea.title || "";
        document.getElementById("editDescription").value = idea.description || "";
        document.getElementById("editHook").value = idea.hook || "";
        document.getElementById("editAngle").value = idea.creative_angle || "";
        document.getElementById("editScript").value = idea.script || "";
        document.getElementById("editCTA").value = idea.call_to_action || "";

        editModal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeEditModal() {

        if (!editModal) return;

        editModal.hidden = true;
        document.body.style.overflow = "";
    }

    if (editForm) {

        editForm.addEventListener("submit", async event => {

            event.preventDefault();

            const saveButton = document.getElementById("saveEdit");
            const id = document.getElementById("editId").value;

            const updatedContent = {
                title: document.getElementById("editTitle").value.trim(),
                description: document.getElementById("editDescription").value.trim(),
                hook: document.getElementById("editHook").value.trim(),
                creative_angle: document.getElementById("editAngle").value.trim(),
                script: document.getElementById("editScript").value.trim(),
                call_to_action: document.getElementById("editCTA").value.trim()
            };

            if (!updatedContent.title) {
                showMessage("Please enter a content title.", "error");
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {

                const { data, error } = await supabase
                    .from("content_ideas")
                    .update(updatedContent)
                    .eq("id", id)
                    .eq("user_id", currentUser.id)
                    .select()
                    .single();

                if (error) throw error;

                const index = allIdeas.findIndex(
                    idea => String(idea.id) === String(id)
                );

                if (index !== -1 && data) {

                    allIdeas[index] = {
                        ...data,
                        is_favorite: Boolean(data.is_favorite)
                    };
                }

                updateStatistics();
                renderLibrary();
                closeEditModal();

                showMessage("Your content was updated successfully.");

            } catch (error) {

                console.error("Update error:", error);

                showMessage(
                    "Unable to update content: " + error.message,
                    "error"
                );

            } finally {

                saveButton.disabled = false;
                saveButton.textContent = "Save Changes";
            }
        });
    }

    // ==========================================
    // 15. DELETE CONTENT
    // ==========================================

    function openDeleteModal(id) {

        deleteTargetId = id;

        deleteModal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeDeleteModal() {

        if (!deleteModal) return;

        deleteModal.hidden = true;
        deleteTargetId = null;
        document.body.style.overflow = "";
    }

    async function deleteContent() {

        if (!deleteTargetId) return;

        const button = document.getElementById("confirmDelete");

        button.disabled = true;
        button.textContent = "Deleting...";

        try {

            const { error } = await supabase
                .from("content_ideas")
                .delete()
                .eq("id", deleteTargetId)
                .eq("user_id", currentUser.id);

            if (error) throw error;

            allIdeas = allIdeas.filter(
                idea => String(idea.id) !== String(deleteTargetId)
            );

            updateStatistics();
            renderLibrary();
            closeDeleteModal();

            showMessage("Content deleted successfully.");

        } catch (error) {

            console.error("Delete error:", error);

            showMessage(
                "Unable to delete content: " + error.message,
                "error"
            );

        } finally {

            button.disabled = false;
            button.textContent = "Delete Content";
        }
    }

    // ==========================================
    // 16. SEARCH AND FILTER EVENTS
    // ==========================================

    searchInput?.addEventListener("input", renderLibrary);
    searchInput?.addEventListener("search", renderLibrary);

    platformFilter?.addEventListener("change", renderLibrary);
    formatFilter?.addEventListener("change", renderLibrary);
    sortFilter?.addEventListener("change", renderLibrary);

    // ==========================================
    // 17. TAB FILTERS
    // ==========================================

    document.querySelectorAll(".tab-btn").forEach(button => {

        button.addEventListener("click", () => {

            document.querySelectorAll(".tab-btn").forEach(tab => {
                tab.classList.remove("active");
            });

            button.classList.add("active");

            activeTab = button.dataset.filter || "all";

            renderLibrary();
        });
    });

    const params = new URLSearchParams(window.location.search);

    if (params.get("filter") === "favorites") {

        activeTab = "favorites";

        document.querySelectorAll(".tab-btn").forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.filter === "favorites"
            );
        });
    }

    // ==========================================
    // 18. MODAL EVENTS
    // ==========================================

    document.getElementById("closeModal")
        ?.addEventListener("click", closeEditModal);

    document.getElementById("cancelEdit")
        ?.addEventListener("click", closeEditModal);

    document.getElementById("modalOverlay")
        ?.addEventListener("click", closeEditModal);

    document.getElementById("deleteOverlay")
        ?.addEventListener("click", closeDeleteModal);

    document.getElementById("cancelDelete")
        ?.addEventListener("click", closeDeleteModal);

    document.getElementById("confirmDelete")
        ?.addEventListener("click", deleteContent);

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeEditModal();
            closeDeleteModal();
        }
    });

    // ==========================================
    // 19. LIGHT AND DARK MODE
    // ==========================================

    const savedTheme =
        localStorage.getItem("ideaforge-theme") || "light";

    document.documentElement.dataset.theme = savedTheme;

    function updateThemeButton() {

        if (!themeToggle) return;

        const isDark =
            document.documentElement.dataset.theme === "dark";

        themeToggle.innerHTML = isDark
            ? "☀ <span>Light mode</span>"
            : "☾ <span>Dark mode</span>";
    }

    updateThemeButton();

    themeToggle?.addEventListener("click", () => {

        const current = document.documentElement.dataset.theme;

        const next = current === "dark" ? "light" : "dark";

        document.documentElement.dataset.theme = next;

        localStorage.setItem("ideaforge-theme", next);

        updateThemeButton();
    });

    // ==========================================
    // 20. MOBILE SIDEBAR
    // ==========================================

    menuToggle?.addEventListener("click", () => {
        sidebar?.classList.toggle("open");
    });

    document.addEventListener("click", event => {

        if (
            window.innerWidth <= 768 &&
            sidebar &&
            menuToggle &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            sidebar.classList.remove("open");
        }
    });

    // ==========================================
    // 21. SIGN OUT
    // ==========================================

    logoutBtn?.addEventListener("click", async () => {

        const confirmed = confirm("Are you sure you want to sign out?");

        if (!confirmed) return;

        const { error } = await supabase.auth.signOut();

        if (error) {

            console.error("Logout error:", error);

            showMessage(
                "Unable to sign out: " + error.message,
                "error"
            );

            return;
        }

        window.location.replace("login.html");
    });

    // ==========================================
    // 22. INITIALIZE LIBRARY
    // ==========================================

    await loadLibraryProfile();
    await loadLibrary();

    console.log(
        "IdeaForge My Content Library initialized successfully."
    );

});
