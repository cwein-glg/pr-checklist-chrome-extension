/**
 * Content script for GitHub PR auto-fill
 * Detects compare pages and facilitates auto-filling PR descriptions using AI
 */

import { OpenAIModel } from "../types";

interface Message {
  type: "GET_DIFF" | "FILL_DESCRIPTION" | "GET_TEMPLATE" | "GENERATE_PR_DESCRIPTION";
  data?: any;
}

interface AutoFillResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class GitHubPRAutoFill {
  private isComparePage = false;
  private hasInjectedUI = false;
  private floatingButton: HTMLElement | null = null;
  private currentState: "idle" | "loading" | "success" | "error" = "idle";

  constructor() {
    this.init();
  }

  private init() {
    // Check if we're on a compare page
    this.detectComparePage();

    if (this.isComparePage) {
      this.setupAutoFillUI();
      this.setupMessageListeners();
    }

    // Watch for navigation changes (GitHub uses pushState)
    this.observeNavigationChanges();
  }

  private detectComparePage() {
    const url = window.location.href;
    this.isComparePage = url.includes("/compare/") || url.includes("/pull/new");

    // Also check if there's a PR description textarea (try multiple selectors)
    const prDescriptionField =
      (document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement) ||
      (document.querySelector('textarea[data-testid="pull-request-body"]') as HTMLTextAreaElement) ||
      (document.querySelector('textarea[placeholder*="description"]') as HTMLTextAreaElement) ||
      (document.querySelector('textarea[aria-label*="description"]') as HTMLTextAreaElement);

    if (prDescriptionField) {
      this.isComparePage = true;
      console.log("PullCraft: PR description field found, setting up UI");
    }

    console.log("PullCraft: Page detection -", {
      url,
      isComparePage: this.isComparePage,
      foundTextField: !!prDescriptionField
    });
  }

  private setupAutoFillUI() {
    if (this.hasInjectedUI) return;

    // Try to inject immediately
    this.injectFloatingButton();

    // Also try after delays to catch late-loading elements
    setTimeout(() => this.injectFloatingButton(), 1000);
    setTimeout(() => this.injectFloatingButton(), 3000);
    setTimeout(() => this.injectFloatingButton(), 5000);

    this.hasInjectedUI = true;
  }

