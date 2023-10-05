import express from 'express';
import { BookRouter } from './routes/api/book.js';
import { UserRouter } from './routes/api/user.js';
import * as dotenv from 'dotenv';
dotenv.config();
import { connect } from './database.js';

// Create a debug channel called app:Server
import debug from 'debug';
const debugServer = debug('app:Server');

connect();

const app = express();

// Middleware
// Allow form data
app.use( express.urlencoded({extended: true,}));
app.use('/api/books', BookRouter);
app.use('/api/users', UserRouter);

// Error Handling middleware to handle routes not found
app.use((req,res) => {
  res.status(404).json({error: `Sorry couldn't find ${req.originalUrl}`});
});

// Handle server exceptions to keep my server from crashing
app.use((err, req, res, next) => {
  debug(err.stack);
  res.status(500).json({error: err.stack});
});

// Default route
app.get('/', (req, res) => {
  res.send('Hello From Amazon.com!');
  debugServer('Hello from the upgraded console.log()!');
});

const port = process.env.PORT || 3005;

// Listen on port 3003
app.listen(port, () => {
  console.log(`Server is listening on http://localhost:3003`);
});
