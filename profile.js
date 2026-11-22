
document.addEventListener("DOMContentLoaded", async () => {

    // ==========================================
    // 1. INITIAL SETUP
    // ==========================================

    const supabase = window.supabaseClient;

    if (!supabase) {
        alert("Supabase connection failed. Check supabase-config.js.");
        return;
    }

    const BUCKET = "creator-avatars";
    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    const profileForm = document.getElementById("profileForm");
    const passwordForm = document.getElementById("passwordForm");

    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const updatePasswordBtn = document.getElementById("updatePasswordBtn");

    const profileMessage = document.getElementById("profileMessage");
    const passwordMessage = document.getElementById("passwordMessage");

    const avatarInput = document.getElementById("avatarInput");
    const uploadAvatarBtn = document.getElementById("uploadAvatarBtn");
    const removeAvatarBtn = document.getElementById("removeAvatarBtn");
    const avatarMessage = document.getElementById("avatarMessage");
    const profileAvatar = document.getElementById("profileAvatar");
    const profileAvatarImage = document.getElementById("profileAvatarImage");

    let currentUser = null;
    let currentAvatarUrl = "";

    // ==========================================
    // 2. HELPER FUNCTIONS
    // ==========================================

    function showMessage(element, message, type = "") {
        element.textContent = message;
        element.className = "form-message";

        if (type) {
            element.classList.add(type);
        }
    }

    function getInitials(name, email = "") {
        const value = name || email || "User";

        return value
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join("") || "U";
    }

    function updateAvatar(name, email) {
        const initials = getInitials(name, email);

        document.getElementById("topAvatar").textContent = initials;
        document.getElementById("profileDisplayName").textContent =
            name || "Your Profile";

        if (!currentAvatarUrl) {
            profileAvatar.textContent = initials;
            profileAvatar.hidden = false;
            profileAvatarImage.hidden = true;
            profileAvatarImage.removeAttribute("src");
        }
    }

    function displayAvatar(url) {
        currentAvatarUrl = url || "";

        if (currentAvatarUrl) {
            profileAvatarImage.src = currentAvatarUrl;
            profileAvatarImage.hidden = false;
            profileAvatar.hidden = true;
            removeAvatarBtn.hidden = false;
        } else {
            profileAvatarImage.hidden = true;
            profileAvatarImage.removeAttribute("src");
            profileAvatar.hidden = false;
            removeAvatarBtn.hidden = true;
        }
    }

    function getStoragePath(publicUrl) {
        if (!publicUrl) return null;

        try {
            const marker = `/object/public/${BUCKET}/`;
            const position = publicUrl.indexOf(marker);

            if (position === -1) return null;

            return decodeURIComponent(
                publicUrl.substring(position + marker.length).split("?")[0]
            );
        } catch (error) {
            console.error("Could not extract avatar path:", error);
            return null;
        }
    }

    // ==========================================
    // 3. CHECK AUTHENTICATION
    // ==========================================

    async function checkAuthentication() {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.href = "login.html";
            return false;
        }

        currentUser = data.user;

        document.getElementById("email").value =
            currentUser.email || "";

        return true;
    }

    // ==========================================
    // 4. LOAD CREATOR PROFILE
    // ==========================================

    async function loadProfile() {
        showMessage(profileMessage, "Loading your profile...");

        const { data: profile, error } = await supabase
            .from("creator_profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

        if (error) {
            console.error("Profile loading error:", error);

            showMessage(
                profileMessage,
                "Unable to load your profile.",
                "error"
            );
            return;
        }

        const metadata = currentUser.user_metadata || {};

        const fullName =
            profile?.full_name ||
            metadata.full_name ||
            metadata.display_name ||
            "";

        document.getElementById("fullName").value = fullName;
        document.getElementById("username").value =
            profile?.username || "";

        document.getElementById("bio").value =
            profile?.bio || "";

        document.getElementById("niche").value =
            profile?.niche || "";

        document.getElementById("preferredPlatform").value =
            profile?.preferred_platform || "";

        updateAvatar(fullName, currentUser.email);
        displayAvatar(profile?.avatar_url || "");

        showMessage(profileMessage, "");
    }

    // ==========================================
    // 5. SAVE PROFILE
    // ==========================================

    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullName =
            document.getElementById("fullName").value.trim();

        const username =
            document.getElementById("username").value.trim().toLowerCase();

        const bio =
            document.getElementById("bio").value.trim();

        const niche =
            document.getElementById("niche").value.trim();

        const preferredPlatform =
            document.getElementById("preferredPlatform").value;

        if (!fullName) {
            showMessage(
                profileMessage,
                "Please enter your full name.",
                "error"
            );
            return;
        }

        if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
            showMessage(
                profileMessage,
                "Username must be 3–30 characters using letters, numbers or underscores.",
                "error"
            );
            return;
        }

        const profileData = {
            id: currentUser.id,
            full_name: fullName,
            username: username || null,
            bio,
            niche,
            preferred_platform: preferredPlatform,
            avatar_url: currentAvatarUrl,
            updated_at: new Date().toISOString()
        };

        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Saving...";

        showMessage(profileMessage, "Saving your changes...");

        try {
            const { error } = await supabase
                .from("creator_profiles")
                .upsert(profileData, {
                    onConflict: "id"
                });

            if (error) {
                console.error("Profile save error:", error);

                showMessage(
                    profileMessage,
                    error.code === "23505"
                        ? "That username is already taken."
                        : error.message,
                    "error"
                );
                return;
            }

            const { error: metadataError } =
                await supabase.auth.updateUser({
                    data: {
                        full_name: fullName,
                        display_name: fullName
                    }
                });

            if (metadataError) {
                console.warn("Metadata update warning:", metadataError);
            } else {
                const { data } = await supabase.auth.getUser();
                currentUser = data.user || currentUser;
            }

            updateAvatar(fullName, currentUser.email);

            showMessage(
                profileMessage,
                "Profile saved successfully!",
                "success"
            );

        } catch (error) {
            console.error(error);

            showMessage(
                profileMessage,
                "Something went wrong. Please try again.",
                "error"
            );

        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "Save Changes";
        }
    });

    // ==========================================
    // 6. UPLOAD PROFILE PHOTO
    // ==========================================

    uploadAvatarBtn.addEventListener("click", () => {
        avatarInput.click();
    });

    avatarInput.addEventListener("change", async () => {

        const file = avatarInput.files[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            showMessage(
                avatarMessage,
                "Please select a JPG, PNG or WEBP image.",
                "error"
            );

            avatarInput.value = "";
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showMessage(
                avatarMessage,
                "Image must not exceed 5MB.",
                "error"
            );

            avatarInput.value = "";
            return;
        }

        uploadAvatarBtn.disabled = true;
        uploadAvatarBtn.textContent = "Uploading...";

        showMessage(avatarMessage, "Uploading your photo...");

        let uploadedPath = null;

        try {

            const extension = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp"
            }[file.type];

            const filePath =
                `${currentUser.id}/${Date.now()}.${extension}`;

            // Upload image to Supabase Storage
            const { error: uploadError } = await supabase
                .storage
                .from(BUCKET)
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) {
                throw uploadError;
            }

            uploadedPath = filePath;

            // Get public image URL
            const { data: urlData } = supabase
                .storage
                .from(BUCKET)
                .getPublicUrl(filePath);

            const newAvatarUrl = urlData.publicUrl;

            // Save image URL to creator_profiles
            const { error: databaseError } = await supabase
                .from("creator_profiles")
                .upsert({
                    id: currentUser.id,
                    avatar_url: newAvatarUrl
                }, {
                    onConflict: "id"
                });

            if (databaseError) {
                throw databaseError;
            }

            // Delete previous image only after new one is saved
            const oldPath = getStoragePath(currentAvatarUrl);

            if (oldPath && oldPath !== uploadedPath) {
                const { error: deleteError } = await supabase
                    .storage
                    .from(BUCKET)
                    .remove([oldPath]);

                if (deleteError) {
                    console.warn(
                        "Old avatar cleanup warning:",
                        deleteError
                    );
                }
            }

            displayAvatar(newAvatarUrl);

            showMessage(
                avatarMessage,
                "Profile photo uploaded successfully!",
                "success"
            );

        } catch (error) {

            console.error("Avatar upload error:", error);

            // Clean up newly uploaded image if saving failed
            if (uploadedPath) {
                await supabase
                    .storage
                    .from(BUCKET)
                    .remove([uploadedPath]);
            }

            showMessage(
                avatarMessage,
                error.message || "Unable to upload your photo.",
                "error"
            );

        } finally {

            uploadAvatarBtn.disabled = false;
            uploadAvatarBtn.textContent = "Upload Photo";
            avatarInput.value = "";

        }
    });

    // ==========================================
    // 7. REMOVE PROFILE PHOTO
    // ==========================================

    removeAvatarBtn.addEventListener("click", async () => {

        if (!currentAvatarUrl) return;

        const confirmed = confirm(
            "Are you sure you want to remove your profile photo?"
        );

        if (!confirmed) return;

        removeAvatarBtn.disabled = true;
        showMessage(avatarMessage, "Removing your photo...");

        try {

            const oldPath = getStoragePath(currentAvatarUrl);

            if (oldPath) {
                const { error: deleteError } = await supabase
                    .storage
                    .from(BUCKET)
                    .remove([oldPath]);

                if (deleteError) {
                    throw deleteError;
                }
            }

            const { error: databaseError } = await supabase
                .from("creator_profiles")
                .update({
                    avatar_url: "",
                    updated_at: new Date().toISOString()
                })
                .eq("id", currentUser.id);

            if (databaseError) {
                throw databaseError;
            }

            displayAvatar("");

            const fullName =
                document.getElementById("fullName").value.trim();

            updateAvatar(fullName, currentUser.email);

            showMessage(
                avatarMessage,
                "Profile photo removed successfully!",
                "success"
            );

        } catch (error) {

            console.error("Avatar removal error:", error);

            showMessage(
                avatarMessage,
                error.message || "Unable to remove your photo.",
                "error"
            );

        } finally {
            removeAvatarBtn.disabled = false;
        }
    });

    // ==========================================
    // 8. UPDATE PASSWORD
    // ==========================================

    passwordForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (newPassword.length < 8) {
            showMessage(
                passwordMessage,
                "Your password must contain at least 8 characters.",
                "error"
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage(
                passwordMessage,
                "Your passwords do not match.",
                "error"
            );
            return;
        }

        updatePasswordBtn.disabled = true;
        updatePasswordBtn.textContent = "Updating...";

        showMessage(passwordMessage, "Updating your password...");

        try {

            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                showMessage(
                    passwordMessage,
                    error.message,
                    "error"
                );
                return;
            }

            passwordForm.reset();

            showMessage(
                passwordMessage,
                "Your password has been updated successfully!",
                "success"
            );

        } catch (error) {

            console.error(error);

            showMessage(
                passwordMessage,
                "Unable to update your password.",
                "error"
            );

        } finally {

            updatePasswordBtn.disabled = false;
            updatePasswordBtn.textContent = "Update Password";

        }
    });

    // ==========================================
    // 9. LOGOUT
    // ==========================================

    document.getElementById("logoutBtn").addEventListener("click", async () => {

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Unable to log out: " + error.message);
            return;
        }

        window.location.href = "login.html";
    });

    // ==========================================
    // 10. THEME TOGGLE
    // ==========================================

    const themeToggle = document.getElementById("themeToggle");

    function applyTheme() {
        const savedTheme = localStorage.getItem("ideaforge-theme");

        document.body.classList.toggle(
            "dark-theme",
            savedTheme === "dark"
        );
    }

    applyTheme();

    themeToggle.addEventListener("click", () => {

        const isDark =
            document.body.classList.toggle("dark-theme");

        localStorage.setItem(
            "ideaforge-theme",
            isDark ? "dark" : "light"
        );
    });

    // ==========================================
    // 11. MOBILE SIDEBAR
    // ==========================================

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {

        if (
            window.innerWidth <= 768 &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            sidebar.classList.remove("open");
        }
    });

    // ==========================================
    // 12. START APPLICATION
    // ==========================================

    const authenticated = await checkAuthentication();

    if (authenticated) {
        await loadProfile();
    }

});
