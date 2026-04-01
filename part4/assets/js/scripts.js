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

function clearTokenCookie() {
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

function logoutAndRedirect() {
  clearTokenCookie();
  updateAuthNavigation();
  window.location.href = "login.html";
}

function getAuthHeaders() {
  const token = getCookie("token");
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

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

function getTokenClaims() {
  return parseJwtPayload(getCookie("token"));
}

function isAdminAuthenticated() {
  const claims = getTokenClaims();
  return Boolean(claims && (claims.is_admin === true || claims.is_admin === "true"));
}

function getCurrentUserId() {
  const claims = getTokenClaims();
  if (!claims) {
    return null;
  }

  const rawUserId = claims.sub || claims.id || claims.user_id || null;
  if (!rawUserId) {
    return null;
  }

  return String(rawUserId);
}

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

async function fetchAmenities() {
  const response = await fetch(`${API_BASE_URL}/amenities/`, {
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
    throw new Error("Failed to fetch amenities.");
  }

  return Array.isArray(data) ? data : [];
}

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
    const message = data.error || "Failed to create account.";
    throw new Error(message);
  }

  return data;
}

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
    updateConnectedUserName();
  } else {
    setVisibility(loginLinks, true);
    setVisibility(signInLinks, true);
    setVisibility(createPlaceLinks, false);
    setVisibility(profileLinks, false);
    setVisibility(logoutLinks, false);
    updateConnectedUserName();
  }
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

function displayPlaceDetails(place) {
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

function renderPlaceReviews(reviews, placeId) {
  const reviewsList = document.getElementById("reviews-list");
  const currentUserId = getCurrentUserId();

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
    const header = document.createElement("div");
    const text = document.createElement("p");
    const user = document.createElement("p");
    const rating = document.createElement("p");
    const userLabel = document.createElement("strong");
    const ratingLabel = document.createElement("strong");
    const ratingStar = document.createElement("span");
    const reviewRating = Number(review.rating);
    const ratingText = Number.isFinite(reviewRating) ? `${reviewRating}/5` : "N/A";

    reviewCard.className = "review-card";
    header.className = "review-card-header";
    text.textContent = review.text || "No comment provided.";

    userLabel.textContent = "User:";
    user.append(userLabel, ` ${review.owner_id || "Unknown"}`);

    ratingLabel.textContent = "Rating:";
    ratingStar.className = "rating-star";
    ratingStar.textContent = "★";
    rating.append(ratingLabel, " ", ratingStar, ` ${ratingText}`);

    const reviewOwnerId = review.owner_id ? String(review.owner_id) : null;
    const canDeleteReview = Boolean(
      (currentUserId && reviewOwnerId && reviewOwnerId === currentUserId) || isAdminAuthenticated()
    );

    if (canDeleteReview && review.id) {
      const actions = document.createElement("div");
      const toggleButton = document.createElement("button");
      const menu = document.createElement("div");
      const deleteButton = document.createElement("button");

      actions.className = "review-actions";
      toggleButton.type = "button";
      toggleButton.className = "review-actions-toggle";
      toggleButton.textContent = "⋯";
      toggleButton.setAttribute("aria-label", "Review actions");

      menu.className = "review-actions-menu is-hidden";
      deleteButton.type = "button";
      deleteButton.className = "review-delete-button";
      deleteButton.textContent = "Delete review";

      deleteButton.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const shouldDelete = window.confirm("Delete this review?");
        if (!shouldDelete) {
          return;
        }

        deleteButton.disabled = true;

        try {
          await deleteReview(review.id);
          const refreshedReviews = await fetchPlaceReviews(placeId);
          renderPlaceReviews(refreshedReviews, placeId);
        } catch (error) {
          deleteButton.disabled = false;
          alert(error.message);
        }
      });

      toggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        menu.classList.toggle("is-hidden");
      });

      reviewCard.addEventListener("mouseleave", () => {
        menu.classList.add("is-hidden");
      });

      menu.appendChild(deleteButton);
      actions.append(toggleButton, menu);
      header.appendChild(actions);
    }

    reviewCard.append(header, text, user, rating);
    reviewsList.appendChild(reviewCard);
  });
}

function getPlaceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || params.get("place_id");
}

function checkAuthentication(placeId) {
  const token = getCookie('token');
  const addReviewLink = document.getElementById('add-review-link');

  if (!token) {
    if (addReviewLink) {
      addReviewLink.style.display = 'none';
    }
  } else {
    if (addReviewLink) {
      addReviewLink.style.display = '';
      addReviewLink.href = `add_review.html?place_id=${encodeURIComponent(placeId)}`;
    }
  }
}

