# 🎙️ Mi Smart Speaker → DeepSeek AI Webhook

Convert your Mi Smart Speaker into a DeepSeek-powered assistant for ₹0 using Google Actions and Netlify Functions.

![Mi DeepSeek Speaker](public/favicon.ico)

## 📌 What is this?
Your Mi Smart Speaker runs Google Assistant. This project creates a **Google Action** ("Hey Google, talk to my AI assistant") that forwards everything you say to a **Netlify Function**, which passes it to the **DeepSeek API**. The response from DeepSeek is then spoken back to you immediately.

The best part? **All the tools used have generous free tiers**, meaning this won't cost you a rupee to run.

---

## 🚀 Quick Setup Guide

### 1. Get a Free DeepSeek API Key
1. Head over to [Platform DeepSeek](https://platform.deepseek.com/).
2. Sign in with your account.
3. Click to create an API key and copy the resulting string (`sk-...`). 

### 2. Fork or Clone this Repo
Push this entire folder to a new **public** GitHub repository (e.g., `mi-deepseek-speaker`).

### 3. Deploy to Netlify
1. Go to [Netlify](https://www.netlify.com/) and create a free account.
2. Click **Add new site** → **Import from an existing repository** (select your GitHub repo).
3. Before you hit Deploy, click on **Environment variables** and add:
   - Key: `DEEPSEEK_API_KEY`
   - Value: `[your copied key from step 1]`
4. Click **Deploy**. Netlify will give you a public URL (e.g., `https://your-site.netlify.app`).

### 4. Create the Google Action
1. Go to the [Google Actions Console](https://console.actions.google.com/).
2. Click **New Project** → Check **Custom** → **Blank project**.
3. Go to **Invocation** and set a name (like "my ai assistant").
4. Go to **Webhook** in the left menu.
5. Paste your Netlify URL followed by `/.netlify/functions/ai-webhook`. 
   - Example: `https://your-site.netlify.app/.netlify/functions/ai-webhook`
6. Click **Save**.

### 5. Talk to Your Speaker!
1. In the Actions console, click **Test** at the top. Enable testing for your account.
2. Walk over to your Mi Smart Speaker.
3. Say: **"Hey Google, talk to my ai assistant."**
4. It will say: "Hi! I'm DeepSeek, your AI assistant. What would you like to know?"
5. Start asking questions! Say "goodbye" to exit.

---

## 🛠️ Testing Locally

You can test the webhook logic without deploying:

1. Copy `.env.example` to `.env` and add your API key.
2. Install dependencies: `npm install`
3. Run the local dev server: `node server.js`
4. Open the test page at `http://localhost:8888` and use the built-in UI to test.

## ⚙️ Customizing the AI
Open `netlify/functions/ai-webhook.js` and modify the `SYSTEM_PROMPT` variable to give your AI a different personality or rules!
