// ========================================
// IDEAFORGE — LANDING PAGE JAVASCRIPT
// ========================================

"use strict";

(() => {

    // ========================================
    // 1. THEME MANAGEMENT
    // ========================================

    const root = document.documentElement;

    const themeToggle = document.getElementById(
        "themeToggle"
    );

    const themeStorageKey = "ideaforge-theme";

    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem(
            themeStorageKey
        );
    } catch (error) {
        console.warn(
            "Unable to access saved theme preference:",
            error
        );
    }

    const validSavedTheme =
        savedTheme === "light" || savedTheme === "dark";

    const prefersDark =
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

    const initialTheme = validSavedTheme
        ? savedTheme
        : prefersDark
            ? "dark"
            : "light";


    function updateThemeButton(theme) {

        if (!themeToggle) return;

        const isDark = theme === "dark";

        themeToggle.textContent =
            isDark ? "☀" : "☾";

        themeToggle.setAttribute(
            "aria-label",
            isDark
                ? "Switch to light theme"
                : "Switch to dark theme"
        );

        themeToggle.setAttribute(
            "aria-pressed",
            String(isDark)
        );

        themeToggle.title = isDark
            ? "Switch to light mode"
            : "Switch to dark mode";
    }


    function applyTheme(theme, savePreference = false) {

        const selectedTheme =
            theme === "dark" ? "dark" : "light";

        // Apply theme to the entire document.
        root.setAttribute(
            "data-theme",
            selectedTheme
        );

        // Update native browser controls.
        root.style.colorScheme = selectedTheme;

        updateThemeButton(selectedTheme);

        if (savePreference) {

            try {
                localStorage.setItem(
                    themeStorageKey,
                    selectedTheme
                );

            } catch (error) {

                console.warn(
                    "Unable to save theme preference:",
                    error
                );
            }
        }
    }


    // Set theme immediately on page initialization.
    applyTheme(initialTheme);


    // Listen for theme button clicks.
    if (themeToggle) {

        themeToggle.addEventListener("click", () => {

            const currentTheme =
                root.getAttribute("data-theme");

            const nextTheme =
                currentTheme === "dark"
                    ? "light"
                    : "dark";

            applyTheme(nextTheme, true);

        });

    } else {

        console.error(
            "IdeaForge theme button (#themeToggle) was not found."
        );
    }


    // Follow browser theme changes until the user
    // has chosen and saved their own preference.
    if (window.matchMedia) {

        const darkModeQuery = window.matchMedia(
            "(prefers-color-scheme: dark)"
        );

        darkModeQuery.addEventListener?.(
            "change",
            event => {

                let preference = null;

                try {
                    preference = localStorage.getItem(
                        themeStorageKey
                    );
                } catch {
                    // Use the browser preference.
                }

                if (
                    preference !== "light" &&
                    preference !== "dark"
                ) {
                    applyTheme(
                        event.matches ? "dark" : "light"
                    );
                }

            }
        );

    }


    // Synchronize changes across browser tabs.
    window.addEventListener("storage", event => {

        if (event.key !== themeStorageKey) return;

        if (
            event.newValue === "light" ||
            event.newValue === "dark"
        ) {
            applyTheme(event.newValue);
        }

    });


    // ========================================
    // 2. MOBILE NAVIGATION
    // ========================================

    const menuButton = document.getElementById(
        "mobileMenu"
    );

    const nav = document.getElementById(
        "mainNav"
    );


    function closeMobileMenu() {

        if (!menuButton || !nav) return;

        nav.classList.remove("open");

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }


    if (menuButton && nav) {

        menuButton.addEventListener("click", () => {

            const isOpen =
                nav.classList.toggle("open");

            menuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        });


        nav.querySelectorAll("a").forEach(link => {

            link.addEventListener(
                "click",
                closeMobileMenu
            );

        });


        document.addEventListener("keydown", event => {

            if (event.key === "Escape") {
                closeMobileMenu();
            }

        });


        document.addEventListener("click", event => {

            if (
                !nav.contains(event.target) &&
                !menuButton.contains(event.target)
            ) {
                closeMobileMenu();
            }

        });

    }


    // ========================================
    // 3. AUTOMATIC COPYRIGHT YEAR
    // ========================================

    const yearElement = document.getElementById(
        "year"
    );

    if (yearElement) {

        yearElement.textContent =
            new Date().getFullYear();

    }


    // ========================================
    // 4. INTERACTIVE DEMO IDEAS
    // ========================================

    const demoIdeas = {

        YouTube: [

            [
                "The beginner's roadmap to {niche}",
                "Break the topic into a clear, step-by-step video."
            ],

            [
                "5 mistakes people make with {niche}",
                "Explore common mistakes and explain what to do instead."
            ],

            [
                "What I wish I knew about {niche}",
                "Build a relatable lesson around practical experience."
            ]

        ],

        TikTok: [

            [
                "One {niche} tip you can use today",
                "Share one useful takeaway in a short, engaging video."
            ],

            [
                "Stop making this {niche} mistake",
                "Challenge a common habit and offer a better approach."
            ],

            [
                "A quick {niche} myth-buster",
                "Use an unexpected fact to spark curiosity."
            ]

        ],

        Instagram: [

            [
                "The {niche} checklist worth saving",
                "Turn helpful tips into an easy-to-save carousel."
            ],

            [
                "3 things to know about {niche}",
                "Create a visual breakdown your audience can revisit."
            ],

            [
                "A simple {niche} before-and-after",
                "Use a relatable story to show progress and lessons."
            ]

        ],

        Facebook: [

            [
                "Let's talk about {niche}",
                "Start a conversation around a relevant audience question."
            ],

            [
                "One lesson about {niche} worth sharing",
                "Share a useful experience and encourage discussion."
            ],

            [
                "What's your biggest {niche} question?",
                "Invite your audience to share their challenges."
            ]

        ],

        Blog: [

            [
                "A beginner's guide to {niche}",
                "Build an accessible article with helpful explanations."
            ],

            [
                "Common questions about {niche}, answered",
                "Create a practical resource around audience questions."
            ],

            [
                "How to make progress with {niche}",
                "Break a useful process into manageable steps."
            ]

        ]

    };


    const toneDescriptions = {

        Educational:
            "Keep it practical, clear, and easy to follow.",

        Entertaining:
            "Use an engaging, light, and memorable approach.",

        Storytelling:
            "Build around a relatable story and human moment.",

        Inspirational:
            "Focus on progress, possibility, and an encouraging takeaway."

    };


    // ========================================
    // 5. RENDER DEMO IDEAS
    // ========================================

    const generateButton = document.getElementById(
        "demoGenerate"
    );

    const resultsContainer = document.getElementById(
        "demoIdeas"
    );

    const platformInput = document.getElementById(
        "demoPlatform"
    );

    const nicheInput = document.getElementById(
        "demoNiche"
    );

    const toneInput = document.getElementById(
        "demoTone"
    );


    function renderDemoIdeas() {

        if (
            !generateButton ||
            !resultsContainer ||
            !platformInput ||
            !nicheInput
        ) {
            console.warn(
                "IdeaForge demo elements are incomplete."
            );

            return;
        }


        const platform = platformInput.value;

        const niche =
            nicheInput.value.trim().slice(0, 60) ||
            "your niche";

        const tone =
            toneInput?.value || "Educational";

        const ideas =
            demoIdeas[platform] || demoIdeas.YouTube;

        const toneDescription =
            toneDescriptions[tone] ||
            toneDescriptions.Educational;


        // Build safe HTML elements.
        resultsContainer.replaceChildren();


        ideas.forEach((idea, index) => {

            const row = document.createElement(
                "article"
            );

            row.className = "idea-row";


            const number = document.createElement(
                "span"
            );

            number.className = "idea-number";

            number.textContent =
                String(index + 1).padStart(2, "0");


            const content = document.createElement(
                "div"
            );


            const title = document.createElement(
                "b"
            );

            title.textContent =
                idea[0].replaceAll("{niche}", niche);


            const description = document.createElement(
                "small"
            );

            description.textContent =
                `${idea[1]} ${toneDescription}`;


            const arrow = document.createElement(
                "span"
            );

            arrow.className = "idea-arrow";

            arrow.textContent = "↗";


            content.append(
                title,
                description
            );

            row.append(
                number,
                content,
                arrow
            );

            resultsContainer.appendChild(row);

        });


    }


    if (generateButton) {

        generateButton.addEventListener("click", () => {

            if (generateButton.disabled) return;

            generateButton.disabled = true;

            renderDemoIdeas();

            const originalText =
                'Generate ideas ✦';

            generateButton.textContent =
                "Ideas refreshed ✓";


            window.setTimeout(() => {

                generateButton.textContent =
                    originalText;

                generateButton.disabled = false;

            }, 1400);

        });

    }


    // ========================================
    // 6. INITIALIZATION
    // ========================================

    console.log(
        "IdeaForge landing page initialized successfully."
    );

})();