async function requireAuthentication() {
  const token = getCookie("token");

  if (!token) {
    window.location.href = "index.html";
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/protected`, {
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
    logoutAndRedirect();
    return null;
  }

  return token;
}

async function submitReview(placeId, reviewText, rating) {
  const response = await fetch(`${API_BASE_URL}/reviews/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      text: reviewText,
      rating: Number(rating),
      place_id: placeId
    })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401 || response.status === 422) {
    logoutAndRedirect();
    throw new Error(data.error || "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const message = data.error || "Failed to submit review.";
    throw new Error(message);
  }

  return data;
}

async function deleteReview(reviewId) {
  const response = await fetch(`${API_BASE_URL}/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401 || response.status === 422) {
    logoutAndRedirect();
    throw new Error(data.error || "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to delete review.");
  }

  return data;
}

async function updateCurrentUser(userId, firstName, lastName) {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName
    })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401 || response.status === 422) {
    logoutAndRedirect();
    throw new Error(data.error || "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to update profile.");
  }

  return data;
}

async function updatePlace(placeId, payload) {
  const response = await fetch(`${API_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401 || response.status === 422) {
    logoutAndRedirect();
    throw new Error(data.error || "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to update place.");
  }

  return data;
}

async function updateReview(reviewId, payload) {
  const response = await fetch(`${API_BASE_URL}/reviews/${encodeURIComponent(reviewId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401 || response.status === 422) {
    logoutAndRedirect();
    throw new Error(data.error || "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to update review.");
  }

  return data;
}

function renderProfilePlaces(places) {
  const container = document.getElementById("profile-places-list");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(places) || places.length === 0) {
    container.innerHTML = '<p class="empty-state">You have no places yet.</p>';
    return;
  }

  places.forEach((place) => {
    const form = document.createElement("form");
    const titleId = `profile-place-title-${place.id}`;
    const descriptionId = `profile-place-description-${place.id}`;
    const priceId = `profile-place-price-${place.id}`;
    const latitudeId = `profile-place-latitude-${place.id}`;
    const longitudeId = `profile-place-longitude-${place.id}`;

    form.className = "form profile-card";
    form.innerHTML = `
      <h3>${place.title || "Untitled place"}</h3>
      <div class="form-row">
        <label for="${titleId}">Title</label>
        <input id="${titleId}" name="title" type="text" value="${(place.title || "").replace(/"/g, "&quot;")}" required>
      </div>
      <div class="form-row">
        <label for="${descriptionId}">Description</label>
        <textarea id="${descriptionId}" name="description" rows="3">${place.description || ""}</textarea>
      </div>
      <div class="form-row">
        <label for="${priceId}">Price</label>
        <input id="${priceId}" name="price" type="number" min="0" step="0.01" value="${Number(place.price || 0)}" required>
      </div>
      <div class="form-row two-columns">
        <div>
          <label for="${latitudeId}">Latitude</label>
          <input id="${latitudeId}" name="latitude" type="number" min="-90" max="90" step="0.000001" value="${Number(place.latitude || 0)}" required>
        </div>
        <div>
          <label for="${longitudeId}">Longitude</label>
          <input id="${longitudeId}" name="longitude" type="number" min="-180" max="180" step="0.000001" value="${Number(place.longitude || 0)}" required>
        </div>
      </div>
      <p class="form-error profile-place-message" role="alert" aria-live="polite"></p>
      <button type="submit" class="details-button">Update Place</button>
    `;

    const message = form.querySelector(".profile-place-message");
    const submitButton = form.querySelector("button[type='submit']");
    const priceInput = form.querySelector(`input[name='price']`);
    const latitudeInput = form.querySelector(`input[name='latitude']`);
    const longitudeInput = form.querySelector(`input[name='longitude']`);
    applyNumericFieldTooltips([priceInput, latitudeInput, longitudeInput]);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!submitButton) {
        return;
      }

      if (message) {
        message.textContent = "";
        message.className = "form-error profile-place-message";
      }

      const payload = {
        title: (form.querySelector("input[name='title']")?.value || "").trim(),
        description: (form.querySelector("textarea[name='description']")?.value || "").trim(),
        price: Number(form.querySelector("input[name='price']")?.value || 0),
        latitude: Number(form.querySelector("input[name='latitude']")?.value || 0),
        longitude: Number(form.querySelector("input[name='longitude']")?.value || 0)
      };

      submitButton.disabled = true;
      submitButton.textContent = "Updating...";

      try {
        await updatePlace(place.id, payload);
        if (message) {
          message.textContent = "Place updated.";
          message.className = "success-message profile-place-message";
        }
      } catch (error) {
        if (message) {
          message.textContent = error.message;
          message.className = "form-error profile-place-message";
        }
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Update Place";
      }
    });

    container.appendChild(form);
  });
}

function renderProfileReviews(reviews) {
  const container = document.getElementById("profile-reviews-list");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(reviews) || reviews.length === 0) {
    container.innerHTML = '<p class="empty-state">You have no reviews yet.</p>';
    return;
  }

  reviews.forEach((review) => {
    const form = document.createElement("form");
    const textId = `profile-review-text-${review.id}`;
    const ratingId = `profile-review-rating-${review.id}`;

    form.className = "form profile-card";
    form.innerHTML = `
      <h3>Review for ${review.placeTitle || "place"}</h3>
      <div class="form-row">
        <label for="${textId}">Comment</label>
        <textarea id="${textId}" name="text" rows="3" required>${review.text || ""}</textarea>
      </div>
      <div class="form-row">
        <label for="${ratingId}">Rating</label>
        <select id="${ratingId}" name="rating" required>
          <option value="1" ${Number(review.rating) === 1 ? "selected" : ""}>1</option>
          <option value="2" ${Number(review.rating) === 2 ? "selected" : ""}>2</option>
          <option value="3" ${Number(review.rating) === 3 ? "selected" : ""}>3</option>
          <option value="4" ${Number(review.rating) === 4 ? "selected" : ""}>4</option>
          <option value="5" ${Number(review.rating) === 5 ? "selected" : ""}>5</option>
        </select>
      </div>
      <p class="form-error profile-review-message" role="alert" aria-live="polite"></p>
      <button type="submit" class="details-button">Update Review</button>
    `;

    const message = form.querySelector(".profile-review-message");
    const submitButton = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!submitButton) {
        return;
      }

      if (message) {
        message.textContent = "";
        message.className = "form-error profile-review-message";
      }

      const payload = {
        text: (form.querySelector("textarea[name='text']")?.value || "").trim(),
        rating: Number(form.querySelector("select[name='rating']")?.value || 1)
      };

      submitButton.disabled = true;
      submitButton.textContent = "Updating...";

      try {
        await updateReview(review.id, payload);
        if (message) {
          message.textContent = "Review updated.";
          message.className = "success-message profile-review-message";
        }
      } catch (error) {
        if (message) {
          message.textContent = error.message;
          message.className = "form-error profile-review-message";
        }
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Update Review";
      }
    });

    container.appendChild(form);
  });
}

async function setupProfilePage() {
  const profilePage = document.getElementById("profile-page");

  if (!profilePage) {
    return;
  }

  const token = await requireAuthentication();
  if (!token) {
    return;
  }

  const userId = getCurrentUserId();
  if (!userId) {
    logoutAndRedirect();
    return;
  }

  const firstNameInput = document.getElementById("profile-first-name");
  const lastNameInput = document.getElementById("profile-last-name");
  const profileForm = document.getElementById("profile-user-form");
  const userMessage = document.getElementById("profile-user-message");
  const userSubmitButton = profileForm ? profileForm.querySelector("button[type='submit']") : null;

  try {
    const user = await fetchUserById(userId);

    if (firstNameInput) {
      firstNameInput.value = user.first_name || "";
    }
    if (lastNameInput) {
      lastNameInput.value = user.last_name || "";
    }

    const allPlaces = await fetchPlaces();
    const myPlaces = allPlaces.filter((place) => String(place.owner_id) === String(userId));
    renderProfilePlaces(myPlaces);

    const placeReviews = await Promise.all(
      allPlaces.map(async (place) => {
        const reviews = await fetchPlaceReviews(place.id);
        return reviews.map((review) => ({
          ...review,
          placeTitle: place.title || "Place"
        }));
      })
    );

    const myReviews = placeReviews
      .flat()
      .filter((review) => String(review.owner_id) === String(userId));
    renderProfileReviews(myReviews);
  } catch (error) {
    const placesContainer = document.getElementById("profile-places-list");
    const reviewsContainer = document.getElementById("profile-reviews-list");

    if (placesContainer) {
      placesContainer.innerHTML = `<p class="form-error">${error.message}</p>`;
    }
    if (reviewsContainer) {
      reviewsContainer.innerHTML = `<p class="form-error">${error.message}</p>`;
    }
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!firstNameInput || !lastNameInput || !userSubmitButton) {
        return;
      }

      if (userMessage) {
        userMessage.textContent = "";
        userMessage.className = "form-error";
      }

      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();

      if (!firstName || !lastName) {
        if (userMessage) {
          userMessage.textContent = "First name and last name are required.";
        }
        return;
      }

      userSubmitButton.disabled = true;
      userSubmitButton.textContent = "Saving...";

      try {
        await updateCurrentUser(userId, firstName, lastName);
        await updateConnectedUserName();

        if (userMessage) {
          userMessage.textContent = "Profile updated.";
          userMessage.className = "success-message";
        }
      } catch (error) {
        if (userMessage) {
          userMessage.textContent = error.message;
          userMessage.className = "form-error";
        }
      } finally {
        userSubmitButton.disabled = false;
        userSubmitButton.textContent = "Save Profile";
      }
    });
  }
}

async function submitPlace(title, description, price, latitude, longitude, amenityIds) {
  const response = await fetch(`${API_BASE_URL}/places/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      title,
      description,
      price: Number(price),
      latitude: Number(latitude),
      longitude: Number(longitude),
      amenities: Array.isArray(amenityIds) ? amenityIds : []
    })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401 || response.status === 422) {
    logoutAndRedirect();
    throw new Error(data.error || "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to create place.");
  }

  return data;
}

