/**
 * Background script for PR Checklist Bot
 * Handles OpenAI API calls, storage management, and cross-tab communication
 */

import OpenAI from "openai";
import { OpenAIModel, AvailableModel } from "../types";

interface Message {
  type: "TEST_API_KEY" | "GENERATE_PR_DESCRIPTION" | "GET_SETTINGS";
  data?: any;
}

interface Response {
  success: boolean;
  data?: any;
  error?: string;
}

class PRChecklistBackground {
  private openai: OpenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Load API key from storage on startup
    this.loadApiKey();

    // Set up message listeners
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Handle installation/update
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));

    console.log("PR Checklist Bot background script loaded");
  }

  private async loadApiKey() {
    try {
      const result = await chrome.storage.sync.get(["openaiApiKey"]);
      if (result.openaiApiKey) {
        this.apiKey = result.openaiApiKey;
        this.initializeOpenAI();
      }
    } catch (error) {
      console.error("Failed to load API key:", error);
    }
  }

  private initializeOpenAI() {
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey
      });
    }
  }

  private handleInstall(details: chrome.runtime.InstalledDetails) {
    if (details.reason === "install") {
      console.log("PR Checklist Bot installed");
      // Could open onboarding page here
    } else if (details.reason === "update") {
      console.log("PR Checklist Bot updated");
    }
  }

  private handleMessage(
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: Response) => void
  ) {
    console.log("Background script received message:", message.type, message.data ? "with data" : "no data");

    // Handle async operations properly
    (async () => {
      try {
        let response: Response;

        switch (message.type) {
          case "TEST_API_KEY":
            console.log("Testing API key...");
            response = await this.testApiKey(message.data?.apiKey);
            console.log("API key test result:", response.success ? "success" : "failed");
            break;

          case "GENERATE_PR_DESCRIPTION":
            console.log("Generating PR description...");
            response = await this.generatePRDescription(message.data);
            break;

          case "GET_SETTINGS":
            console.log("Getting settings...");
            response = await this.getSettings();
            break;

          default:
            console.log("Unknown message type:", message.type);
            response = {
              success: false,
              error: "Unknown message type"
            };
        }

        console.log("Sending response:", response);
        sendResponse(response);
      } catch (error) {
        console.error("Background script error:", error);
        const errorResponse = {
          success: false,
          error: error.message || "Unknown error occurred"
        };
        console.log("Sending error response:", errorResponse);
        sendResponse(errorResponse);
      }
    })();

    return true; // Will respond asynchronously
  }

  private async testApiKey(apiKey?: string): Promise<Response> {
    try {
      const keyToTest = apiKey || this.apiKey;
      if (!keyToTest) {
        return {
          success: false,
          error: "No API key provided"
        };
      }

      // Update current API key if new one provided
      if (apiKey && apiKey !== this.apiKey) {
        this.apiKey = apiKey;
        this.initializeOpenAI();
      }

      if (!this.openai) {
        return {
          success: false,
          error: "OpenAI client not initialized"
        };
      }

      // Test with a simple completion
      const completion = await this.openai.chat.completions.create({
        model: OpenAIModel.GPT_4O_MINI,
        messages: [{ role: "user", content: 'Say "test"' }],
        max_tokens: 10,
        temperature: 0
      });

      if (completion && completion.choices && completion.choices.length > 0) {
        return {
          success: true,
          data: { valid: true, response: completion.choices[0].message?.content }
        };
      } else {
        return {
          success: false,
          error: "Invalid API response"
        };
      }
    } catch (error) {
      console.error("API key test failed:", error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  private async generatePRDescription(data: {
    diff: string;
    template: string;
    url: string;
    model?: string;
  }): Promise<Response> {
    try {
      if (!this.openai) {
        return {
          success: false,
          error: "OpenAI not configured. Please set up your API key in the extension settings."
        };
      }

      const { diff, template, url, model = OpenAIModel.GPT_4O } = data;

      // Validate model
      const validModels = Object.values(OpenAIModel);
      if (!validModels.includes(model as AvailableModel)) {
        return {
          success: false,
          error: `Invalid model: ${model}. Supported models: ${validModels.join(", ")}`
        };
      }

      // Build the prompt for GPT
      const prompt = this.buildPrompt(diff, template, url);

      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates professional pull request descriptions based on code changes. You should analyze the provided diff and fill out the PR template appropriately. Be concise but thorough."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });

      const generatedDescription = completion.choices[0]?.message?.content;

      if (!generatedDescription) {
        return {
          success: false,
          error: "No description generated"
        };
      }

      return {
        success: true,
        data: {
          description: generatedDescription.trim(),
          usage: completion.usage
        }
      };
    } catch (error) {
      console.error("PR description generation failed:", error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  private buildPrompt(diff: string, template: string, url: string): string {
    let prompt = `Please generate a pull request description based on the following information:

**URL:** ${url}

**Code Changes:**
${diff}

`;

    if (template && template.trim()) {
      prompt += `**PR Template to fill out:**
${template}

Please fill out the above template based on the code changes. If the template has sections like "Description", "Changes", "Testing", etc., please provide appropriate content for each section.`;
    } else {
      prompt += `**Instructions:**
Since no PR template was provided, please create a well-structured PR description with the following sections:
- **Description:** Brief overview of what this PR does
- **Changes:** List of key changes made
- **Testing:** How these changes should be tested (if applicable)

Keep the description professional and concise.`;
    }

    prompt += `

**Important:** 
- Only return the filled-out template or structured description, not any meta-commentary
- If there are checkboxes in the template (like "- [ ] Tests added"), check them off.
- Be specific about the changes based on the diff provided
- If the diff shows test files, mention testing in your response`;

    return prompt;
  }

  private async getSettings(): Promise<Response> {
    try {
      const result = await chrome.storage.sync.get(["openaiApiKey"]);
      return {
        success: true,
        data: {
          hasApiKey: !!result.openaiApiKey,
          isConnected: !!this.openai
        }
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to load settings"
      };
    }
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.type === "invalid_api_key") {
      return "Invalid API key. Please check your OpenAI API key.";
    }

    if (error?.error?.type === "insufficient_quota") {
      return "OpenAI API quota exceeded. Please check your billing.";
    }

    if (error?.error?.type === "rate_limit_exceeded") {
      return "Rate limit exceeded. Please try again in a moment.";
    }

    if (error?.code === "ENOTFOUND" || error?.code === "ECONNREFUSED") {
      return "Network error. Please check your internet connection.";
    }

    return error?.message || error?.error?.message || "An unexpected error occurred";
  }
}

// Initialize the background script
new PRChecklistBackground();
