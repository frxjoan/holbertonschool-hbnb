const API_BASE_URL = "http://localhost:5000/api/v1";

/**
 * Store JWT token in cookie for lightweight session handling.
 */
function setTokenCookie(token) {
  document.cookie = `token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    const message = data.error || "Login failed. Please check your credentials.";
    throw new Error(message);
  }

  if (!data.access_token) {
    throw new Error("Login failed: token missing in API response.");
  }

  return data.access_token;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  if (!loginForm) {
    return;
  }

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorElement = document.getElementById("login-error");
  const submitButton = loginForm.querySelector("button[type='submit']");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!emailInput || !passwordInput || !submitButton) {
      return;
    }

    if (errorElement) {
      errorElement.textContent = "";
    }

    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";

    try {
      const token = await loginUser(emailInput.value.trim(), passwordInput.value);
      setTokenCookie(token);
      window.location.href = "index.html";
    } catch (error) {
      if (errorElement) {
        errorElement.textContent = error.message;
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Sign In";
    }
  });
});
