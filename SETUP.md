# 🛠️ Project Setup Guide

Welcome to the **QAssure.ai Management Console** setup guide. This document provides step-by-step instructions to get the project running on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Git**: [Download Git](https://git-scm.com/downloads)
- **Node.js**: version 18.x or higher (LTS recommended) [Download Node.js](https://nodejs.org/)
- **npm**: version 9.x or higher (comes with Node.js)

---

## 🪟 Windows Setup

### 1. Install Dependencies

If you don't have Node.js installed, download the `.msi` installer from the official website and follow the installation wizard.

### 2. Configure Git (Optional but Recommended)

Open **Git Bash** or **PowerShell** and run:

```bash
git config --global core.autocrlf true
```

---

## 🐧 Ubuntu / Linux Setup

### 1. Install Node.js & npm

We recommend using **nvm** (Node Version Manager) to install Node.js:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 2. Configure Git

```bash
git config --global core.autocrlf input
```

---

## 🚀 Common Implementation Steps (All OS)

Once the prerequisites are met, follow these steps to set up the project:

### 1. Clone the Repository

Open your terminal (Command Prompt, PowerShell, or Bash) and run:

```bash
git clone https://github.com/your-repo/qassure-frontend.git
cd qassure-frontend
```

_(Replace the URL with the actual GitHub repository link)_

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file from the example template:

**Windows (PowerShell) / Ubuntu / Mac:**

```bash
cp .env.example .env
```

**Windows (Command Prompt):**

```cmd
copy .env.example .env
```

Then, open the `.env` file and configure the variables:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_FRONTEND_BASE_URL=http://localhost:5173
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173).

---

## 🔍 Troubleshooting

| Issue                       | Solution                                                                                                           |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `npm install` fails         | Try deleting `node_modules` and `package-lock.json`, then run `npm install` again.                                 |
| Port 5173 is already in use | Vite will automatically try the next available port (e.g., 5174). Look at the terminal output for the correct URL. |
| API Connection Errors       | Ensure the `VITE_API_BASE_URL` in your `.env` matches the running backend service.                                 |
| Node Version Conflict       | Ensure you are using Node 18+. Use `node -v` to check your version.                                                |

---

**Built with ❤️ by the QAssure Team**