(() => {
  const demoData = {
    ai: {
      sets: [
        [
          {
            tag: "High Retention",
            hook: "I replaced 4 hours of daily content planning with this 3-step workflow...",
            script: "<strong>[0:00 - Hook]</strong> I replaced 4 hours of daily content planning with this 3-step workflow.<br><strong>[0:05 - Value]</strong> First lock your niche angle, pick one hook, and draft a tight outline in under 5 minutes."
          },
          {
            tag: "Contrarian",
            hook: "Stop posting every day until you fix this one script mistake.",
            script: "<strong>[0:00 - Hook]</strong> Stop posting every day until you fix this one script mistake.<br><strong>[0:05 - Value]</strong> Rushing rough drafts trains viewers to swipe past; lead with a clear payoff in the first 3 seconds."
          }
        ],
        [
          {
            tag: "Curiosity Gap",
            hook: "The one prompt change that made my rough notes sound like a real script.",
            script: "<strong>[0:00 - Hook]</strong> The one prompt change that made my rough notes sound like a real script.<br><strong>[0:05 - Value]</strong> Give your AI tool your exact audience, tone, and takeaway before asking for a draft."
          },
          {
            tag: "Actionable",
            hook: "Turn one rough idea into 3 short-form hooks in 60 seconds.",
            script: "<strong>[0:00 - Hook]</strong> Turn one rough idea into 3 short-form hooks in 60 seconds.<br><strong>[0:05 - Value]</strong> Write one bold claim, one common mistake, and one quick win from the same core lesson."
          }
        ]
      ]
    },
    fitness: {
      sets: [
        [
          {
            tag: "Myth Buster",
            hook: "You don't need a 90-minute workout to build consistency this month.",
            script: "<strong>[0:00 - Hook]</strong> You don't need a 90-minute workout to build consistency this month.<br><strong>[0:05 - Value]</strong> Start with a 25-minute full-body routine you can finish even on busy days."
          },
          {
            tag: "Relatable",
            hook: "Why your workout routine falls apart by week three (and how to fix it).",
            script: "<strong>[0:00 - Hook]</strong> Why your workout routine falls apart by week three—and how to fix it.<br><strong>[0:05 - Value]</strong> Plan for low-energy days upfront with a lighter backup session instead of skipping completely."
          }
        ]
      ]
    },
    finance: {
      sets: [
        [
          {
            tag: "Clarity",
            hook: "3 money habits that quietly keep creators stressed at the end of the month.",
            script: "<strong>[0:00 - Hook]</strong> 3 money habits that quietly keep creators stressed at the end of the month.<br><strong>[0:05 - Value]</strong> Separate taxes, set a baseline paycheck, and track irregular income in one simple sheet."
          },
          {
            tag: "Direct",
            hook: "Before you buy another tool, check if it actually brings in revenue.",
            script: "<strong>[0:00 - Hook]</strong> Before you buy another tool, check if it actually brings in revenue.<br><strong>[0:05 - Value]</strong> Audit recurring subscriptions monthly and cut anything sitting unused for 30 days."
          }
        ]
      ]
    }
  };

  let currentNiche = "ai";
  let currentSetIndex = 0;
  let currentHookIndex = 0;

  const nicheTabs = document.querySelectorAll(".niche-tab");
  const hooksList = document.getElementById("hooksList");
  const scriptPreview = document.getElementById("scriptPreview");
  const shuffleHookBtn = document.getElementById("shuffleHookBtn");

  if (!hooksList || !scriptPreview) return;

  function renderPreview() {
    const nicheObj = demoData[currentNiche];
    const hooks = nicheObj.sets[currentSetIndex % nicheObj.sets.length];
    const activeHook = hooks[currentHookIndex % hooks.length];

    hooksList.innerHTML = hooks
      .map((item, idx) => `
        <button type="button" class="hook-item ${idx === currentHookIndex ? "active" : ""}" data-index="${idx}">
          <span class="hook-tag">${item.tag}</span>
          <p>"${item.hook}"</p>
        </button>
      `)
      .join("");

    scriptPreview.innerHTML = activeHook.script;

    hooksList.querySelectorAll(".hook-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentHookIndex = Number(btn.dataset.index);
        renderPreview();
      });
    });
  }

  nicheTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      nicheTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentNiche = tab.dataset.niche;
      currentSetIndex = 0;
      currentHookIndex = 0;
      renderPreview();
    });
  });

  shuffleHookBtn?.addEventListener("click", () => {
    const totalSets = demoData[currentNiche].sets.length;
    currentSetIndex = (currentSetIndex + 1) % totalSets;
    currentHookIndex = 0;
    renderPreview();
  });

  renderPreview();
})();