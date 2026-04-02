// Fetches a user by id for profile display and editing.
async function fetchUserById(userId) {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
    headers: getAuthHeaders()
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch user.");
  }

  return data;
}

// Fetches all amenities so profile place forms can edit them.
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

// Sends profile updates for the current user.
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

  if (!response.ok) {
    throw new Error(data.error || "Failed to update profile.");
  }

  return data;
}

// Sends place updates, including amenity changes, to the API.
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

  if (!response.ok) {
    throw new Error(data.error || "Failed to update place.");
  }

  return data;
}

// Sends review updates for the current user.
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

  if (!response.ok) {
    throw new Error(data.error || "Failed to update review.");
  }

  return data;
}

// Renders editable place cards for the user's own places.
function renderProfilePlaces(places, allAmenities = []) {
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
    const amenitiesId = `profile-place-amenities-${place.id}`;

    const currentAmenityIds = Array.isArray(place.amenities) 
      ? place.amenities.map(a => String(a.id || a)) 
      : [];

    let amenitiesHTML = "";
    if (Array.isArray(allAmenities) && allAmenities.length > 0) {
      amenitiesHTML = `
      <div class="form-row">
        <label>Amenities</label>
        <div id="${amenitiesId}" class="amenities-checklist">
          ${allAmenities.map((amenity) => `
            <label class="amenity-option">
              <input type="checkbox" class="profile-amenity-checkbox" value="${String(amenity.id)}" ${currentAmenityIds.includes(String(amenity.id)) ? "checked" : ""}>
              <span>${amenity.name || "Amenity"}</span>
            </label>
          `).join("")}
        </div>
      </div>
      `;
    }

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
      ${amenitiesHTML}
      <p class="form-error profile-place-message" role="alert" aria-live="polite"></p>
      <button type="submit" class="details-button">Update Place</button>
    `;

    const message = form.querySelector(".profile-place-message");
    const submitButton = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!submitButton) {
        return;
      }

      if (message) {
        message.textContent = "";
        message.className = "form-error profile-place-message";
      }

      const selectedAmenityCheckboxes = form.querySelectorAll(".profile-amenity-checkbox:checked");
      const selectedAmenityIds = Array.from(selectedAmenityCheckboxes).map(checkbox => checkbox.value);

      const payload = {
        title: (form.querySelector("input[name='title']")?.value || "").trim(),
        description: (form.querySelector("textarea[name='description']")?.value || "").trim(),
        price: Number(form.querySelector("input[name='price']")?.value || 0),
        latitude: Number(form.querySelector("input[name='latitude']")?.value || 0),
        longitude: Number(form.querySelector("input[name='longitude']")?.value || 0),
        amenities: selectedAmenityIds
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

// Renders editable review cards for the user's own reviews.
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

// Boots the profile page, loads data, and wires form handlers.
async function setupProfilePage() {
  const profilePage = document.getElementById("profile-page");

  if (!profilePage) {
    return;
  }

  const token = await requireAuthentication();
  if (!token) {
    return;
  }

  const userId = typeof getCurrentUserId === "function" ? getCurrentUserId() : null;
  if (!userId) {
    window.location.href = "login.html";
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

    const allAmenities = await fetchAmenities();
    const allPlaces = await fetchPlaces();
    const myPlaces = allPlaces.filter((place) => String(place.owner_id) === String(userId));
    renderProfilePlaces(myPlaces, allAmenities);

    const placeReviews = await Promise.all(
      allPlaces.map(async (place) => {
        const reviews = await fetchPlaceReviews(place.id);
        return reviews.map((review) => ({
          ...review,
          placeTitle: place.title || "Place"
        }));
      })
    );

    const myReviews = placeReviews.flat().filter((review) => String(review.owner_id) === String(userId));
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
        if (typeof updateConnectedUserName === "function") {
          await updateConnectedUserName();
        }

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

document.addEventListener("DOMContentLoaded", () => {
  setupProfilePage();
});
