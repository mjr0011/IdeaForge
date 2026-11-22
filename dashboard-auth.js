
document.addEventListener("DOMContentLoaded", async () => {
    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase client not initialized.");
        return;
    }

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        window.location.replace("login.html");
        return;
    }

    const user = data.session.user;

    // Load this user's profile
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, username, plan")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Could not load profile:", profileError.message);
    }

    // Update dashboard greeting if this element exists
    const greeting = document.getElementById("userGreeting");

    if (greeting) {
        greeting.textContent = `Welcome, ${profile?.full_name || user.email}!`;
    }

    // Show the user's email if this element exists
    const emailElement = document.getElementById("userEmail");

    if (emailElement) {
        emailElement.textContent = user.email || "";
    }

    // Show the current plan if this element exists
    const planElement = document.getElementById("userPlan");

    if (planElement) {
        planElement.textContent = profile?.plan === "pro" ? "Pro Plan" : "Free Plan";
    }

    // LOGOUT
    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            logoutButton.disabled = true;

            const { error: logoutError } = await supabase.auth.signOut();

            if (logoutError) {
                console.error("Logout failed:", logoutError.message);
                logoutButton.disabled = false;
                alert("Unable to log out. Please try again.");
                return;
            }

            window.location.replace("login.html");
        });
    }
});
