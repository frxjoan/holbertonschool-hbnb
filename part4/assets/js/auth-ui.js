// Clears the stored authentication token cookie.
function clearTokenCookie() {
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

// Decodes the JWT payload and returns it as an object.
function parseJwtPayload(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch (error) {
    return null;
  }
}

// Returns the current JWT claims from the token cookie.
function getTokenClaims() {
  return parseJwtPayload(getCookie("token"));
}

// Checks whether the authenticated user has admin privileges.
function isAdminAuthenticated() {
  const claims = getTokenClaims();
  return Boolean(claims && (claims.is_admin === true || claims.is_admin === "true"));
}

// Returns the current authenticated user id, if available.
function getCurrentUserId() {
  const claims = getTokenClaims();
  if (!claims) {
    return null;
  }

  const rawUserId = claims.sub || claims.id || claims.user_id || null;
  return rawUserId ? String(rawUserId) : null;
}

// Fetches a user record by id from the API.
async function fetchUserById(userId) {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch user details.");
  }

  return data;
}

// Updates the displayed connected user name in the header.
async function updateConnectedUserName() {
  const userNameElements = document.querySelectorAll(".auth-user-name");
  if (userNameElements.length === 0) {
    return;
  }

  const token = getCookie("token");
  if (!token) {
    userNameElements.forEach((element) => {
      element.textContent = "";
      element.style.display = "none";
      if (element.tagName === "A") {
        element.removeAttribute("href");
      }
    });
    return;
  }

  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    return;
  }

  try {
    const user = await fetchUserById(currentUserId);
    const firstName = (user.first_name || "").trim();

    userNameElements.forEach((element) => {
      element.textContent = firstName || "User";
      element.style.display = "";
      if (element.tagName === "A") {
        element.setAttribute("href", "profile.html");
      }
    });
  } catch (error) {
    userNameElements.forEach((element) => {
      element.textContent = "";
      element.style.display = "none";
      if (element.tagName === "A") {
        element.removeAttribute("href");
      }
    });
  }
}

// Shows or hides navigation links based on the current auth state.
function updateAuthNavigation() {
  const token = getCookie("token");

  const loginLinks = document.querySelectorAll(".auth-login-link");
  const signInLinks = document.querySelectorAll(".auth-signin-link");
  const createPlaceLinks = document.querySelectorAll(".auth-create-place-link");
  const profileLinks = document.querySelectorAll(".auth-profile-link");
  const logoutLinks = document.querySelectorAll(".auth-logout-link");

  const setVisibility = (links, isVisible) => {
    links.forEach((link) => {
      link.style.display = isVisible ? "" : "none";
      const parentItem = link.closest("li");
      if (parentItem) {
        parentItem.style.display = isVisible ? "" : "none";
      }
    });
  };

  if (token) {
    setVisibility(loginLinks, false);
    setVisibility(signInLinks, false);
    setVisibility(createPlaceLinks, true);
    setVisibility(profileLinks, true);
    setVisibility(logoutLinks, true);
  } else {
    setVisibility(loginLinks, true);
    setVisibility(signInLinks, true);
    setVisibility(createPlaceLinks, false);
    setVisibility(profileLinks, false);
    setVisibility(logoutLinks, false);
  }

  updateConnectedUserName();
}

// Creates a new user account through the API.
async function createUser(firstName, lastName, email, password) {
  const response = await fetch(`${API_BASE_URL}/users/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email,
      password
    })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to create account.");
  }

  return data;
}

// Wires up the signup form submission flow.
function setupSignupForm() {
  const signupForm = document.getElementById("signup-form");

  if (!signupForm) {
    return;
  }

  const firstNameInput = document.getElementById("signup-first-name");
  const lastNameInput = document.getElementById("signup-last-name");
  const emailInput = document.getElementById("signup-email");
  const passwordInput = document.getElementById("signup-password");
  const messageElement = document.getElementById("signup-message");
  const submitButton = signupForm.querySelector("button[type='submit']");

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput || !submitButton) {
      return;
    }

    if (messageElement) {
      messageElement.textContent = "";
      messageElement.className = "form-error";
    }

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!firstName || !lastName || !email || !password) {
      if (messageElement) {
        messageElement.textContent = "Please fill in all fields.";
      }
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creating...";

    try {
      await createUser(firstName, lastName, email, password);
      if (messageElement) {
        messageElement.textContent = "Account created successfully. You can now Sign In.";
        messageElement.className = "success-message";
      }
      signupForm.reset();
    } catch (error) {
      if (messageElement) {
        messageElement.textContent = error.message;
        messageElement.className = "form-error";
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Sign Up";
    }
  });
}

// Wires up logout buttons so they clear auth state.
function setupLogoutButtons() {
  const logoutLinks = document.querySelectorAll(".auth-logout-link");

  logoutLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      clearTokenCookie();
      updateAuthNavigation();
      window.location.href = "index.html";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateAuthNavigation();
  setupLogoutButtons();
  setupSignupForm();
});