  private injectFloatingButton() {
    // Try multiple selectors to find the PR description field
    const prDescriptionField =
      (document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement) ||
      (document.querySelector('textarea[data-testid="pull-request-body"]') as HTMLTextAreaElement) ||
      (document.querySelector('textarea[placeholder*="description"]') as HTMLTextAreaElement) ||
      (document.querySelector('textarea[aria-label*="description"]') as HTMLTextAreaElement);

    console.log("PullCraft: Attempting to inject button...", {
      foundField: !!prDescriptionField,
      url: window.location.href
    });

    if (!prDescriptionField) {
      console.log("PullCraft: No PR description field found, checking if we should show button anyway...");

      // If we're on a compare or PR page, show the button anyway
      const url = window.location.href;
      const isDefinitelyComparePage = url.includes("/compare/") || url.includes("/pull/new") || url.includes("/pull/");

      if (!isDefinitelyComparePage) {
        console.log("PullCraft: Not on a PR page, skipping injection");
        return;
      }

      console.log("PullCraft: On PR page but no field found yet, injecting button anyway");
    }

    // Check if button already exists
    if (document.querySelector(".pr-autofill-floating-button")) {
      console.log("PullCraft: Button already exists, skipping injection");
      return;
    }

    // Create floating container
    const floatingContainer = document.createElement("div");
    floatingContainer.className = "pr-autofill-floating-button";
    floatingContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
    `;

    // Create the actual button
    const autoFillButton = document.createElement("button");
    autoFillButton.type = "button";
    autoFillButton.className = "pr-autofill-btn";

    autoFillButton.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
      backdrop-filter: blur(10px);
      min-width: 140px;
      height: 44px;
    `;

    // Set initial button content
    autoFillButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      AI Auto-fill
    `;
    autoFillButton.title = "Generate PR description using AI based on your changes";

    // Add hover and focus effects
    autoFillButton.addEventListener("mouseenter", () => {
      if (this.currentState === "idle") {
        autoFillButton.style.transform = "translateY(-2px)";
        autoFillButton.style.boxShadow = "0 6px 16px rgba(25, 118, 210, 0.4)";
      }
    });

    autoFillButton.addEventListener("mouseleave", () => {
      if (this.currentState === "idle") {
        autoFillButton.style.transform = "translateY(0)";
        autoFillButton.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.3)";
      }
    });

    // Add click handler
    autoFillButton.addEventListener("click", this.handleAutoFillClick.bind(this));

    floatingContainer.appendChild(autoFillButton);
    document.body.appendChild(floatingContainer);
    this.floatingButton = autoFillButton;
    this.currentState = "idle";

    console.log("PullCraft: Floating button successfully injected!");
  }

  private updateButtonState(state: "idle" | "loading" | "success" | "error", errorMessage?: string) {
    if (!this.floatingButton) return;

    this.currentState = state;
    const button = this.floatingButton as HTMLButtonElement;

    // Reset styles
    button.style.transform = "translateY(0)";

    switch (state) {
      case "idle":
        button.disabled = false;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          AI Auto-fill
        `;
        button.style.background = "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)";
        button.style.cursor = "pointer";
        button.title = "Generate PR description using AI based on your changes";
        break;

      case "loading":
        button.disabled = true;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
            <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
          </svg>
          Generating...
        `;
        button.style.background = "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)";
        button.style.cursor = "not-allowed";
        button.title = "AI is generating your PR description...";
        break;

      case "success":
        button.disabled = false;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
          </svg>
          Generated!
        `;
        button.style.background = "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)";
        button.style.cursor = "pointer";
        button.title = "PR description generated successfully!";
        // Auto-reset to idle after 3 seconds
        setTimeout(() => this.updateButtonState("idle"), 3000);
        break;

      case "error":
        button.disabled = false;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm5,13H7a1,1,0,0,1,0-2H10A1,1,0,0,1,10,13Z"/>
          </svg>
          Try Again
        `;
        button.style.background = "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)";
        button.style.cursor = "pointer";
        button.title = errorMessage || "Click to try again";
        // Auto-reset to idle after 5 seconds
        setTimeout(() => this.updateButtonState("idle"), 5000);
        break;
    }

    // Add CSS animation for the spinner
    if (!document.querySelector("#pr-autofill-styles")) {
      const styles = document.createElement("style");
      styles.id = "pr-autofill-styles";
      styles.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  private async handleAutoFillClick(event: Event) {
    event.preventDefault();

    if (this.currentState !== "idle") return;

    this.updateButtonState("loading");

    try {
      // Get diff content
      const diffData = this.extractDiffData();

      // Get existing PR template
      const templateData = this.extractPRTemplate();

      // Get selected model from storage
      const result = await chrome.storage.sync.get(["selectedModel"]);
      const selectedModel = result.selectedModel || OpenAIModel.GPT_4O;

      // Send to background script for AI processing
      const response = await this.sendMessage({
        type: "GENERATE_PR_DESCRIPTION",
        data: {
          diff: diffData,
          template: templateData,
          url: window.location.href,
          model: selectedModel
        }
      });

      if (response.success && response.data) {
        this.fillPRDescription(response.data.description);
        this.updateButtonState("success");
      } else {
        throw new Error(response.error || "Failed to generate description");
      }
    } catch (error) {
      console.error("Auto-fill error:", error);
      this.updateButtonState("error", error.message);
    }
  }

  private extractDiffData(): string {
    // Try multiple selectors to get diff content
    let diffContent = "";

    // Method 1: Try to get diff from the compare view
    const diffElements = document.querySelectorAll(".file-diff, .diff-view, .js-diff-progressive-container");
    if (diffElements.length > 0) {
      diffElements.forEach((element) => {
        diffContent += element.textContent || "";
      });
    }

    // Method 2: Try to get commit information
    if (!diffContent) {
      const commitElements = document.querySelectorAll(".commit-message, .commit-title");
      commitElements.forEach((element) => {
        diffContent += element.textContent || "";
      });
    }

    // Method 3: Fallback to any visible code changes
    if (!diffContent) {
      const codeElements = document.querySelectorAll(".blob-code, .highlight, pre code");
      codeElements.forEach((element) => {
        const text = element.textContent || "";
        if (text.length > 10) {
          // Only include substantial content
          diffContent += text + "\n";
        }
      });
    }

    // Method 4: Ultimate fallback - check for file names and basic info
    if (!diffContent) {
      const fileHeaders = document.querySelectorAll(".file-header, .file-info");
      fileHeaders.forEach((element) => {
        diffContent += element.textContent || "";
      });
    }

    return (
      diffContent.trim() ||
      "No diff content available - please ensure you are on a GitHub compare page with visible changes."
    );
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      this.handleMessage(message).then(sendResponse);
      return true; // Will respond asynchronously
    });
  }

  private sendMessage(message: Message): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  private extractPRTemplate(): string {
    const prDescriptionField = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement;
    return prDescriptionField?.value || "";
  }

  private fillPRDescription(description: string) {
    const prDescriptionField = document.querySelector('textarea[name="pull_request[body]"]') as HTMLTextAreaElement;
    if (prDescriptionField) {
      prDescriptionField.value = description;

      // Trigger change events to notify GitHub's form validation
      prDescriptionField.dispatchEvent(new Event("input", { bubbles: true }));
      prDescriptionField.dispatchEvent(new Event("change", { bubbles: true }));

      // Focus the field briefly to ensure GitHub recognizes the change
      prDescriptionField.focus();
      prDescriptionField.blur();
    }
  }

  private observeNavigationChanges() {
    // Watch for GitHub's SPA navigation
    let currentUrl = window.location.href;

    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        this.cleanup();
        this.hasInjectedUI = false;
        this.detectComparePage();

        if (this.isComparePage) {
          this.setupAutoFillUI();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private cleanup() {
    // Remove existing floating button
    const existingButton = document.querySelector(".pr-autofill-floating-button");
    if (existingButton) {
      existingButton.remove();
    }
    this.floatingButton = null;
    this.currentState = "idle";
  }

  private async handleMessage(message: Message): Promise<AutoFillResponse> {
    try {
      switch (message.type) {
        case "GET_DIFF":
          return {
            success: true,
            data: this.extractDiffData()
          };

        case "GET_TEMPLATE":
          return {
            success: true,
            data: this.extractPRTemplate()
          };

        case "FILL_DESCRIPTION":
          this.fillPRDescription(message.data);
          return { success: true };

        default:
          return {
            success: false,
            error: "Unknown message type"
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new GitHubPRAutoFill());
} else {
  new GitHubPRAutoFill();
}
