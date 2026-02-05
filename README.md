# 🛡️ Sentinel: AI-Driven Debt Recovery Governance

**Sentinel** is a centralized, AI-orchestrated platform designed to transform fragmented debt collection into a transparent, meritocratic, and governed ecosystem. By integrating **Master-Agent AI**, Sentinel replaces manual spreadsheets with real-time auditability and intelligent prioritization.

---

## 📑 Table of Contents
- [Problem Statement](#-problem-statement)
- [Proposed Solution](#-proposed-solution)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Economic Impact](#-economic-impact)
- [Installation & Setup](#-installation--setup)
- [Future Roadmap](#-future-roadmap)
- [The Team](#-the-team)

---

## ❓ Problem Statement
FedEx currently manages overdue accounts through manual, siloed processes (emails/spreadsheets), leading to:
* [cite_start]**"Black Box" Operations:** Minimal visibility into DCA (Debt Collection Agency) agent behavior[cite: 179, 184].
* [cite_start]**Weak Governance:** Lack of audit trails for interaction compliance[cite: 180, 183].
* [cite_start]**Inefficiency:** Slow feedback loops and delayed recovery cycles exceeding 25 days[cite: 182, 243].

---

## 💡 Proposed Solution
[cite_start]Sentinel provides a single, AI-driven platform that automates the end-to-end debt recovery process[cite: 186].
* [cite_start]**Intelligent Ingestion:** Single repository for case data via CSV or ERP sync, eliminating silos[cite: 187].
* [cite_start]**Propensity Prioritization:** AI scores payment likelihood to focus efforts on high-value accounts[cite: 188, 189].
* [cite_start]**Automated Compliance:** NLP-based monitoring ensures ethical collections and immediate breach alerts[cite: 191, 203].

---

## ✨ Key Features
* [cite_start]**🧠 AI Scoring Engine:** Utilizes Scikit-learn for Propensity-to-Pay and Complexity scoring[cite: 219].
* [cite_start]**⚖️ Meritocratic Allocation:** Auto-assigns cases to DCAs based on performance leaderboards and SLA capacity[cite: 189, 262].
* [cite_start]**🕵️ AI Sentinel Auditor:** Continuous real-time NLP monitoring for policy compliance and sentiment analysis[cite: 191, 220].
* [cite_start]**📊 Tri-Party Portals:** Specialized interfaces for FedEx Managers, DCA Agents, and Strategic Management[cite: 210, 211, 212, 213].

---

## 🛠️ Tech Stack
* [cite_start]**Frontend:** React.js, Tailwind CSS (Deployed as a Progressive Web App)[cite: 195].
* [cite_start]**Backend:** Node.js, Express.js with JWT-based Role-Based Access Control (RBAC)[cite: 196, 215].
* [cite_start]**AI & Intelligence:** Python, Scikit-learn, Pandas, NLP (BERT), and LangChain (Master-Agent architecture)[cite: 197, 218].
* [cite_start]**Database:** PostgreSQL (Financials/Audit) and MongoDB (Unstructured Interaction Logs)[cite: 198, 221].
* [cite_start]**Integration:** Future RPA interface for SAP/Oracle synchronization[cite: 198, 216].

---

## 📂 Project Structure
```
FedEx_iitmadras/
├── database/               # Database scripts & backups
│   ├── cleaned_data.csv   # Clean dataset backup (20,010 cases)
│   ├── clean_csv.py       # Data cleaning script
│   ├── import_csv.py      # Python CSV import script
│   ├── import_data.sql    # SQL data import script
│   └── README.md          # Database documentation
├── src/                   # React application source
│   ├── components/        # React components
│   ├── contexts/          # React contexts (Auth, UserProfile)
│   ├── pages/             # Page components
│   ├── lib/              # Supabase client & utilities
│   └── utils/            # Helper functions
├── supabase/             # Supabase configuration
│   ├── migrations/       # Database migrations
│   └── seed.sql          # Seed data
├── public/               # Static assets
├── scripts/              # Build & deployment scripts
├── model/                # AI/ML models
├── DATABASE.md           # Complete database guide
├── DATABASE_SCHEMA.md    # Schema documentation
└── DEPLOYMENT_CHECKLIST.md  # Deployment guide
```

---

## 🏗️ System Architecture
[cite_start]Sentinel follows a **three-tier, deployment-ready native architecture**[cite: 209].

1.  [cite_start]**Access Layer:** Dedicated portals for clients, managers, and DCA partners[cite: 210].
2.  [cite_start]**Orchestration Layer:** Node.js backend managing data streams and SLA rules[cite: 214].
3.  [cite_start]**Intelligence Layer:** Python-based AI agents for scoring and sentiment auditing[cite: 218].

---

## 📈 Economic Impact
| Metric | Pre-Sentinel (Manual) | Post-Sentinel (AI-Driven) | Impact |
| :--- | :--- | :--- | :--- |
| **Recovery Rate** | [cite_start]~45% [cite: 231] | [cite_start]**60–75%** [cite: 232] | [cite_start]Higher Liquidity [cite: 233] |
| **Allocation Time** | [cite_start]1–2 Days [cite: 235] | [cite_start]**<5 Minutes** [cite: 236] | [cite_start]Reduced Labor Costs [cite: 237] |
| **Audit Coverage** | [cite_start]<20% (Sample) [cite: 239] | [cite_start]**100% (Real-time)** [cite: 240] | [cite_start]Risk Mitigation [cite: 241] |
| **Case Cycle Time** | [cite_start]25+ Days [cite: 243] | [cite_start]**12–15 Days** [cite: 244] | [cite_start]Optimized Efficiency [cite: 245] |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd FedEx_iitmadras
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**

Create `.env.local` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Environment Configuration:** Configure .env files for the Node.js backend and Python AI services with your database credentials and API keys.

4. **Launch development server**
```bash
npm run dev
```

5. **Access the platform**
```
http://localhost:5173
```

### Build for Production
```bash
npm run build
npm run preview
```

---

## 🔮 Future Roadmap

**Short-Term:**
* Integration of Generative AI for personalized, empathetic outreach and live voice analytics
* RPA integration with SAP/Oracle ERP systems
* Advanced ML models for debtor segmentation

**Long-Term:**
* Development of agentic AI-driven workflows and blockchain-based security for immutable records
* Multi-language NLP support for global operations
* Blockchain-based audit trail for immutable compliance records

---

## 👥 The Team: Aegis

**Harsh Sharma:** Backend Development and API  
**Karan Singh:** Frontend Development & AI ML  
**Ankit Kumar Jha:** Research & UI/UX Design

Built by a dedicated team of AI engineers, full-stack developers, and domain experts committed to revolutionizing debt recovery operations for FedEx.

**Project Status:** Production-ready MVP with active development

---

**Last Updated**: January 10, 2026

For questions or support, please contact the development team.
