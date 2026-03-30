const API_BASE_URL = "http://localhost:5000/api/v1";

/**
 * Store JWT token in cookie for lightweight session handling.
 */
function setTokenCookie(token) {
  document.cookie = `token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split(";") : [];

  for (const entry of cookies) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.substring(name.length + 1));
    }
  }

  return null;
}

function getAuthHeaders() {
  const token = getCookie("token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
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

function updateLoginVisibility() {
  const token = getCookie("token");
  const loginLinks = document.querySelectorAll(".auth-login-link, #login-link");

  loginLinks.forEach((link) => {
    // Project requirement: show Login only when the user is not authenticated.
    if (token) {
      link.style.display = "none";
    } else {
      link.style.display = "";
    }
  });
}

function renderPlaces(places) {
  const placesList = document.getElementById("places-list");

  if (!placesList) {
    return;
  }

  placesList.innerHTML = "";

  if (!Array.isArray(places) || places.length === 0) {
    placesList.innerHTML = '<p class="empty-state">No places available right now.</p>';
    return;
  }

  for (const place of places) {
    const card = document.createElement("article");
    const placeTitle = place.title || place.name || "Untitled place";
    const rawPrice = Number(place.price);
    const placePrice = Number.isFinite(rawPrice) ? rawPrice : 0;
    const description = place.description || "No description available.";
    const titleElement = document.createElement("h2");
    const descriptionElement = document.createElement("p");
    const priceElement = document.createElement("p");
    const priceLabel = document.createElement("strong");
    const detailsLink = document.createElement("a");

    card.className = "place-card";
    card.dataset.price = String(placePrice);
    titleElement.textContent = placeTitle;
    descriptionElement.textContent = description;
    priceLabel.textContent = "Price per night:";
    priceElement.append(priceLabel, ` $${placePrice}`);
    detailsLink.className = "details-button";
    detailsLink.href = `place.html?id=${encodeURIComponent(place.id)}`;
    detailsLink.textContent = "View details";

    card.append(titleElement, descriptionElement, priceElement, detailsLink);

    placesList.appendChild(card);
  }
}

function applyPriceFilter(selectedValue) {
  const cards = document.querySelectorAll(".place-card");

  cards.forEach((card) => {
    const cardPrice = Number(card.dataset.price || "0");
    const shouldShow = selectedValue === "all" || cardPrice <= Number(selectedValue);
    card.style.display = shouldShow ? "" : "none";
  });
}

async function fetchPlaces() {
  const response = await fetch(`${API_BASE_URL}/places/`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  let data = [];

  try {
    data = await response.json();
  } catch (error) {
    data = [];
  }

  if (!response.ok) {
    throw new Error("Failed to fetch places.");
  }

  if (!Array.isArray(data)) {
    throw new Error("Unexpected places payload.");
  }

  return data;
}

async function fetchPlaceDetails(placeId) {
  const response = await fetch(`${API_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
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
    throw new Error("Failed to fetch place details.");
  }

  return data;
}

async function fetchPlaceReviews(placeId) {
  const response = await fetch(`${API_BASE_URL}/places/${encodeURIComponent(placeId)}/reviews`, {
    method: "GET",
    headers: getAuthHeaders()
  });

  let data = [];
  try {
    data = await response.json();
  } catch (error) {
    data = [];
  }

  if (!response.ok) {
    throw new Error("Failed to fetch reviews.");
  }

  return Array.isArray(data) ? data : [];
}

function renderPlaceDetails(place) {
  const titleElement = document.getElementById("place-title");
  const hostElement = document.getElementById("place-host");
  const priceElement = document.getElementById("place-price");
  const descriptionElement = document.getElementById("place-description");
  const amenitiesElement = document.getElementById("place-amenities");

  if (!titleElement || !hostElement || !priceElement || !descriptionElement || !amenitiesElement) {
    return;
  }

  const title = place.title || "Untitled place";
  const host = place.owner
    ? `${place.owner.first_name || ""} ${place.owner.last_name || ""}`.trim()
    : "Unknown host";
  const price = Number(place.price);

  titleElement.textContent = title;
  hostElement.textContent = `Hosted by ${host || "Unknown host"}`;
  priceElement.textContent = Number.isFinite(price) ? `$${price} per night` : "Price unavailable";
  descriptionElement.textContent = place.description || "No description available.";

  amenitiesElement.innerHTML = "";
  const amenities = Array.isArray(place.amenities) ? place.amenities : [];

  if (amenities.length === 0) {
    const emptyAmenity = document.createElement("li");
    emptyAmenity.textContent = "No amenities listed.";
    amenitiesElement.appendChild(emptyAmenity);
  } else {
    amenities.forEach((amenity) => {
      const item = document.createElement("li");
      item.textContent = amenity.name || "Amenity";
      amenitiesElement.appendChild(item);
    });
  }
}

function renderPlaceReviews(reviews) {
  const reviewsList = document.getElementById("reviews-list");

  if (!reviewsList) {
    return;
  }

  reviewsList.innerHTML = "";

  if (!Array.isArray(reviews) || reviews.length === 0) {
    reviewsList.innerHTML = '<p class="empty-state">No reviews yet for this place.</p>';
    return;
  }

  reviews.forEach((review) => {
    const reviewCard = document.createElement("article");
    const text = document.createElement("p");
    const user = document.createElement("p");
    const rating = document.createElement("p");
    const userLabel = document.createElement("strong");
    const ratingLabel = document.createElement("strong");

    reviewCard.className = "review-card";
    text.textContent = review.text || "No comment provided.";

    userLabel.textContent = "User:";
    user.append(userLabel, ` ${review.owner_id || "Unknown"}`);

    ratingLabel.textContent = "Rating:";
    rating.append(ratingLabel, ` ${review.rating || "N/A"}/5`);

    reviewCard.append(text, user, rating);
    reviewsList.appendChild(reviewCard);
  });
}

async function setupPlaceDetailsPage() {
  const titleElement = document.getElementById("place-title");

  if (!titleElement) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const placeId = params.get("id");
  const addReviewLink = document.getElementById("add-review-link");

  if (!placeId) {
    titleElement.textContent = "Place not found";
    return;
  }

  if (addReviewLink) {
    addReviewLink.href = `add_review.html?place_id=${encodeURIComponent(placeId)}`;
  }

  try {
    const [place, reviews] = await Promise.all([
      fetchPlaceDetails(placeId),
      fetchPlaceReviews(placeId)
    ]);
    renderPlaceDetails(place);
    renderPlaceReviews(reviews);
  } catch (error) {
    titleElement.textContent = "Failed to load place details";
    const reviewsList = document.getElementById("reviews-list");
    if (reviewsList) {
      reviewsList.innerHTML = `<p class="form-error">${error.message}</p>`;
    }
  }
}

async function setupIndexPage() {
  const priceFilter = document.getElementById("price-filter");
  const placesList = document.getElementById("places-list");

  if (!placesList) {
    return;
  }

  updateLoginVisibility();

  try {
    const places = await fetchPlaces();
    renderPlaces(places);
  } catch (error) {
    placesList.innerHTML = `<p class="form-error">${error.message}</p>`;
    return;
  }

  if (priceFilter) {
    priceFilter.addEventListener("change", (event) => {
      applyPriceFilter(event.target.value);
    });
  }
}

function setupLoginForm() {
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
}

document.addEventListener("DOMContentLoaded", () => {
  updateLoginVisibility();
  setupLoginForm();
  setupIndexPage();
  setupPlaceDetailsPage();
});
