#  Ember Period Tracker

**Ember Period Tracker** is a privacy-first, AI-powered menstrual health platform designed to help users track their cycles, symptoms, moods, and personal health information in one secure and intuitive application.

The platform combines **period and cycle tracking with AI-powered health insights**, secure authentication, encrypted sensitive notes, and a consent-based partner companion mode. It is built as a modern full-stack web application using **Next.js, TypeScript, MongoDB, NextAuth.js, Tailwind CSS, and AI APIs**.

## 🚀 Live Demo

🌐 **Try the application:**
https://period-tracker-sage-five.vercel.app/

---

## ✨ Key Features

### 📅 Cycle & Period Tracking

Users can record and monitor their menstrual cycles through an interactive dashboard and calendar, making it easier to understand cycle patterns and important dates.

### 📊 Symptom & Mood Tracking

The application allows users to record symptoms and moods over time, creating a structured history that can be used to identify patterns and generate personalized insights.

### 🤖 AI Health Assistant

An integrated AI assistant provides conversational support and generates summaries based on the user's available tracking data.

The AI layer can be used for:

* Health-data summaries
* Pattern interpretation
* Conversational assistance
* Personalized insights

> AI-generated information is intended for informational purposes and is not a substitute for professional medical advice.

### 🔐 Privacy-Focused Health Data

Privacy is a core part of the project. Sensitive free-text health notes can be **encrypted before being stored**, helping protect personal information from unauthorized access.

### 🔑 Google Authentication

The application uses **Google OAuth through NextAuth.js** for secure and convenient authentication, with protected application routes and JWT-based sessions.

### 🤝 Consent-Based Partner Mode

Users can invite and connect with a partner through a dedicated companion mode, allowing health-related information to be shared through an explicit consent-based flow.

### 📈 Interactive Dashboard

The dashboard brings important information together in one place, including cycle information, tracked symptoms, moods, insights, and other relevant health data.

---

## 🛠️ Tech Stack

**Frontend**

* Next.js
* TypeScript
* Tailwind CSS
* Framer Motion
* Recharts

**Backend**

* Next.js App Router
* API Routes
* NextAuth.js
* MongoDB
* Mongoose

**AI**

* Groq API
* LLM-powered chat and health summaries

**Security**

* Google OAuth
* JWT sessions
* CryptoJS
* Encrypted sensitive notes

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │       User          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Next.js Frontend  │
                    │  Dashboard / UI     │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌──────────────┐ ┌────────────┐ ┌──────────────┐
        │ Authentication│ │ API Routes │ │ AI Assistant │
        │  NextAuth     │ │            │ │    Groq      │
        └──────────────┘ └─────┬──────┘ └──────────────┘
                               │
                               ▼
                       ┌───────────────┐
                       │   MongoDB     │
                       │   Mongoose    │
                       └───────────────┘
                               │
                               ▼
                     🔐 Protected Health Data
```

---

## 📂 Main Application Modules

The current application includes dedicated routes/modules for:

* `/` — Landing page
* `/login` — Google authentication
* `/dashboard` — Main health overview
* `/calendar` — Cycle tracking and calendar
* `/ai-assistant` — AI chat and summaries
* `/partner` — Partner invitation and connection
* `/settings` — Account and integration settings

---

## 🔒 Privacy & Security

Because menstrual and reproductive health information is highly personal, the project is designed with privacy in mind.

Key security considerations include:

* OAuth-based authentication
* Protected application routes
* JWT sessions
* Encrypted sensitive notes
* Environment-based secret management
* Secure database connectivity
* Consent-based partner sharing

Sensitive credentials and API keys are kept outside the repository using environment variables.

---

## 🎯 Project Goals

The main goal of Ember is to build a **single, privacy-conscious platform for menstrual health tracking and personalized insights**, rather than treating cycle tracking as only a calendar problem.

The project focuses on combining:

**Tracking + Privacy + AI + Personalization + Consent**

into one modern healthcare-oriented web application.

---

## 🔮 Future Improvements

Potential future development includes:

* 📱 Progressive Web App / mobile support
* 📊 More advanced cycle analytics
* 🧠 Improved personalized AI insights
* 🔔 Smart reminders and notifications
* 📈 Long-term health trend visualization
* 🔐 More advanced privacy controls
* 🤝 Expanded partner/family support
* 🩺 Integration with professional healthcare workflows

---

## ⚠️ Medical Disclaimer

Ember Period Tracker is a software project intended for **health tracking and informational purposes**.

AI-generated insights should not be considered medical diagnosis or professional medical advice. Users should consult qualified healthcare professionals for medical concerns.

---

## 👨‍💻 Developer

**Pranjal Pandey**

B.Tech Computer Science & Engineering (AI)

---

## 🌐 Links

**Live Application:**
https://period-tracker-sage-five.vercel.app/

**Source Code:**
https://github.com/pranjal0526/Period_tracker

---

⭐ If you find the project interesting, consider starring the repository and exploring the code.
