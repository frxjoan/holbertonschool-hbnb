const API_BASE_URL = "http://localhost:5000/api/v1";

// Theme management
function initializeTheme() {
	const savedTheme = localStorage.getItem("theme") || "light";
	document.documentElement.setAttribute("data-theme", savedTheme);
	updateThemeButton(savedTheme);
}

function toggleTheme() {
	const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
	const newTheme = currentTheme === "light" ? "dark" : "light";
	document.documentElement.setAttribute("data-theme", newTheme);
	localStorage.setItem("theme", newTheme);
	updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
	const button = document.getElementById("theme-toggle");
	if (button) {
		button.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
		button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
	}
}

function setupThemeToggle() {
	const themeButton = document.getElementById("theme-toggle");
	if (themeButton) {
		themeButton.addEventListener("click", toggleTheme);
	}
}

// Initialize theme on page load
document.addEventListener("DOMContentLoaded", () => {
	initializeTheme();
	setupThemeToggle();
});

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
		throw new Error(data.error || "Login failed. Please check your credentials.");
	}

	if (!data.access_token) {
		throw new Error("Login failed: token missing in API response.");
	}

	return data.access_token;
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

async function renderPlaces(places) {
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
		const ratingElement = document.createElement("p");
		const priceElement = document.createElement("p");
		const priceLabel = document.createElement("span");
		const priceValue = document.createElement("span");
		const detailsLink = document.createElement("a");

		card.className = "place-card";
		card.dataset.price = String(placePrice);

		titleElement.textContent = placeTitle;
		descriptionElement.className = "place-description";
		descriptionElement.textContent = description;

		ratingElement.className = "place-rating";
		ratingElement.innerHTML = '<span class="rating-loader">⭐ Loading...</span>';

		priceLabel.textContent = "Price: ";
		priceValue.className = "price-value";
		priceValue.textContent = `$${placePrice}/night`;
		priceElement.className = "place-price";
		priceElement.append(priceLabel, priceValue);

		detailsLink.className = "details-button";
		detailsLink.href = `place.html?id=${encodeURIComponent(place.id)}`;
		detailsLink.textContent = "View details";

		const metaSection = document.createElement("div");
		metaSection.className = "place-meta";
		metaSection.append(ratingElement, priceElement);

		card.append(titleElement, descriptionElement, metaSection, detailsLink);
		placesList.appendChild(card);

		try {
			const reviews = await fetchPlaceReviews(place.id);
			let avgRating = 0;
			let reviewCount = 0;

			if (Array.isArray(reviews) && reviews.length > 0) {
				const totalRating = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
				avgRating = (totalRating / reviews.length).toFixed(1);
				reviewCount = reviews.length;
				ratingElement.innerHTML = `<span class="rating-stars">⭐ ${avgRating}</span> <span class="review-count">(${reviewCount})</span>`;
			} else {
				ratingElement.innerHTML = '<span class="no-reviews">No reviews yet</span>';
			}
		} catch (error) {
			ratingElement.innerHTML = '<span class="no-reviews">—</span>';
		}
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

function getPlaceIdFromURL() {
	const params = new URLSearchParams(window.location.search);
	return params.get("id") || params.get("place_id");
}

function checkAuthentication(placeId) {
	const token = getCookie("token");
	const addReviewLink = document.getElementById("add-review-link");

	if (!token) {
		if (addReviewLink) {
			addReviewLink.style.display = "none";
		}
	} else if (addReviewLink) {
		addReviewLink.style.display = "";
		addReviewLink.href = `add_review.html?place_id=${encodeURIComponent(placeId)}`;
	}
}

function checkAuthenticationForIndex() {
	const token = getCookie("token");
	const loginLink = document.getElementById("login-link");

	if (!loginLink) {
		return;
	}

	loginLink.style.display = token ? "none" : "";
}

async function requireAuthentication() {
	const token = getCookie("token");

	if (!token) {
		window.location.href = "index.html";
		return null;
	}

	return token;
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
		const reviewRating = Number(review.rating);
		const ratingText = Number.isFinite(reviewRating) ? `${reviewRating}/5` : "N/A";

		reviewCard.className = "review-card";
		text.textContent = review.text || "No comment provided.";

		userLabel.textContent = "User:";
		user.append(userLabel, ` ${review.owner_id || "Unknown"}`);

		ratingLabel.textContent = "Rating:";
		rating.append(ratingLabel, ` ${ratingText}`);

		reviewCard.append(text, user, rating);
		reviewsList.appendChild(reviewCard);
	});
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

	if (!response.ok) {
		const message = data.error || "Failed to submit review.";
		throw new Error(message);
	}

	return data;
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

async function setupIndexPage() {
	const priceFilter = document.getElementById("price-filter");
	const placesList = document.getElementById("places-list");

	if (!placesList) {
		return;
	}

	checkAuthenticationForIndex();

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

document.addEventListener("DOMContentLoaded", () => {
	setupLoginForm();
	setupIndexPage();
	setupPlaceDetailsPage();
	setupAddReviewPage();
});
