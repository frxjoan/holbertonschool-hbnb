// Fetches the list of available amenities for the place form.
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

// Adds helper tooltips to numeric inputs based on their allowed range.
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

// Renders amenity checkboxes inside the place creation form.
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

// Collects the ids of all selected amenities in the form.
function getSelectedAmenityIds() {
  const selected = document.querySelectorAll(".place-amenity-checkbox:checked");
  return Array.from(selected).map((checkbox) => checkbox.value);
}

// Sends a new place payload to the API.
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

  if (!response.ok) {
    throw new Error(data.error || "Failed to create place.");
  }

  return data;
}

// Sends a new amenity payload to the API.
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

  if (!response.ok) {
    throw new Error(data.error || "Failed to create amenity.");
  }

  return data;
}

// Sets up the create place page, including admin-only controls.
async function setupCreatePlacePage() {
  const createPlaceForm = document.getElementById("create-place-form");

  if (!createPlaceForm) {
    return;
  }

  const token = await requireAuthentication();
  if (!token) {
    return;
  }

  const isAdmin = typeof isAdminAuthenticated === "function" ? isAdminAuthenticated() : false;

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

document.addEventListener("DOMContentLoaded", () => {
  setupCreatePlacePage();
});
