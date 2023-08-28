/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Note = require('../models/Note');

// @desc Get all users
// @route Get /users
// @acess Private
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').lean();
  if (!users) {
    return res.status(400).json({ message: 'No users found' });
  }
  res.json(users);
});

// @desc create New user
// @route Post /users
// @acess Private
const createNewUser = asyncHandler(async (req, res) => {
  const { username, password, roles } = req.body;

  // Confirm data
  if (!username || !password || !Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check for duplicate
  const duplicate = await User.findOne({ username }).lean().exec();

  if (duplicate) {
    return res.status(409).json({ message: 'Duplicate username' });
  }

  // Hash password
  const hashedPwd = await bcrypt.hash(password, 10); // salt rounds
  const userObject = { username, password: hashedPwd, roles };

  // Create and store new user
  const user = await User.create(userObject);

  // user created successfully
  if (user) {
    res.status(201).json({ message: `New user ${username} created` });
  } else {
    res.status(400).json({ message: 'Invalid user data recieved' });
  }
});

// @desc Update a user
// @route Patch /users
// @acess Private
const updateUser = asyncHandler(async (req, res) => {
  const {
    id, username, roles, active, password,
  } = req.body;

  // Confirm data
  if (
    !id
    || !username
    || !Array.isArray(roles)
    || !roles.length
    || typeof active !== 'boolean'
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  // Check for duplicate
  const duplicate = await User.findOne({ username }).lean().exec();
  // Allow updates to the original user
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: 'Duplicate username' });
  }

  user.username = username;
  user.roles = roles;
  user.active = active;

  if (password) {
    // Hash password
    user.password = await bcrypt.hash(password, 10); // Salt password
  }

  const updatedUser = await user.save();
  res.join({ message: `${updatedUser.username} updated` });
});

// @desc Delete a user
// @route Delete /users
// @acess Private
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'User ID Required' });
  }

  const notes = await Note.findOne({ user: id }).lean().exec();
  if (notes?.length) {
    return res.status(400).json({ message: 'User has been assigned notes' });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  const result = await user.deleteOne();
  const reply = `Username ${result.username} with ID ${result._id} deleted`;
  res.json(reply);
});

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
