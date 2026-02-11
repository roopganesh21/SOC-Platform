require('dotenv').config();

const http = require('http');
const app = require('./app');
const { migrate } = require('./config/database');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // Run database migrations (create tables/indexes if they do not exist)
    migrate();

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`SOC backend server listening on port ${PORT}`);
    });

    // Optional: handle unexpected errors gracefully
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
