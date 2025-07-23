# PR Checklist Bot - Chrome Extension

A Chrome extension that automatically fills out GitHub PR descriptions using AI. The extension analyzes your code changes and generates professional PR descriptions based on the diff and any existing PR template.

## Features

- 🤖 **AI-Powered**: Uses OpenAI GPT to generate meaningful PR descriptions
- 🎯 **Model Selection**: Choose between GPT-4o and GPT-4o-mini models
- 📝 **Template Aware**: Works with existing PR templates in your repositories
- 🔍 **Smart Diff Analysis**: Analyzes actual code changes to create relevant descriptions
- ⚙️ **Easy Setup**: Simple settings UI for API key management
- 🚀 **One-Click Generation**: Adds a convenient button to GitHub PR pages
- 🔒 **Secure**: API key stored locally in your browser

## Setup

### 1. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Generate a new API key (starts with `sk-`)
4. Keep this key secure - you'll need it for the extension

### 2. Install Extension

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode" (toggle in top right)
6. Click "Load unpacked" and select the top level folder (typically `pr-checklist-chrome-extension`)

### 3. Configure Extension

1. Click the extension icon in your browser toolbar
2. Go to the "⚙️ Settings" tab
3. Enter your OpenAI API key
4. Select your preferred AI model:
   - **GPT-4o**: Most capable model, best quality (recommended)
   - **GPT-4o-mini**: Faster and more cost-effective
5. Click "Save & Verify" to test the connection

## Usage

1. **Navigate to GitHub**: Go to any GitHub repository
2. **Start a PR**: Click "Compare & pull request" or go to a compare page
3. **Auto-fill**: Look for the "🤖 Auto-fill with AI" button near the PR description field
4. **Generate**: Click the button and wait for AI to analyze your changes
5. **Review & Submit**: Review the generated description and submit your PR

## How It Works

The extension:

1. **Detects GitHub PR pages** using content scripts
2. **Extracts diff data** from the GitHub interface
3. **Reads any PR template** already in the description field
4. **Sends to OpenAI** with your selected model and a carefully crafted prompt
5. **Fills the description** with the AI-generated content

## Extension Architecture

```
├── src/
│   ├── background/     # Service worker for API calls
│   ├── client/         # Popup UI (React + Material-UI)
│   └── content/        # GitHub page integration
├── manifest.json       # Extension configuration
└── dist/              # Built extension files
```

## Development

### Commands

- `npm run build` - Build for production
- `npm run build:w` - Build with watch mode for development

### Testing

1. Make code changes
2. Run `npm run build`
3. Reload the extension in Chrome
4. Test on a GitHub PR page

## Privacy & Security

- ✅ API key stored locally in Chrome storage
- ✅ Only sends diff data and PR templates to OpenAI
- ✅ No data stored on external servers
- ✅ Works only on GitHub.com domains
- ⚠️ Requires OpenAI API access (costs apply based on usage)

## Troubleshooting

### Extension not appearing on GitHub

- Ensure you're on a GitHub compare page (`/compare/` or `/pull/new`)
- Check that the extension is enabled in Chrome
- Refresh the page and wait a moment for the button to appear

### API key errors

- Verify your key starts with `sk-`
- Check your OpenAI account has available credits
- Try generating a new API key

### No diff data extracted

- Ensure the GitHub page has visible changes
- Try refreshing the page
- Check browser console for error messages

## Cost Estimation

The extension supports two OpenAI models with different cost profiles:

- **GPT-4o**: ~$0.01-0.05 per PR description (higher quality)
- **GPT-4o-mini**: ~$0.001-0.01 per PR description (more cost-effective)

- ~$0.001-0.01 per PR description (varies by diff size)
- Typical usage: $1-5 per month for regular development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or feature requests, please open a GitHub issue.
