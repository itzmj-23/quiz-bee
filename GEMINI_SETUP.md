# AI-Powered Rebus Answer Generation Setup

This feature uses Google's Gemini API to automatically generate answer choices for rebus puzzle images.

## Quick Setup

### 1. Get Your Gemini API Key

Visit: **https://aistudio.google.com/app/apikey**

- Sign in with your Google account
- Click "Create API Key" or "Get API Key"
- Click "Create API key in new project" (or select existing project)
- Copy the API key (starts with `AIza...`)

### 2. Configure the API Key

**Option A: Environment Variable (Recommended)**
```bash
# Windows PowerShell
$env:GEMINI_API_KEY="your_api_key_here"

# Windows Command Prompt
set GEMINI_API_KEY=your_api_key_here

# Linux/Mac
export GEMINI_API_KEY=your_api_key_here
```

**Option B: .env File**
1. Copy `.env.example` to `.env`
2. Edit `.env` and add your key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Install dotenv: `npm install dotenv`
4. Add to server.js top: `require('dotenv').config();`

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
npm start
```

## Usage

1. Go to Admin → Questions → Create Question
2. Select "Rebus Puzzle Game" as the type
3. Upload or paste a rebus puzzle image
4. Click **"✨ Generate Answers with AI"**
5. The AI will automatically:
   - Analyze the rebus puzzle
   - Generate 4 answer choices
   - Suggest the correct answer

## Free Tier Limits

**Gemini 1.5 Flash** (used by this feature):
- ✅ 15 requests per minute
- ✅ 1 million tokens per day
- ✅ **100% FREE**

**Cost if you exceed free tier:**
- ~$0.00001875 per image (extremely cheap)

## Set Usage Quota (Optional)

To prevent exceeding the free tier:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Generative Language API"
3. Click "Quotas & System Limits"
4. Set daily request limit (e.g., 50 requests/day)

## Troubleshooting

**"API key not configured"**
- Make sure `GEMINI_API_KEY` environment variable is set
- Restart the server after setting the variable

**"Failed to fetch image"**
- Ensure image URL is publicly accessible
- For local images, use the drag-and-drop feature instead

**"Invalid Gemini response"**
- The AI might have returned an unexpected format
- Try a different image or regenerate

## How It Works

1. Your rebus image is sent to Gemini API
2. AI analyzes the visual puzzle
3. Generates 4 plausible answer choices
4. Identifies which one is correct
5. Automatically fills the form fields
