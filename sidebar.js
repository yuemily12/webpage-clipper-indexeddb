/**
 * Sidebar script for the Webpage Clipper extension
 * Handles displaying and managing clipped pages using IndexedDB
 */

// Elements
const clipContainer = document.getElementById("clipContainer");
const clearAllBtn = document.getElementById("clearAllBtn");

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

// Render all clipped pages from the database
async function renderClippedPages() {
  try {
    // Get all clipped pages from IndexedDB
    const pages = await WebpageClipperDB.getAllPages();

    // Clear the container
    clipContainer.innerHTML = "";

    if (pages.length === 0) {
      // Show a message if there are no clipped pages
      clipContainer.innerHTML = `
        <div class="no-clips">
          <p>No pages clipped yet</p>
          <p>Click "Clip Current Page" in the popup to save a webpage</p>
        </div>
      `;
      return;
    }

    // Create the list element
    const listElement = document.createElement("div");
    listElement.className = "clip-list";

    // Sort pages by timestamp, newest first
    pages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Add each page to the list
    pages.forEach((page) => {
      const clipItem = document.createElement("div");
      clipItem.className = "clip-item";
      clipItem.innerHTML = `
  <div class="clip-title">
    ${
      page.favicon
        ? `<img src="${page.favicon}" class="favicon" onerror="this.style.display='none'">`
        : ""
    }
    ${page.title}
  </div>
  <a href="${page.url}" class="clip-url" target="_blank">${page.url}</a>
  <div class="clip-date">${formatDate(page.timestamp)}</div>
  ${
    page.wordCount
      ? `
  <div class="clip-metadata">
    <div class="metadata-item">Words: ${page.wordCount}</div>
    <div class="metadata-item">Reading time: ${page.readingTime} min</div>
  </div>
  `
      : ""
  }
  <div class="clip-content">${page.content}</div>
  <button class="delete-btn" data-id="${page.id}">×</button>
`;

      // Add the item to the list
      listElement.appendChild(clipItem);
    });

    // Add the list to the container
    clipContainer.appendChild(listElement);

    // Add event listeners for delete buttons
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = parseInt(e.target.dataset.id, 10);
        try {
          await WebpageClipperDB.deletePage(id);
          // Re-render the list
          await renderClippedPages();
        } catch (error) {
          console.error("Error deleting page:", error);
        }
      });
    });
  } catch (error) {
    console.error("Error rendering clipped pages:", error);
    clipContainer.innerHTML = `
      <div class="no-clips">
        <p>Error loading clipped pages</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Initialize the database and render the pages
async function initialize() {
  try {
    await WebpageClipperDB.init();
    await renderClippedPages();
  } catch (error) {
    console.error("Error initializing database:", error);
    clipContainer.innerHTML = `
      <div class="no-clips">
        <p>Error initializing database</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Clear all clipped pages
clearAllBtn.addEventListener("click", async () => {
  if (confirm("Are you sure you want to delete all clipped pages?")) {
    try {
      await WebpageClipperDB.clearAllPages();
      await renderClippedPages();
    } catch (error) {
      console.error("Error clearing pages:", error);
    }
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "newClip" && message.data) {
    // Add the new clip to the database and refresh the UI
    (async () => {
      try {
        await WebpageClipperDB.addPage(message.data);
        await renderClippedPages();
      } catch (error) {
        console.error("Error adding new clip:", error);
      }
    })();
  }
  // Don't return true here as we're not sending an asynchronous response
  // Returning true was causing duplicate clips due to message port staying open
});

// Initialize when the document is loaded
document.addEventListener("DOMContentLoaded", initialize);
