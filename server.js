import express from 'express';
import { BookRouter } from './routes/api/book.js';
import { UserRouter } from './routes/api/user.js';
import * as dotenv from 'dotenv';
dotenv.config();
import { connect } from './database.js';

// Create a debug channel called app:Server
import debug from 'debug';
const debugServer = debug('app:Server');

import cookieParser from 'cookie-parser';
import { authMiddleware } from '@merlin4/express-auth';
import cors from 'cors';

connect();

const app = express();

app.use(express.static('public'));
app.use(express.json()); //accepts json data in the body of the request from the client
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(cookieParser());
app.use(authMiddleware(process.env.JWT_SECRET, 'authToken', { httpOnly: true, maxAge: 1000*60*60 }));

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
  debug(err.message);
  res.status(err.status).json({error: err.message});
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