function renderAmenitiesForPlaceForm(amenities) {
  const amenitiesChecklist = document.getElementById("place-amenities-checklist");

  if (!amenitiesChecklist) {
    return;
  }

  amenitiesChecklist.innerHTML = "";

  if (!Array.isArray(amenities) || amenities.length === 0) {
    amenitiesChecklist.innerHTML = '<p class="empty-state">No amenities available yet.</p>';
    return;
  }

  amenities.forEach((amenity) => {
    if (!amenity || !amenity.id) {
      return;
    }

    const optionLabel = document.createElement("label");
    const checkbox = document.createElement("input");
    const name = document.createElement("span");

    optionLabel.className = "amenity-option";

    checkbox.type = "checkbox";
    checkbox.className = "place-amenity-checkbox";
    checkbox.value = String(amenity.id);

    name.textContent = amenity.name || "Amenity";

    optionLabel.append(checkbox, name);
    amenitiesChecklist.appendChild(optionLabel);
  });
}

function getSelectedAmenityIds() {
  const selected = document.querySelectorAll(".place-amenity-checkbox:checked");
  return Array.from(selected).map((checkbox) => checkbox.value);
}

function applyNumericFieldTooltips(fields) {
  fields.forEach((field) => {
    if (!field) {
      return;
    }

    const min = field.getAttribute("min");
    const max = field.getAttribute("max");

    if (min && max) {
      field.title = `Allowed range: ${min} to ${max}`;
    } else if (min) {
      field.title = `Minimum allowed value: ${min}`;
    } else if (max) {
      field.title = `Maximum allowed value: ${max}`;
    }
  });
}

