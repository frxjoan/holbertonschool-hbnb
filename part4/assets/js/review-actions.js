// Fetches a user record so review cards can display names.
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

// Formats a user object into a displayable full name.
function formatUserName(user) {
  if (!user) {
    return "Unknown";
  }
  const firstName = user.first_name || "";
  const lastName = user.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || "Unknown";
}

// Deletes a review by id.
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

// Updates a review inline from the place page menu.
async function updateReviewInline(reviewId, text, rating) {
  const response = await fetch(`${API_BASE_URL}/reviews/${encodeURIComponent(reviewId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({ text, rating: Number(rating) })
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

// Renders the list of reviews with per-review actions.
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

  const userCache = {};

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
    const userName = document.createElement("span");
    userName.className = "review-user-name";
    userName.textContent = "Loading...";
    user.append(userLabel, " ", userName);

    ratingLabel.textContent = "Rating:";
    ratingStar.className = "rating-star";
    ratingStar.textContent = "★";
    rating.append(ratingLabel, " ", ratingStar, ` ${ratingText}`);

    const reviewOwnerId = review.owner_id ? String(review.owner_id) : null;
    const canDeleteReview = Boolean(
      (currentUserId && reviewOwnerId && reviewOwnerId === currentUserId) ||
      (typeof isAdminAuthenticated === "function" && isAdminAuthenticated())
    );
    const canEditReview = Boolean(
      currentUserId && reviewOwnerId && reviewOwnerId === currentUserId
    );

    if ((canDeleteReview || canEditReview) && review.id) {
      const actions = document.createElement("div");
      const toggleButton = document.createElement("button");
      const menu = document.createElement("div");

      actions.className = "review-actions";
      toggleButton.type = "button";
      toggleButton.className = "review-actions-toggle";
      toggleButton.textContent = "⋯";
      toggleButton.setAttribute("aria-label", "Review actions");

      menu.className = "review-actions-menu is-hidden";

      if (canEditReview && review.id) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "review-edit-button";
        editButton.textContent = "Edit review";

        editButton.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const editForm = document.createElement("div");
          editForm.className = "review-edit-form";
          editForm.innerHTML = `
            <div class="form-row">
              <label for="review-edit-text-${review.id}">Comment</label>
              <textarea id="review-edit-text-${review.id}" name="text" rows="3" required>${review.text || ""}</textarea>
            </div>
            <div class="form-row">
              <label for="review-edit-rating-${review.id}">Rating</label>
              <select id="review-edit-rating-${review.id}" name="rating" required>
                <option value="1" ${Number(review.rating) === 1 ? "selected" : ""}>1</option>
                <option value="2" ${Number(review.rating) === 2 ? "selected" : ""}>2</option>
                <option value="3" ${Number(review.rating) === 3 ? "selected" : ""}>3</option>
                <option value="4" ${Number(review.rating) === 4 ? "selected" : ""}>4</option>
                <option value="5" ${Number(review.rating) === 5 ? "selected" : ""}>5</option>
              </select>
            </div>
            <div class="form-row">
              <button type="button" class="review-save-button">Save</button>
              <button type="button" class="review-cancel-button">Cancel</button>
            </div>
            <p class="form-error review-edit-message" role="alert" aria-live="polite"></p>
          `;

          const originalContent = reviewCard.innerHTML;
          reviewCard.innerHTML = "";
          reviewCard.appendChild(editForm);

          const saveButton = editForm.querySelector(".review-save-button");
          const cancelButton = editForm.querySelector(".review-cancel-button");
          const messageElement = editForm.querySelector(".review-edit-message");

          cancelButton.addEventListener("click", () => {
            reviewCard.innerHTML = originalContent;
            setupReviewCardActions();
          });

          saveButton.addEventListener("click", async () => {
            const newText = editForm.querySelector("textarea[name='text']")?.value || "";
            const newRating = editForm.querySelector("select[name='rating']")?.value || review.rating;

            if (!newText.trim()) {
              if (messageElement) {
                messageElement.textContent = "Comment cannot be empty.";
              }
              return;
            }

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {
              await updateReviewInline(review.id, newText, newRating);
              const refreshedReviews = await fetchPlaceReviews(placeId);
              renderPlaceReviews(refreshedReviews, placeId);
            } catch (error) {
              saveButton.disabled = false;
              saveButton.textContent = "Save";
              if (messageElement) {
                messageElement.textContent = error.message;
              }
            }
          });
        });

        menu.appendChild(editButton);
      }

      if (canDeleteReview && review.id) {
        const deleteButton = document.createElement("button");
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

        menu.appendChild(deleteButton);
      }

      toggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        menu.classList.toggle("is-hidden");
      });

      reviewCard.addEventListener("mouseleave", () => {
        menu.classList.add("is-hidden");
      });

      actions.append(toggleButton, menu);
      header.appendChild(actions);
    }

    reviewCard.append(header, text, user, rating);
    reviewsList.appendChild(reviewCard);

    fetchUserById(reviewOwnerId)
      .then((fetchedUser) => {
        userName.textContent = formatUserName(fetchedUser);
      })
      .catch(() => {
        userName.textContent = "Unknown";
      });
  });

  // Placeholder hook kept for restoring the original review card layout.
  function setupReviewCardActions() {
  }
}
