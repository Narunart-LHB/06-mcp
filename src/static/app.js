document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Auth elements
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const userInfo = document.getElementById("user-info");
  const usernameSpan = document.getElementById("username");
  const closeModal = document.querySelector(".close");

  let isAuthenticated = false;

  // Check authentication status on load
  async function checkAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const data = await response.json();
      
      isAuthenticated = data.authenticated;
      
      if (isAuthenticated) {
        loginBtn.classList.add("hidden");
        userInfo.classList.remove("hidden");
        usernameSpan.textContent = data.username;
      } else {
        loginBtn.classList.remove("hidden");
        userInfo.classList.add("hidden");
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  }

  // Login modal handlers
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginError.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
      loginError.classList.add("hidden");
    }
  });

  // Handle login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      if (response.ok) {
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginError.classList.add("hidden");
        await checkAuthStatus();
        
        messageDiv.textContent = "Login successful!";
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 3000);
      } else {
        const result = await response.json();
        loginError.textContent = result.detail || "Invalid credentials";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", { method: "POST" });
      await checkAuthStatus();
      
      messageDiv.textContent = "Logged out successfully!";
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 3000);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    // Check if user is authenticated
    if (!isAuthenticated) {
      messageDiv.textContent = "Please login as a teacher to unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Check if user is authenticated
    if (!isAuthenticated) {
      messageDiv.textContent = "Please login as a teacher to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  checkAuthStatus();
  fetchActivities();
});
