<div align="center">

# 🛡️ ShieldGram

> **All-in-one, high-performance Telegram group management and channel security bot built with Node.js, TypeScript, gramY, and MongoDB.**

ShieldGram (`@ShieldGramxBot`) provides seamless community protection and dynamic group administration without relying on userbots, session strings, or risky permissions.

<br>

 <a href="https://t.me/ShieldGramxBot">
    <img src="https://img.shields.io/badge/_𝗧𝗥𝗬_𝗟𝗜𝗩𝗘_𝗕𝗢𝗧-24A1EF?style=for-the-badge&logo=telegram&logoColor=white" alt="Try Live Bot">
</a>

</div>

---

## ✨ Features

### 🛡️ Moderation & Anti-Spam Security
- **🔗 Anti-Link & Anti-Weblink Engine**: Detects and purges unauthorized Telegram invite links, external HTTP/HTTPS URLs, and domain references instantly.
- **🚫 Anti-Forward Protection**: Automatically intercepts and deletes messages forwarded from channels, user profile forwards, or external chats to prevent promo raids.
- **👤 Anti-Bio Link Guard**: Scans joining members' Telegram profiles and removes accounts featuring promo links or spam handles in their bio.
- **🤬 Word Blacklist Filter**: Automatically redacts or deletes messages containing custom blacklisted terms, profanity, or banned phrases.
- **⚡ Admin Moderation Commands**: Fast, responsive admin utilities for issuing warnings (`/warn`), muting (`/mute`), kicking (`/kick`), and banning (`/ban`) disruptive members.

### 📢 Audience Growth & Force-Sub
- **📈 Dynamic Force-Subscribe**: Intercepts chat activity and requires users to subscribe to up to multiple specified channels before sending messages.
- **🎟️ Real-Time Join Request Approver**: Millisecond auto-approval for channel/group join requests with optional welcome PM delivery.
- **🤖 PM Captcha Guard**: Prevents automated spam userbots from raiding group chats using single-click PM verification.

### ⚙️ Group Management & Usability
- **🔤 Multi-Prefix Command Support**: Use alternative prefixes (`.`, `?`, `$`, `~`) alongside default `/` commands seamlessly inside group chats.
- **📊 Real-Time Analytics (`/stats`)**: Live system dashboard tracking total users, total active groups, and force-sub channel stats with interactive refresh triggers.
- **🧹 System Alert Cleaner**: Automatically purges default service notifications (e.g., *"User joined"*, *"User left"*).
- **👋 Interactive Welcome & Rules Engine**: Customizable Welcome & Goodbye messages supporting dynamic tags (`{user}`, `{group}`), HTML formatting, and direct PM rules delivery (`/rules`).
- **⚡ In-Place PM Dashboard**: Real-time inline keyboard panel allowing group administrators to toggle features on and off instantly.

---

## 🛠️ Tech Stack

- **Language**: TypeScript / Node.js
- **Bot Framework**: [gramY](https://grammy.dev/)
- **Database**: MongoDB via Mongoose
- **License**: AGPL-3.0

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) instance (local or Atlas)
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)

### 1. Clone & Install Dependencies

```bash
git clone [https://github.com/MrBoss002/ShieldGram.git](https://github.com/MrBoss002/ShieldGram.git)
cd ShieldGram
npm install
```

### 2. Environment Setup
Create a .env file in the root directory:

```Code snippet
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyZ
MONGO_URI=mongodb://localhost:27017/shieldgram

ADMIN_HANDLE=MrBossTG
UPDATES_CHANNEL=[https://t.me/MrBossBotz](https://t.me/MrBossBotz)
SUPPORT_GROUP=[https://t.me/MrBossSupport](https://t.me/MrBossSupport)
DEV_GITHUB=[https://github.com/MrBoss002](https://github.com/MrBoss002)
```

### 3. Build & Run
Development Mode (Auto-reload):

```Bash
npm run dev
```
Production Mode:

