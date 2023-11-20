import express from 'express';
import debug from 'debug';
const debugUser = debug('app:user');
debugUser.color = "63";
import { connect, getUsers, addUser, loginUser, newId, getUserById, updateUser, saveEdit, findRoleByName } from '../../database.js';
import bcrypt from 'bcrypt';
import Joi from 'joi';
import { validBody } from '../../middleware/validBody.js';
import { validId } from '../../middleware/validId.js';
import { isLoggedIn, fetchRoles, mergePermissions, hasPermission } from '@merlin4/express-auth';
import { Timestamp } from 'mongodb';
import jwt from 'jsonwebtoken';

const router = express.Router();

async function issueAuthToken(user) {
  const payload = { _id: user._id, email: user.email, role: user.role };
  const secret = process.env.JWT_SECRET;
  const options = {
    expiresIn: '1h'
  }

  const roles = await fetchRoles(user, role => findRoleByName(role));
  debugUser(JSON.stringify(roles));

  const permissions = mergePermissions(user, roles);
  payload.permissions = permissions;

  const authToken = jwt.sign(payload, secret, options);
  return authToken;
}

function issueAuthCookie(res, authToken) {
  const cookieOptions = {
    httpOnly: true,
    maxAge: 1000 * 60 * 60
  };
  res.cookie('authToken', authToken, cookieOptions);
}

// step 1: define new user schema
const newUserSchema = Joi.object({
  fullName: Joi.string().trim().min(1).max(50).required(),
  password: Joi.string().trim().min(8).max(50).required(),
  email: Joi.string().trim().email().required(),
});

const loginUserSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().trim().min(8).max(50).required(),
});

const updateUserSchema = Joi.object({
  fullName: Joi.string().trim().min(1).max(50),
  password: Joi.string().trim().min(8).max(50)
});

// Get all users
router.get('/list', isLoggedIn(), async (req, res) => {
  debugUser("Getting all users");
  try {
    const db = await connect();
    const users = await getUsers();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({
      error: err.stack
    });
  }

});

// Add a new user to the Mongo Atlas database
router.post('/add', validBody(newUserSchema), async (req, res) => {
  const newUser = {
    _id: newId(),
    ...req.body,
    createdDate: new Date()
  };

  newUser.password = await bcrypt.hash(newUser.password, 10);
  debugUser(`Adding User`);
  try {
    const dbResult = await addUser(newUser);
    if (dbResult.acknowledged == true) {
      const authToken = await issueAuthToken(newUser);
      issueAuthCookie(res, authToken);
      res.status(200).json({
        message: `User ${newUser.fullName} added with an id of ${dbResult.insertedId}, Your auth token is ${authToken}`
      });
    } else {
      res.status(400).json({
        message: `User ${newUser.fullName} not added. `
      });
    }
  } catch (err) {
    res.status(500).json({
      error: err
    });
  }
});

// Log a user in
router.post('/login', validBody(loginUserSchema), async (req, res) => {
  const user = req.body;
  debugUser(`Logging in User`);

  const resultUser = await loginUser(user);
  if (resultUser && await bcrypt.compare(user.password, resultUser.password)) {
    const authToken = await issueAuthToken(resultUser);
    issueAuthCookie(res, authToken);
    res.status(200).json({
            message:`Welcome ${resultUser.fullName}`,
            authToken:authToken,
            email:resultUser.email,
            fullName:resultUser.fullName,
          });
  } else {
    res.status(400).json(`email or password incorrect`);
  }
});

// Logout User
router.post('/logout', isLoggedIn(), async (req,res) => {
  res.clearCookie('authToken');
  res.status(200).json({message:'Logged Out'});
});

// Self Service Update
router.put('/update/me', isLoggedIn(), validBody(updateUserSchema), async (req, res) => {
  debugUser(`Self Service Route Updating a user ${JSON.stringify(req.auth)}`);
  const updatedUser = req.body;

  // Finding user
  try {
    const user = await getUserById(newId(req.auth._id));

    // Update user with updated user
    if (user) {
      if (updatedUser.fullName) {
        user.fullName = updatedUser.fullName;
      }
      if (updatedUser.password) {
        user.password = await bcrypt.hash(updatedUser.password, 10);
      }
      try {
        const dbResult = await updateUser(user);
        debugUser(dbResult.modifiedCount);
        if (dbResult.modifiedCount == 1) {
          const edit = {
            timeStamp: new Date(),
            op: 'Self-Edit Update User',
            collection: 'User',
            target: user._id,
            auth: req.auth
          }
          const dbEditResult = saveEdit(edit);
          res.status(200).json({ message: `User ${req.auth._id} updated` });
        } else {
          res.status(400).json({ message: `User ${req.auth._id} not updated` });
        }
      } catch (err) {
        res.status(500).json({ error: err });
      }
    } else {
      res.status(400).json({ message: `User ${req.auth._id} not updated` });
    }

    debugUser(JSON.stringify(user));
  } catch (err) {
    res.status(500).json({
      error: err
    });
  }
});

// Admin can update a user by the id
router.put('/update/:id', isLoggedIn(), validId('id'), validBody(updateUserSchema), async (req, res) => {
  debugUser(`Admin Route Updating a user`);
  const updatedUser = req.body;

  // Finding user
  try {
    const user = await getUserById(req.id);
  } catch (err) {
    res.status(500).json({
      error: err
    });
  }

  // Update user with updated user
  if (user) {
    if (updatedUser.fullName) {
      user.fullName = updatedUser.fullName;
    }
    if (updatedUser.password) {
      user.password = await bcrypt.hash(updatedUser.password, 10);
    }
    try {
      const dbResult = await updateUser(user);
      if (dbResult.modifiedCount == 1) {
        const edit = {
          timeStamp: new Date(),
          op: 'Admin Update User',
          collection: 'User',
          target: user._id,
          auth: req.auth
        }
        const dbEditResult = saveEdit(edit);
        res.status(200).json({
          message: `User ${req.id} updated`
        });
      } else {
        res.status(400).json({
          message: `User ${req.id} not updated`
        });
      }
    } catch (err) {
      res.status(500).json({
        error: err
      });
    }
  } else {
    res.status(400).json({
      message: `User ${req.auth.id} not updated`
    });
  }

  debugUser(JSON.stringify(user));
  res.status(200).json({
    message: ` ${resultUser.fullName}`
  });
});

export {
  router as UserRouter
}