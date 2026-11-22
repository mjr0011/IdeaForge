
document.addEventListener("DOMContentLoaded", () => {
    const supabase = window.supabaseClient;

    // Display messages
    function showMessage(element, text, isError = false) {
        if (!element) return;

        element.textContent = text;
        element.style.color = isError ? "#dc2626" : "#16a34a";
    }

    // SHOW / HIDE PASSWORD
    document.querySelectorAll(".toggle-password").forEach(button => {
        // Remove inline onclick handlers to avoid double toggling
        button.removeAttribute("onclick");

        button.addEventListener("click", () => {
            const input = button
                .closest(".password-wrap")
                ?.querySelector("input");

            if (!input) return;

            const visible = input.type === "password";

            input.type = visible ? "text" : "password";
            button.textContent = visible ? "Hide" : "Show";
            button.setAttribute(
                "aria-label",
                visible ? "Hide password" : "Show password"
            );
            button.setAttribute(
                "aria-pressed",
                visible ? "true" : "false"
            );
        });
    });

    // Check Supabase connection
    if (!supabase) {
        console.error("Supabase client not initialized.");

        const message = document.getElementById("formMessage");
        showMessage(message, "Connection error. Please refresh the page.", true);
        return;
    }

    console.log("IdeaForge authentication is ready.");

    // ==========================
    // SIGNUP
    // ==========================

    const signupForm = document.getElementById("signupForm");

    if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const button = signupForm.querySelector('[type="submit"]');
            const message = document.getElementById("formMessage");

            // These IDs MATCH your signup.html
            const fullName = document.getElementById("name")?.value.trim();
            const email = document.getElementById("email")?.value.trim();
            const password = document.getElementById("password")?.value;
            const confirmPassword =
                document.getElementById("confirmPassword")?.value;

            if (!fullName || !email || !password || !confirmPassword) {
                showMessage(message, "Please complete all fields.", true);
                return;
            }

            if (password.length < 8) {
                showMessage(
                    message,
                    "Password must contain at least 8 characters.",
                    true
                );
                return;
            }

            if (password !== confirmPassword) {
                showMessage(message, "Passwords do not match.", true);
                return;
            }

            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Creating account...";

            try {
                const dashboardUrl = new URL(
                    "dashboard.html",
                    window.location.href
                ).href;

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName
                        },
                        emailRedirectTo: dashboardUrl
                    }
                });

                if (error) throw error;

                if (data.session) {
                    showMessage(
                        message,
                        "Account created successfully! Redirecting..."
                    );

                    window.location.href = dashboardUrl;
                } else {
                    showMessage(
                        message,
                        "Account created! Please check your email and confirm your account before logging in."
                    );

                    signupForm.reset();
                }

            } catch (error) {
                console.error("Signup error:", error);

                showMessage(
                    message,
                    error.message || "Unable to create your account.",
                    true
                );

            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }

    // ==========================
    // LOGIN
    // ==========================

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const button = loginForm.querySelector('[type="submit"]');
            const message = document.getElementById("formMessage");

            // These IDs MATCH your login.html
            const email = document.getElementById("email")?.value.trim();
            const password = document.getElementById("password")?.value;

            if (!email || !password) {
                showMessage(message, "Enter your email and password.", true);
                return;
            }

            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Signing in...";

            try {
                const { data, error } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) throw error;

                if (data.session) {
                    showMessage(
                        message,
                        "Login successful! Opening your dashboard..."
                    );

                    window.location.href = new URL(
                        "dashboard.html",
                        window.location.href
                    ).href;
                }

            } catch (error) {
                console.error("Login error:", error);

                showMessage(
                    message,
                    error.message || "Login failed. Check your credentials.",
                    true
                );

            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }
});
