
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
    // 2. CHECK AUTHENTICATION
    // ==========================================

    const { data: authData, error: authError } =
        await supabase.auth.getUser();

    if (authError || !authData?.user) {
        window.location.replace("login.html");
        return;
    }

    const user = authData.user;

    // ==========================================
    // 3. GET HTML ELEMENTS
    // ==========================================

    const form = document.getElementById("ideaForm");
    const container = document.getElementById("ideasContainer");
    const results = document.getElementById("resultsSection");
    const generateBtn = document.getElementById("generateBtn");
    const regenerateBtn = document.getElementById("regenerateBtn");
    const message = document.getElementById("generatorMessage");
    const themeButton = document.getElementById("themeToggle");

    if (!form || !container || !results || !generateBtn || !message) {
        console.error("Required generator HTML elements are missing.");
        return;
    }

    let generatedIdeas = [];


    // ==========================================
    // LOAD CREATOR PROFILE AND PROFILE PHOTO
    // ==========================================

    // ==========================================
// CREATOR USAGE TRACKING
// ==========================================

async function trackUsage(metric) {
    try {
        const { data, error } = await supabase.rpc(
            "increment_creator_usage",
            {
                p_metric: metric
            }
        );

        if (error) {
            throw error;
        }

        console.log("Usage tracked successfully:", metric, data);

        return data;

    } catch (error) {
        console.error("Usage tracking error:", error);

        // Tracking errors must not interrupt IdeaForge features.
        return null;
    }
}

    async function loadGeneratorProfile() {
        const nameElement = document.getElementById(
            "generatorProfileName"
        );

        const initialElement = document.getElementById(
            "generatorAvatarInitial"
        );

        const imageElement = document.getElementById(
            "generatorAvatarImage"
        );

        if (!nameElement || !initialElement || !imageElement) {
            console.warn("Generator profile elements were not found.");
            return;
        }

        try {
            // Default name from Supabase Auth metadata
            let creatorName =
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.user_metadata?.display_name ||
                user.email?.split("@")[0] ||
                "Creator";

            let avatarUrl = "";

            // Load saved creator profile
            const { data: profile, error } = await supabase
                .from("creator_profiles")
                .select("full_name, avatar_url, niche, preferred_platform")
                .eq("id", user.id)
                .maybeSingle();

            if (error) {
                throw error;
            }

            
if (profile) {
    creatorName =
        profile.full_name?.trim() || creatorName;

    avatarUrl = profile.avatar_url || "";

    // Automatically select saved creator preferences
    function setSelectValue(selectId, savedValue) {
        const select = document.getElementById(selectId);

        if (!select || !savedValue) return;

        const matchingOption = Array.from(select.options)
            .find(option =>
                option.value.toLowerCase() === savedValue.toLowerCase() ||
                option.textContent.trim().toLowerCase() === savedValue.toLowerCase()
            );

        if (matchingOption) {
            select.value = matchingOption.value;
        } else {
            const option = document.createElement("option");
            option.value = savedValue;
            option.textContent = savedValue;

            select.appendChild(option);
            select.value = savedValue;
        }
    }

    setSelectValue("niche", profile.niche);
    setSelectValue("platform", profile.preferred_platform);
}


            // Display creator name
            nameElement.textContent = creatorName;

            // Display creator's initial
            initialElement.textContent =
                creatorName.charAt(0).toUpperCase();

            // Display profile photo if available
            if (avatarUrl) {
                imageElement.onload = () => {
                    imageElement.hidden = false;
                    initialElement.hidden = true;
                };

                imageElement.onerror = () => {
                    imageElement.hidden = true;
                    initialElement.hidden = false;
                };

                imageElement.src = avatarUrl;
            } else {
                imageElement.hidden = true;
                initialElement.hidden = false;
            }

        } catch (error) {
            console.error(
                "Unable to load generator profile:",
                error
            );

            nameElement.textContent =
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "Creator";

            initialElement.textContent =
                nameElement.textContent.charAt(0).toUpperCase();

            imageElement.hidden = true;
            initialElement.hidden = false;
        }
    }


    // ==========================================
    // 4. ERROR HANDLING
    // ==========================================

    async function getFunctionError(error) {
        let details = error?.message || "Unknown error";

        if (error?.context) {
            try {
                const response = error.context;

                if (typeof response.clone === "function") {
                    const body = await response.clone().json();

                    details =
                        body.details ||
                        body.error ||
                        body.message ||
                        details;
                }
            } catch {
                console.warn("Could not read function error details.");
            }
        }

        return details;
    }

    // ==========================================
    // 5. GET CREATOR SETTINGS
    // ==========================================

    function getSettings() {
        return {
            niche: document.getElementById("niche")?.value || "",
            platform: document.getElementById("platform")?.value || "",
            format: document.getElementById("format")?.value || "",
            topic: document.getElementById("topic")?.value.trim() || "",
            audience:
                document.getElementById("audience")?.value.trim() ||
                "General audience"
        };
    }

    // ==========================================
    // 6. CALL SUPABASE EDGE FUNCTION
    // ==========================================

    async function invokeAI(payload) {
        const { data, error } = await supabase.functions.invoke(
            "generate-ideas",
            {
                body: payload
            }
        );

        if (error) {
            console.error("Supabase AI error:", error);

            const details = await getFunctionError(error);
            throw new Error(details);
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        return data;
    }

    // ==========================================
    // 7. CREATE HTML ELEMENTS
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

    function createButton(text, className, callback) {
        const button = createElement("button", className, text);

        button.type = "button";
        button.addEventListener("click", callback);

        return button;
    }

    // ==========================================
    // 8. COPY TEXT
    // ==========================================

    async function copyText(text, button) {
        try {
            await navigator.clipboard.writeText(text);

            const originalText = button.textContent;
            button.textContent = "✓ Copied!";

            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);

        } catch (error) {
            console.error("Clipboard error:", error);

            message.textContent =
                "Unable to copy. Check your browser clipboard permissions.";
        }
    }

    // ==========================================
    // 9. GENERATE FIVE HOOKS
    // ==========================================

    async function generateHooks(idea, panel, button) {
        button.disabled = true;
        button.textContent = "Generating hooks...";

        try {
            const settings = getSettings();

            const data = await invokeAI({
                action: "generate_hooks",
                niche: idea.niche || settings.niche,
                platform: idea.platform || settings.platform,
                format: idea.format || settings.format,
                audience: settings.audience,
                title: idea.title,
                description: idea.description,
                creative_angle: idea.angle
            });

            if (!Array.isArray(data.hooks) || data.hooks.length !== 5) {
                throw new Error("AI did not return five hooks.");
            }

            panel.replaceChildren();

            panel.appendChild(
                createElement(
                    "h4",
                    "",
                    "Choose Your Best Opening Hook"
                )
            );

            data.hooks.forEach((hookItem, index) => {
                const hookText =
                    typeof hookItem === "string"
                        ? hookItem
                        : hookItem?.hook || hookItem?.text || "";

                const hookStyle =
                    typeof hookItem === "string"
                        ? "Hook"
                        : hookItem?.style || "Hook";

                if (!hookText.trim()) {
                    console.warn("Empty hook received:", hookItem);
                    return;
                }

                const hookCard = createElement(
                    "div",
                    "generated-hook"
                );

                const styleLabel = createElement(
                    "small",
                    "idea-meta",
                    hookStyle
                );

                const hookContent = createElement(
                    "p",
                    "",
                    `${index + 1}. ${hookText}`
                );

                const copyButton = createButton(
                    "Copy",
                    "save-btn",
                    () => copyText(hookText, copyButton)
                );

                const useButton = createButton(
                    "Use This Hook",
                    "save-btn",
                    () => {
                        idea.hook = hookText;

                        const displayedHook =
                            panel.parentElement.querySelector(
                                ".idea-hook-text"
                            );

                        if (displayedHook) {
                            displayedHook.textContent = hookText;
                        }

                        panel.querySelectorAll(".generated-hook")
                            .forEach(card => {
                                card.classList.remove("selected");
                            });

                        hookCard.classList.add("selected");

                        message.textContent =
                            "Your new opening hook has been selected.";
                    }
                );

                hookCard.append(
                    styleLabel,
                    hookContent,
                    copyButton,
                    useButton
                );

                panel.appendChild(hookCard);
            });

            message.textContent =
                "Success! Five AI-generated hooks are ready.";

        } catch (error) {
            console.error("Hook generation error:", error);

            panel.textContent =
                "Unable to generate hooks: " + error.message;

        } finally {
            button.disabled = false;
            button.textContent = "✦ Generate 5 Hooks";
        }
    }

    // ==========================================
    // 10. GENERATE AND SAVE SCRIPT
    // ==========================================

    async function generateScript(idea, panel, button) {
        button.disabled = true;
        button.textContent = "Writing script...";

        try {
            const settings = getSettings();

            const data = await invokeAI({
                action: "generate_script",
                niche: idea.niche || settings.niche,
                platform: idea.platform || settings.platform,
                format: idea.format || settings.format,
                audience: settings.audience,
                title: idea.title,
                description: idea.description,
                hook: idea.hook || "",
                creative_angle: idea.angle || ""
            });

            const script = data.script;

            if (!script || !script.full_script) {
                throw new Error("AI returned an incomplete script.");
            }

            // Track successful AI script generation.
await trackUsage("scripts_generated");

            panel.replaceChildren();

            const heading = createElement(
                "h4",
                "",
                script.title || "Your Content Script"
            );

            const duration = createElement(
                "p",
                "idea-meta",
                script.estimated_duration
                    ? "Estimated duration: " + script.estimated_duration
                    : ""
            );

            const editor = createElement(
                "textarea",
                "script-editor"
            );

            editor.value = script.full_script;
            editor.rows = 14;

            editor.setAttribute(
                "aria-label",
                "Edit your generated script"
            );

            const ctaLabel = createElement(
                "label",
                "",
                "Call to Action"
            );

            const ctaInput = createElement(
                "input",
                "script-cta"
            );

            ctaInput.type = "text";
            ctaInput.value = script.call_to_action || "";
            ctaInput.placeholder = "Enter your call to action...";

            const actions = createElement(
                "div",
                "script-actions"
            );

            // Copy script button
            const copyButton = createButton(
                "Copy Script",
                "save-btn",
                () => copyText(editor.value, copyButton)
            );

            // ======================================
            // SAVE SCRIPT BUTTON - FIXED
            // ======================================

            const saveButton = createButton(
                "Save Script",
                "save-btn",
                async () => {
                    if (saveButton.disabled) return;

                    saveButton.disabled = true;
                    saveButton.textContent = "Saving...";
                    message.textContent = "Saving your script...";

                    try {
                        const scriptText = editor.value.trim();
                        const ctaText = ctaInput.value.trim();

                        if (!scriptText) {
                            throw new Error(
                                "The script is empty. Please generate or write your script first."
                            );
                        }

                        const settingsNow = getSettings();

                        const scriptFields = {
                            script: scriptText,
                            call_to_action: ctaText,
                            target_audience: settingsNow.audience,
                            hook: idea.hook || ""
                        };

                        const ideaWasAlreadySaved = Boolean(idea.id);

let savedRow;

// If the idea already exists, update it.
if (idea.id) {
                            const { data, error } = await supabase
                                .from("content_ideas")
                                .update(scriptFields)
                                .eq("id", idea.id)
                                .eq("user_id", user.id)
                                .select("id")
                                .single();

                            if (error) throw error;

                            savedRow = data;

                        } else {
                            // If not saved, insert idea and script together.
                            const { data, error } = await supabase
                                .from("content_ideas")
                                .insert({
                                    user_id: user.id,
                                    title: idea.title,
                                    description: idea.description,
                                    hook: idea.hook || "",
                                    creative_angle: idea.angle || "",
                                    niche: idea.niche || settingsNow.niche,
                                    platform: idea.platform || settingsNow.platform,
                                    content_format: idea.format || settingsNow.format,
                                    status: "saved",
                                    ...scriptFields
                                })
                                .select("id")
                                .single();

                            if (error) throw error;

                            savedRow = data;
                        }

                        if (!savedRow?.id) {
                            throw new Error(
                                "Supabase did not return the saved idea ID."
                            );
                        }

                        // Store the ID so future saves update this row.
idea.id = savedRow.id;

// Count the idea only when this action created a new saved record.
if (!ideaWasAlreadySaved) {
    await trackUsage("ideas_saved");
}

saveButton.textContent = "✓ Script Saved";

                        message.textContent =
                            "Your idea and script have been saved successfully.";

                    } catch (error) {
                        console.error("Save script error:", error);

                        message.textContent =
                            "Unable to save script: " +
                            (error?.message || "Unknown error");

                        saveButton.textContent = "Try Again";

                    } finally {
                        saveButton.disabled = false;
                    }
                }
            );

            actions.append(
                copyButton,
                saveButton
            );

            panel.append(
                heading,
                duration,
                ctaLabel,
                ctaInput,
                editor,
                actions
            );

            message.textContent =
                "Your AI script is ready! You can edit, copy and save it.";

        } catch (error) {
            console.error("Script generation error:", error);

            panel.textContent =
                "Unable to generate script: " + error.message;

        } finally {
            button.disabled = false;
            button.textContent = "✦ Generate Script";
        }
    }

    // ==========================================
    // 11. RENDER IDEA CARDS
    // ==========================================

    function renderIdeas(ideas) {
        container.replaceChildren();

        ideas.forEach(idea => {
            const card = createElement(
                "article",
                "idea-card"
            );

            const meta = createElement(
                "div",
                "idea-meta",
                `${idea.platform} · ${idea.format}`
            );

            const title = createElement(
                "h3",
                "",
                idea.title
            );

            const description = createElement(
                "p",
                "",
                idea.description
            );

            const hookTitle = createElement(
                "strong",
                "",
                "Opening Hook"
            );

            const hook = createElement(
                "p",
                "idea-hook-text",
                idea.hook || "No hook available."
            );

            const angleTitle = createElement(
                "strong",
                "",
                "Creative Angle"
            );

            const angle = createElement(
                "p",
                "",
                idea.angle || "General"
            );

            // ==================================
            // SAVE IDEA BUTTON
            // ==================================

            const saveButton = createButton(
                "♡ Save Idea",
                "save-btn",
                async () => {
                    if (idea.id) {
                        message.textContent =
                            "This idea is already saved.";

                        saveButton.textContent = "✓ Saved";
                        return;
                    }

                    saveButton.disabled = true;
                    saveButton.textContent = "Saving...";

                    try {
                        const { data, error } = await supabase
                            .from("content_ideas")
                            .insert({
                                user_id: user.id,
                                title: idea.title,
                                description: idea.description,
                                hook: idea.hook,
                                creative_angle: idea.angle,
                                niche: idea.niche,
                                platform: idea.platform,
                                content_format: idea.format,
                                status: "saved"
                            })
                            .select("id")
                            .single();

                        if (error) throw error;

                        idea.id = data.id;

// Track the successful save.
await trackUsage("ideas_saved");

saveButton.textContent = "✓ Saved";

                        message.textContent =
                            "Your idea has been saved to Supabase.";

                    } catch (error) {
                        console.error("Save idea error:", error);

                        message.textContent =
                            "Unable to save idea: " + error.message;

                        saveButton.disabled = false;
                        saveButton.textContent = "Try Again";
                    }
                }
            );

            // ==================================
            // HOOK GENERATOR PANEL
            // ==================================

            const hookPanel = createElement(
                "div",
                "hooks-panel"
            );

            hookPanel.hidden = true;

            const hooksButton = createButton(
                "✦ Generate 5 Hooks",
                "save-btn",
                () => {
                    hookPanel.hidden = false;

                    generateHooks(
                        idea,
                        hookPanel,
                        hooksButton
                    );
                }
            );

            // ==================================
            // SCRIPT GENERATOR PANEL
            // ==================================

            const scriptPanel = createElement(
                "div",
                "script-panel"
            );

            scriptPanel.hidden = true;

            const scriptButton = createButton(
                "✦ Generate Script",
                "save-btn",
                () => {
                    scriptPanel.hidden = false;

                    generateScript(
                        idea,
                        scriptPanel,
                        scriptButton
                    );
                }
            );

            const tools = createElement(
                "div",
                "idea-tools"
            );

            tools.append(
                hooksButton,
                scriptButton
            );

            card.append(
                meta,
                title,
                description,
                hookTitle,
                hook,
                angleTitle,
                angle,
                saveButton,
                tools,
                hookPanel,
                scriptPanel
            );

            container.appendChild(card);
        });
    }

    // ==========================================
    // 12. GENERATE FIVE IDEAS
    // ==========================================

    async function generate() {
        const settings = getSettings();

        const {
            niche,
            platform,
            format,
            topic,
            audience
        } = settings;

        if (!niche || !platform || !format) {
            message.textContent =
                "Please complete all required selections.";

            return;
        }

        message.textContent =
            "IdeaForge AI is creating your ideas...";

        results.hidden = true;

        const data = await invokeAI({
            action: "generate_ideas",
            niche,
            platform,
            format,
            topic,
            audience
        });

        if (
            !Array.isArray(data.ideas) ||
            data.ideas.length !== 5
        ) {
            console.error("Invalid AI response:", data);

            throw new Error(
                "AI did not return exactly five ideas."
            );
        }

        // Track five successfully generated ideas.
await trackUsage("ideas_generated");

        generatedIdeas = data.ideas.map(idea => ({
            title: idea.title,
            description: idea.description,
            hook: idea.hook,
            angle: idea.angle,
            niche,
            platform,
            format,
            id: null
        }));

        renderIdeas(generatedIdeas);

        results.hidden = false;

        message.textContent =
            "Success! Your five AI-generated ideas are ready.";
    }

    // ==========================================
    // 13. GENERATE BUTTON
    // ==========================================

    form.addEventListener("submit", async event => {
        event.preventDefault();

        generateBtn.disabled = true;
        generateBtn.textContent = "AI is thinking...";

        try {
            await generate();

        } catch (error) {
            console.error("Generation failed:", error);

            message.textContent =
                "AI Error: " + error.message;

        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "✳ Generate 5 Ideas";
        }
    });

    // ==========================================
    // 14. REGENERATE BUTTON
    // ==========================================

    if (regenerateBtn) {
        regenerateBtn.addEventListener("click", async () => {
            regenerateBtn.disabled = true;
            regenerateBtn.textContent = "Regenerating...";

            try {
                await generate();

            } catch (error) {
                console.error("Regeneration failed:", error);

                message.textContent =
                    "AI Error: " + error.message;

            } finally {
                regenerateBtn.disabled = false;
                regenerateBtn.textContent = "↻ Regenerate";
            }
        });
    }

    // ==========================================
    // 15. LIGHT / DARK MODE
    // ==========================================

    if (themeButton) {
        const savedTheme =
            localStorage.getItem("ideaforge-theme") || "light";

        document.documentElement.dataset.theme = savedTheme;

        themeButton.textContent =
            savedTheme === "dark" ? "☀" : "☾";

        themeButton.addEventListener("click", () => {
            const currentTheme =
                document.documentElement.dataset.theme;

            const nextTheme =
                currentTheme === "dark" ? "light" : "dark";

            document.documentElement.dataset.theme = nextTheme;

            localStorage.setItem(
                "ideaforge-theme",
                nextTheme
            );

            themeButton.textContent =
                nextTheme === "dark" ? "☀" : "☾";
        });
    }

    
    // ==========================================
    // 16. LOAD CREATOR PROFILE
    // ==========================================

    await loadGeneratorProfile();

    // ==========================================
    // 17. INITIALIZATION COMPLETE
    // ==========================================

    console.log(
      "IdeaForge AI Generator and Creative Studio initialized successfully."
    );

});