async function submitAmenity(name) {
  const response = await fetch(`${API_BASE_URL}/amenities/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({ name })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401 || response.status === 422) {
    logoutAndRedirect();
    throw new Error(data.error || "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to create amenity.");
  }

  return data;
}

async function setupAddReviewPage() {
  const reviewForm = document.getElementById("review-form");

  if (!reviewForm) {
    return;
  }

  const token = await requireAuthentication();
  if (!token) {
    return;
  }

  const placeId = getPlaceIdFromURL();
  const commentInput = document.getElementById("comment");
  const ratingInput = document.getElementById("rating");
  const messageElement = document.getElementById("review-message");
  const submitButton = reviewForm.querySelector("button[type='submit']");
  const placeNameElement = document.getElementById("review-place-name");

  if (!placeId) {
    window.location.href = "index.html";
    return;
  }

  if (placeNameElement) {
    try {
      const place = await fetchPlaceDetails(placeId);
      const title = place.title || place.name || "this place";
      placeNameElement.textContent = `Share your experience for ${title}.`;
    } catch (error) {
      placeNameElement.textContent = "Share your experience for this place.";
    }
  }

  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!commentInput || !ratingInput || !submitButton) {
      return;
    }

    if (messageElement) {
      messageElement.textContent = "";
      messageElement.className = "form-error";
    }

    const reviewText = commentInput.value.trim();
    const rating = ratingInput.value;

    if (!reviewText) {
      if (messageElement) {
        messageElement.textContent = "Please enter a comment.";
      }
      return;
    }

    if (!rating) {
      if (messageElement) {
        messageElement.textContent = "Please select a rating.";
      }
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      await submitReview(placeId, reviewText, rating);

      if (messageElement) {
        messageElement.textContent = "Review submitted successfully!";
        messageElement.className = "success-message";
      }

      reviewForm.reset();
    } catch (error) {
      if (messageElement) {
        messageElement.textContent = error.message;
        messageElement.className = "form-error";
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Review";
    }
  });
}

async function setupCreatePlacePage() {
  const createPlaceForm = document.getElementById("create-place-form");

  if (!createPlaceForm) {
    return;
  }

  const token = await requireAuthentication();
  if (!token) {
    return;
  }

  const isAdmin = isAdminAuthenticated();

  const titleInput = document.getElementById("place-title-input");
  const descriptionInput = document.getElementById("place-description-input");
  const priceInput = document.getElementById("place-price-input");
  const latitudeInput = document.getElementById("place-latitude-input");
  const longitudeInput = document.getElementById("place-longitude-input");
  const messageElement = document.getElementById("create-place-message");
  const submitButton = createPlaceForm.querySelector("button[type='submit']");
  const adminAmenitySection = document.getElementById("admin-amenity-section");
  const createAmenityForm = document.getElementById("create-amenity-form");
  const amenityNameInput = document.getElementById("amenity-name-input");
  const amenityMessage = document.getElementById("create-amenity-message");
  const amenitySubmitButton = createAmenityForm
    ? createAmenityForm.querySelector("button[type='submit']")
    : null;

  applyNumericFieldTooltips([priceInput, latitudeInput, longitudeInput]);

  try {
    const amenities = await fetchAmenities();
    renderAmenitiesForPlaceForm(amenities);
  } catch (error) {
    renderAmenitiesForPlaceForm([]);
  }

  if (adminAmenitySection) {
    adminAmenitySection.style.display = isAdmin ? "" : "none";
  }

  if (isAdmin && createAmenityForm) {
    createAmenityForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!amenityNameInput || !amenitySubmitButton) {
        return;
      }

      if (amenityMessage) {
        amenityMessage.textContent = "";
        amenityMessage.className = "form-error";
      }

      const amenityName = amenityNameInput.value.trim();
      if (!amenityName) {
        if (amenityMessage) {
          amenityMessage.textContent = "Please enter an amenity name.";
        }
        return;
      }

      amenitySubmitButton.disabled = true;
      amenitySubmitButton.textContent = "Creating...";

      try {
        await submitAmenity(amenityName);
        if (amenityMessage) {
          amenityMessage.textContent = "Amenity created successfully.";
          amenityMessage.className = "success-message";
        }
        createAmenityForm.reset();
      } catch (error) {
        if (amenityMessage) {
          amenityMessage.textContent = error.message;
          amenityMessage.className = "form-error";
        }
      } finally {
        amenitySubmitButton.disabled = false;
        amenitySubmitButton.textContent = "Create Amenity";
      }
    });
  }

  createPlaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!titleInput || !descriptionInput || !priceInput || !latitudeInput || !longitudeInput || !submitButton) {
      return;
    }

    if (messageElement) {
      messageElement.textContent = "";
      messageElement.className = "form-error";
    }

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const price = priceInput.value;
    const latitude = latitudeInput.value;
    const longitude = longitudeInput.value;

    if (!title || !price || !latitude || !longitude) {
      if (messageElement) {
        messageElement.textContent = "Please fill in all required fields.";
      }
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creating...";

    try {
      const selectedAmenityIds = getSelectedAmenityIds();
      const createdPlace = await submitPlace(
        title,
        description,
        price,
        latitude,
        longitude,
        selectedAmenityIds
      );

      if (messageElement) {
        messageElement.textContent = "Place created successfully. Redirecting...";
        messageElement.className = "success-message";
      }

      if (createdPlace && createdPlace.id) {
        window.location.href = `place.html?id=${encodeURIComponent(createdPlace.id)}`;
      } else {
        createPlaceForm.reset();
      }
    } catch (error) {
      if (messageElement) {
        messageElement.textContent = error.message;
        messageElement.className = "form-error";
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Create Place";
    }
  });
}

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

async function setupPlaceDetailsPage() {
  const titleElement = document.getElementById("place-title");

  if (!titleElement) {
    return;
  }

  const placeId = getPlaceIdFromURL();

  if (!placeId) {
    titleElement.textContent = "Place not found";
    return;
  }

  checkAuthentication(placeId);

  try {
    const [place, reviews] = await Promise.all([
      fetchPlaceDetails(placeId),
      fetchPlaceReviews(placeId)
    ]);
    displayPlaceDetails(place);
    renderPlaceReviews(reviews, placeId);
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

  updateAuthNavigation();

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

document.addEventListener("DOMContentLoaded", () => {
  updateAuthNavigation();
  setupLogoutButtons();
  setupLoginForm();
  setupSignupForm();
  setupIndexPage();
  setupPlaceDetailsPage();
  setupAddReviewPage();
  setupCreatePlacePage();
  setupProfilePage();
});
