# HRMS Portal

A comprehensive Human Resource Management System (HRMS) built with Next.js, designed to streamline employee management, leave requests, document handling, and more.

## 🚀 Features

- **Dashboard**: Interactive dashboard with a modern UI and loading skeletons.
- **Employee Management**: 
  - Comprehensive Employee Directory.
  - Detail views for individual employees (Profile, Bank Info, Documents).
  - Role-based access control.
- **Leave Management**: 
  - Apply for leaves.
  - HR approval workflows.
  - Automated calendar integration (Google Calendar).
- **Document Management**:
  - Secure document storage.
  - NDA management with specific access rights.
- **Notifications**: Real-time notifications for interactions and updates.
- **Authentication**: Secure login with password reset functionality via Email.
- **Integrations**:
  - **Salesforce**: For backend data management and holiday calendars.
  - **DynamoDB**: For token storage and high-performance data handling.
  - **Google Calendar**: For syncing leave and holiday events.
- **Tools**: PDF generation, Rich Text Editing, and more.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database / Backend**: Salesforce, AWS DynamoDB
- **State Management**: React Context / Custom Stores
- **Utilities**: `jspdf`, `html2canvas` for PDF generation

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and configure the necessary keys (Salesforce, AWS, Gmail, etc.).
   
   *Example variables often required:*
   ```env
   # Salesforce
    SALESFORCE_LOGIN_URL=
    SALESFORCE_USERNAME=
    SALESFORCE_PASSWORD=
    SALESFORCE_SECURITY_TOKEN=

    # AWS (DynamoDB & S3)
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    AWS_REGION=
    S3_BUCKET_NAME=

    # NextAuth
    NEXTAUTH_SECRET=
    NEXTAUTH_URL=
    ENCRYPTION_KEY = 
    SESSION_SECRET =

    # Notifications
    GMAIL_USER=
    GMAIL_APP_PASSWORD=
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open the app:**
   Navigate to [http://localhost:8080](http://localhost:8080) to view the application.

## 📂 Project Structure

- `/app`: Main application routes and pages (Next.js App Router).
- `/components`: Reusable UI components.
- `/lib`: Utility functions and clients (Salesforce, AWS, etc.).
- `/store`: State management logic.
- `/types`: TypeScript type definitions.
- `/public`: Static assets.

