import express from 'express';
import debug from 'debug';
const debugUser = debug('app:user');
debugUser.color = "63";
import { connect, getUsers, addUser, loginUser } from '../../database.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Get all users
router.get('/list', async (req, res) => {
  debugUser("Getting all users");
  try {
    const db = await connect();
    const users = await getUsers();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({error: err.stack});
  }

});

// Add a new user to the Mongo Atlas database
router.post('/add', async (req, res) => {
  const newUser = req.body;
  newUser.password = await bcrypt.hash(newUser.password, 10);
  debugUser(`Adding User`);
  try {
    const dbResult = await addUser(newUser);
    if(dbResult.acknowledged == true){
      res.status(200).json({message: `User ${newUser.fullName} added with an id of ${dbResult.insertedId}`});
    }
    else{
      res.status(400).json({message: `User ${newUser.fullName} not added`});
    }
  } catch (err) {
    res.status(500).json({error: err});
  }
});

// Log a user in
router.post('/login', async (req, res) => {
  const user = req.body;
  debugUser(`Logging in User`);

  const resultUser = await loginUser(user);
  if (resultUser && await bcrypt.compare(user.password, resultUser.password)) {
    res.status(200).json(`Welcome ${resultUser.fullName}`);
  }
  else{
    res.status(400).json(`email or password incorrect`);
  }
});

export {router as UserRouter}