```Bash
npm run build
npm start
```
---

## ⚙️ Environment Variables

To deploy **ShieldGram**, configure the following environment variables in your platform settings (e.g., Render, Koyeb, Railway) or local `.env` file:

### 🔴 Required Variables
| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `BOT_TOKEN` | Your Telegram Bot API Token from [@BotFather](https://t.me/BotFather) | `123456789:ABCdefGHIjklMNO...` |
| `MONGO_URI` | Your MongoDB connection string (Atlas or self-hosted) | `mongodb+srv://user:pass@cluster.mongodb.net/shieldgram` |

### 🟡 Optional Branding Variables *(Includes default fallbacks)*
| Variable Name | Description | Default Fallback |
| :--- | :--- | :--- |
| `ADMIN_HANDLE` | Admin handle/username | `MrBossTG` |
| `UPDATES_CHANNEL` | Official Updates Channel link | `https://t.me/MrBossBotz` |
| `SUPPORT_GROUP` | Official Support Group link | `https://t.me/MrBossSupport` |
| `DEV_GITHUB` | GitHub developer profile link | `https://github.com/MrBoss002` |

---

## 🚀 Deployment Guide

1. **Star this repository** to support the project! ⭐ &nbsp;&nbsp; <a href="https://github.com/MrBoss002/ShieldGram">
    <img src="https://img.shields.io/badge/Star%20Repo-1f2328?style=for-the-badge&logo=github&logoColor=white" alt="Star Repo">
  </a>

2. **Fork this repository** to your own GitHub account. 🍴 &nbsp;&nbsp; <a href="https://github.com/MrBoss002/ShieldGram/fork">
    <img src="https://img.shields.io/badge/Fork%20Repo-1f2328?style=for-the-badge&logo=git&logoColor=white" alt="Fork Repo">
  </a>

3. Choose your preferred cloud hosting provider below and deploy using your forked repo:

<br>

<p align="center">
  <a href="https://render.com/deploy?repo=https://github.com/MrBoss002/ShieldGram">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://app.koyeb.com/deploy?type=git&repository=https://github.com/MrBoss002/ShieldGram&branch=main&name=shieldgram">
    <img src="https://www.koyeb.com/static/images/deploy/button.svg" alt="Deploy to Koyeb">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://railway.app/new/template?template=https://github.com/MrBoss002/ShieldGram">
    <img src="https://railway.app/button.svg" alt="Deploy on Railway">
  </a>
</p>

<br>

### Universal Configuration Settings
If your platform requires manual command inputs during setup, use these standard parameters:
* **Build Command:** `npm install && npm run build`
* **Start / Run Command:** `npm start`
* Remember to add all required **Environment Variables** (`BOT_TOKEN`, `MONGO_URI`, etc.) in your dashboard settings before launching the instance.

> **⚠️ Note on Vercel & Serverless Platforms:** Vercel is optimized for short-lived HTTP requests, whereas Telegram bots running via long polling require a continuous, persistent process. We strongly recommend using Render (Background Worker), Koyeb, or Railway for optimal 24/7 performance.


---

## 📄 License
> This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

---

<div align="center">

## ☕ Support & Community

If ShieldGram saved you time or enhanced your community management, consider supporting the ongoing development of this project!

| ☕ Support Developer | 🌐 Updates Channel | ⛑ Need Assistance |
| :---: | :---: | :---: |
| [![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/MrBoss002) | [![Updates](https://img.shields.io/badge/Updates-%40MrBossBotz-FF0055?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/MrBossBotz) | [![Support](https://img.shields.io/badge/Support-%40MrBossSupport-229ED9?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/MrBossSupport) |

<br />

[![Developed By](https://img.shields.io/badge/Developed%20By-%40MrBoss002-00C853?style=flat-square&logo=github)](https://github.com/MrBoss002)

**ShieldGram** • Built with ❤️ for the open-source community.

</div>
