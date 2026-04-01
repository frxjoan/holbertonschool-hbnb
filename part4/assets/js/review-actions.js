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

  if (!response.ok) {
    throw new Error(data.error || "Failed to delete review.");
  }

  return data;
}

function renderPlaceReviews(reviews, placeId) {
  const reviewsList = document.getElementById("reviews-list");
  const currentUserId = typeof getCurrentUserId === "function" ? getCurrentUserId() : null;

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
      (currentUserId && reviewOwnerId && reviewOwnerId === currentUserId) ||
      (typeof isAdminAuthenticated === "function" && isAdminAuthenticated())
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

        if (!window.confirm("Delete this review?")) {
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
