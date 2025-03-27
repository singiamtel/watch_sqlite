> [!WARNING]
> There's not much point in using this, [Datasette](https://datasette.io/) is a much better tool for this purpose.

# SQLite Database Viewer

A real-time SQLite database viewer with an interactive frontend built with TypeScript, React, and Tailwind CSS.

## Features

- Real-time monitoring of SQLite database changes
- Interactive table selection with tabs
- Animated table updates using Framer Motion
- Responsive design with Tailwind CSS
- WebSocket communication for instant updates
- Displays the latest entries first in each table
- **Dynamic database selection** - connect to any SQLite database on your system

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
   # Install all dependencies
   npm run install:all
   ```

### Running the Application

1. Start the application:
   ```
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

## Using Your Own SQLite Database

There are two ways to use your own SQLite database:

### 1. Through the UI (Recommended)

1. Click the "Change Database" button in the top-right corner of the application
2. Enter the absolute path to your SQLite database file
3. Click "Connect to Database"

The application will:
- Connect to the specified database if it exists
- Create a new database at the specified path if it doesn't exist (the directory must exist)
- Automatically refresh the UI to show the tables in the new database

### 2. Using Environment Variables

1. Set the `DB_PATH` environment variable to point to your SQLite database file:
   ```
   DB_PATH=/path/to/your/database.sqlite npm run dev
   ```

2. Alternatively, you can modify the `DEFAULT_DB_PATH` constant in `server/src/index.ts`.

## Adding Test Data

To add some random test data to the current database:

```
npm run add-data
```

This will add random users and products to the database, which is useful for testing the real-time update functionality.

## How It Works

- The server uses `better-sqlite3` to interact with the SQLite database
- A file watcher monitors changes to the database file
- When changes are detected, the server notifies connected clients via WebSockets
- The client receives these notifications and updates the UI accordingly
- Framer Motion provides smooth animations for table updates

## License

ISC 
