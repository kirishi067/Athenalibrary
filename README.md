# 🏛️ Athena Library Database Management System

A web-based digital platform designed to efficiently manage and organize the activities of a modern library. Built with a fast, dependency-free Node.js native engine, SQLite ACID transactional database storage, and a responsive Single Page Application UI.

---

## 📋 Features

- **Interactive Operations Dashboard**: Real-time KPI counters (Titles, Shelf Inventory, Active Loans, Overdues, Pending Fines, Active Holds), circulation analytics by subject genre, most borrowed book leaderboards, and live audit activity stream.
- **Book Management & Inventory Tracking**:
  - Add, edit, view, and delete book titles with ISBN validation.
  - Track total vs. available copies in real time.
  - Shelf and rack location mapping (e.g. `Shelf CS-102`).
  - Grid view (cards with covers and category pills) & Table view with instant status badges.
- **Member Directory & Profiles**:
  - Student, Faculty, and General membership management.
  - Configurable borrow limits per member category.
  - Complete reader profile modal displaying active loans, past reading history, fine payments, and active holds.
- **Circulation (Issue & Return Operations)**:
  - 1-click book check-out (issue) with member loan limit and inventory validation.
  - Check-in (return) processor with automated overdue calculation.
  - 14-day loan extension renewals with limit safeguards.
- **Book Reservations & Hold Queues**:
  - Reserve currently unavailable or on-shelf books.
  - Automatic queue progression: when a book is checked in, the oldest waiting reservation is automatically converted to `Ready for Pickup` with an instant notification.
- **Overdue Tracking & Fine Management**:
  - Real-time overdue fees calculation based on configurable daily rates.
  - Electronic fee collection with payment methods (Cash, Card, Online, CampusPay) and digital receipt generation (`RCP-xxxxxx`).
  - Administrative fine waivers with audit reason tracking.
- **Authors & Subject Categories Classification**:
  - Author biographies, nationalities, and life years.
  - Genre classification with custom theme color palettes.
- **Institutional Reports & CSV Exports**:
  - Downloadable CSV reports: Book Catalog CSV, Circulation History CSV, and Fines & Payments Ledger CSV.
  - Print-ready reports view.
- **Role-Based Access Control (RBAC)**:
  - **Administrator**: Full privileges, loan policy parameters, fine rates, user accounts, and database factory resets.
  - **Librarian**: Cataloging, member registration, circulation check-in/out, hold management, and fine collections.
  - **Member Portal**: Self-service reader portal to browse catalog, view borrowed books, renew items online, inspect fines, and place holds.

---

## 👥 Built-in Demo Personas

Switch between personas with **1-click** using the top navigation bar dropdown:

| Persona | Role | Default Username | Description |
|---|---|---|---|
| **Victoria Sterling** | Admin | `admin` | Full system administration and policy control |
| **Marcus Thorne** | Librarian | `librarian` | Desk operations, circulation, cataloging |
| **Emily Watson** | Student Member | `emily` | Student reader with active & overdue books |
| **Dr. Alexander Vance** | Faculty Member | `alex` | Faculty researcher with higher borrow limits |

---

## 🚀 Getting Started

### 1. Launch the Application

Double-click `start.bat` or run in terminal:

```powershell
.\node.cmd server.js
```

### 2. Open in Browser

Navigate to:
```
http://localhost:3000
```

---

## 🗄️ Database Architecture

The system utilizes SQLite (`library.db`) via Node.js native engine with zero external npm dependencies:

- `books`: ISBN, title, author, category, copies, shelf location, cover image, synopsis.
- `authors`: Name, bio, nationality, lifespan years.
- `categories`: Genre name, description, color code.
- `members`: Member code, name, contact info, member type, borrow limit, status, expiry date.
- `users`: Staff and member login credentials, role, avatar.
- `borrowings`: Book loan records, issue date, due date, return date, fines, renewals, status.
- `reservations`: Book hold requests, waiting queue position, readiness status.
- `fine_payments`: Financial audit ledger of all fine payments and receipt numbers.
- `notifications`: Automated user and member alerts (due dates, overdue warnings, hold ready).
- `activity_logs`: Timestamped audit trail of all staff and system actions.
- `settings`: Configurable institution parameters (fine rate, loan period, currency symbol).

---

## 🔌 API Endpoints Summary

- `GET /api/dashboard/stats` - High-level metrics and circulation charts
- `GET /api/books` | `POST /api/books` | `PUT /api/books/:id` | `DELETE /api/books/:id`
- `GET /api/members` | `POST /api/members` | `PUT /api/members/:id`
- `GET /api/borrowings` | `POST /api/borrowings/issue` | `POST /api/borrowings/return` | `POST /api/borrowings/renew`
- `GET /api/reservations` | `POST /api/reservations` | `PUT /api/reservations/:id/status`
- `GET /api/fines/overdue` | `POST /api/fines/pay` | `POST /api/fines/waive`
- `GET /api/reports/summary`
- `GET /api/settings` | `POST /api/settings` | `POST /api/settings/reset`
