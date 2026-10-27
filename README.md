# Getto India – E-commerce Frontend

A responsive e-commerce frontend application built with React and Vite. The application provides the user interface for browsing products and interacting with e-commerce features through backend APIs.

## 🚀 Features

- Responsive user interface
- Product listing and browsing
- API integration with the backend
- Component-based architecture using React
- Fast development and build process with Vite
- Environment-based API configuration
- ESLint configuration for code quality

## 🛠️ Tech Stack

- **Frontend:** React
- **Build Tool:** Vite
- **Language:** JavaScript
- **Styling:** CSS
- **Code Quality:** ESLint
- **Package Manager:** npm

## 📁 Project Structure

```text
getto-india-ecommerce-frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

*Note: The structure above is a suggested layout. Update it to match your actual source files.*

## 📋 Prerequisites

Install the following before running the project:

- Node.js
- npm
- Git

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/ponnanapavan/ponnanapavan-getto_india_ecommerce_frontend.git
```

Navigate to the project directory:

```bash
cd ponnanapavan-getto_india_ecommerce_frontend
```

Install dependencies:

```bash
npm install
```

## 🔐 Environment Configuration

Create a `.env` file in the project root.

For example, if your backend API uses a configurable URL:

```env
VITE_API_URL=http://localhost:5000
```

Replace the URL with your actual backend API address and variable name as required by your application.

**Important:** Vite exposes variables prefixed with `VITE_` to frontend code. Never store database passwords, private API keys, or other secrets in frontend environment variables.

Keep `.env` out of Git and commit only a safe `.env.example` file.

## ▶️ Run the Application

Start the development server:

```bash
npm run dev
```

Open the local URL printed in your terminal, usually:

```text
http://localhost:5173
```

## 🏗️ Production Build

Create an optimized production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## 🧹 Code Quality

Run ESLint:

```bash
npm run lint
```

## 🔗 Backend Integration

This frontend can communicate with the Getto India E-commerce backend through REST APIs.

Make sure that:

- The backend server is running.
- The API base URL is correctly configured.
- The backend allows requests from the frontend origin through CORS.
- The required environment variables are configured locally.

## 🔒 Security

- Do not commit `.env` files.
- Never expose database credentials or server-side secrets in frontend code.
- Use HTTPS for production API communication.
- Configure authentication and authorization securely on the backend.



