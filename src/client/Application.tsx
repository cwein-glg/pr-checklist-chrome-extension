import React, { useEffect, useState } from "react";

import {
  Button,
  Checkbox,
  Container,
  Fade,
  FormControlLabel,
  FormGroup,
  Grid,
  Divider,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  MenuItem
} from "@mui/material";
import {
  Settings,
  Security,
  AutoAwesome,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error,
  Info,
  Speed
} from "@mui/icons-material";

import { OpenAIModel, AVAILABLE_MODELS } from "../types";
import "./Application.scss";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ flex: 1, display: "flex", flexDirection: "column" }}
    >
      {value === index && children}
    </div>
  );
}

export const Application = () => {
  const [tabValue, setTabValue] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("Ready");
  const [selectedModel, setSelectedModel] = useState<OpenAIModel>(OpenAIModel.GPT_4O);

  useEffect(() => {
    loadSettings();
    checkConnection();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(["openaiApiKey", "selectedModel"]);
      if (result.openaiApiKey) {
        setApiKey(result.openaiApiKey);
        setIsConnected(true);
      }
      if (result.selectedModel) {
        setSelectedModel(result.selectedModel);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveApiKey = async () => {
    console.log("saveApiKey called with:", apiKey.substring(0, 7) + "...");

    if (!apiKey.trim()) {
      setMessage({ type: "error", text: "Please enter an API key" });
      return;
    }

    if (!apiKey.startsWith("sk-")) {
      setMessage({ type: "error", text: 'Invalid API key format. Should start with "sk-"' });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Saving API key to storage...");
      await chrome.storage.sync.set({ openaiApiKey: apiKey });
      console.log("API key saved to storage successfully");

      // Test the API key
      console.log("Sending message to background script...");
      const response: any = await new Promise((resolve, reject) => {
        // Set a timeout for the message
        const timeout = setTimeout(() => {
          reject(new (Error as any)("Request timeout - the background script took too long to respond"));
        }, 30000); // 30 seconds timeout

        chrome.runtime.sendMessage(
          {
            type: "TEST_API_KEY",
            data: { apiKey }
          },
          (response: any) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {
              console.error("Runtime error:", chrome.runtime.lastError);
              reject(new (Error as any)(chrome.runtime.lastError.message || "Runtime error occurred"));
            } else {
              console.log("Response from background script:", response);
              resolve(response);
            }
          }
        );
      });

      if (response && response.success) {
        setMessage({ type: "success", text: "API key saved and verified!" });
        setIsConnected(true);
        console.log("API key verification successful");
      } else {
        const errorMsg = response?.error || "Failed to verify API key";
        console.error("API key verification failed:", errorMsg);
        setMessage({ type: "error", text: errorMsg });
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error in saveApiKey:", error);
      setMessage({ type: "error", text: `Failed to save API key: ${error.message}` });
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const clearApiKey = async () => {
    try {
      await chrome.storage.sync.remove(["openaiApiKey"]);
      setApiKey("");
      setIsConnected(false);
      setMessage({ type: "info", text: "API key cleared" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to clear API key" });
    }
  };

  const checkConnection = async () => {
    try {
      const result = await chrome.storage.sync.get(["openaiApiKey"]);
      if (result.openaiApiKey) {
        const response = await chrome.runtime.sendMessage({
          type: "TEST_API_KEY",
          data: { apiKey: result.openaiApiKey }
        });
        setIsConnected(response.success);
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const testGeneration = async () => {
    setIsLoading(true);
    setCurrentStatus("Testing AI generation...");

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GENERATE_PR_DESCRIPTION",
        data: {
          diff: "Test diff content: Added new feature for user authentication",
          template: "## Description\n\n## Changes\n\n## Testing",
          url: "https://github.com/test/repo/compare/main...feature",
          model: selectedModel
        }
      });

      if (response.success) {
        setMessage({ type: "success", text: "AI generation test successful!" });
        setCurrentStatus("Ready");
      } else {
        setMessage({ type: "error", text: response.error || "Test failed" });
        setCurrentStatus("Error");
      }
    } catch (error) {
      setMessage({ type: "error", text: "Test generation failed" });
      setCurrentStatus("Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
    if (message) setMessage(null);
  };

  const handleModelChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newModel = event.target.value as OpenAIModel;
    setSelectedModel(newModel);

    // Save model to storage immediately
    try {
      await chrome.storage.sync.set({ selectedModel: newModel });
    } catch (error) {
      console.error("Failed to save model to storage:", error);
    }
  };

  return (
    <Container sx={{ width: "100%", p: 0, m: 0 }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "divider",
            background: "linear-gradient(135deg, rgba(139, 69, 244, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)",
            bgcolor: "background.paper",
            minHeight: 72
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Logo */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.25)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src="/images/icon/1024.png"
                alt="Click'n'Ship Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "10px"
                }}
              />
            </Box>

            {/* Title */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "#1876d2",
                letterSpacing: "0.03em"
              }}
            >
              Click'n'Ship
            </Typography>
          </Box>

          {/* Beta Badge */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              px: 1.5,
              py: 0.4,
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
            }}
          >
            Beta
          </Box>
        </Box>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            bgcolor: "background.paper",
            "& .MuiTab-root": {
              minHeight: 48,
              textTransform: "none",
              fontWeight: 500,
              color: "text.secondary",
              "&.Mui-selected": {
                color: "primary.main",
                fontWeight: 600
              }
            },
            "& .MuiTabs-indicator": {
              height: 2,
              borderRadius: 1
            }
          }}
        >
          <Tab icon={<Settings />} label="Settings" iconPosition="start" />
          <Tab icon={<Speed />} label="Status" iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2,
            flex: 1,
            overflow: "auto"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Security color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
              OpenAI Configuration
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="OpenAI API Key"
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="sk-..."
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: (
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowApiKey(!showApiKey)}
                  edge="end"
                  size="small"
                >
                  {showApiKey ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              )
            }}
          />

          <TextField
            select
            fullWidth
            label="AI Model"
            value={selectedModel}
            onChange={handleModelChange}
            variant="outlined"
            size="small"
          >
            {AVAILABLE_MODELS.map((model) => (
              <MenuItem key={model.value} value={model.value}>
                {model.label} ({model.description})
              </MenuItem>
            ))}
          </TextField>

          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "grey.200"
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <Info sx={{ fontSize: 16 }} />
              Your API key is stored locally and only used for generating PR descriptions.
            </Typography>
            <Typography variant="body2">
              Get your key from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1976d2", textDecoration: "none" }}
              >
                OpenAI Platform
              </a>
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={saveApiKey}
              disabled={isLoading || !apiKey.trim()}
              fullWidth
              sx={{
                textTransform: "none",
                fontWeight: 500
              }}
              startIcon={
                isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle sx={{ fontSize: 16 }} />
              }
            >
              {isLoading ? "Verifying..." : "Save & Verify"}
            </Button>

            {apiKey && (
              <Button
                variant="outlined"
                onClick={clearApiKey}
                disabled={isLoading}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  minWidth: 80
                }}
              >
                Clear
              </Button>
            )}
          </Box>

          {message && (
            <Alert severity={message.type} onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2,
            flex: 1,
            overflow: "auto"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Speed color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
              Extension Status
            </Typography>
          </Box>

          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  API Connection
                </Typography>
                {isConnected ? (
                  <CheckCircle color="success" sx={{ fontSize: 20 }} />
                ) : (
                  <Error color="error" sx={{ fontSize: 20 }} />
                )}
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: isConnected ? "success.main" : "error.main" }}
              >
                {isConnected ? "Connected & Ready" : "Not Connected"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isConnected
                  ? "Your OpenAI API key is working correctly"
                  : "Please configure your OpenAI API key in Settings"}
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                Current Status
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {currentStatus}
                </Typography>
                {isLoading && <CircularProgress size={16} />}
              </Box>
            </CardContent>
          </Card>

          <Button
            variant="contained"
            onClick={testGeneration}
            disabled={!isConnected || isLoading}
            fullWidth
            sx={{
              textTransform: "none",
              fontWeight: 500
            }}
            startIcon={<AutoAwesome />}
          >
            Test AI Generation
          </Button>

          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "grey.200"
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: "text.primary" }}>
              How to Use:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Navigate to a GitHub PR compare page and look for the floating "AI Auto-fill" button in the top-right
              corner to automatically craft intelligent PR descriptions.
            </Typography>
          </Box>

          {message && (
            <Alert severity={message.type} onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
        </Box>
      </TabPanel>
    </Container>
  );
};
