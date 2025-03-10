# SQLite Database Viewer

A real-time SQLite database viewer with an interactive frontend built with TypeScript, React, and Tailwind CSS.

## Features

- Real-time monitoring of SQLite database changes
- Interactive table selection with tabs
- Animated table updates using Framer Motion
- Responsive design with Tailwind CSS
- WebSocket communication for instant updates
- Displays the last 100 entries in each table

## Project Structure

```
.
├── client/             # React frontend
│   ├── src/            # Source code
│   │   ├── components/ # React components
│   │   ├── App.tsx     # Main application component
│   │   └── main.tsx    # Entry point
│   ├── index.html      # HTML template
│   └── package.json    # Dependencies
└── server/             # Node.js backend
    ├── src/            # Source code
    │   ├── index.ts    # Main server file
    │   └── watcher.ts  # Database file watcher
    └── package.json    # Dependencies
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd sqlite-viewer
   ```

2. Install dependencies for both client and server:
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

### Running the Application

1. Start the server:
   ```
   cd server
   npm run dev
   ```

2. In a separate terminal, start the client:
   ```
   cd client
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Using Your Own SQLite Database

By default, the application creates a sample SQLite database with some test data. To use your own database:

1. Set the `DB_PATH` environment variable to point to your SQLite database file:
   ```
   DB_PATH=/path/to/your/database.sqlite npm run dev
   ```

2. Alternatively, you can modify the `DB_PATH` constant in `server/src/index.ts`.

## How It Works

- The server uses `better-sqlite3` to interact with the SQLite database
- A file watcher monitors changes to the database file
- When changes are detected, the server notifies connected clients via WebSockets
- The client receives these notifications and updates the UI accordingly
- Framer Motion provides smooth animations for table updates

## License

ISC 