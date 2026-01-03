require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

async function updateUsername() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await User.findOneAndUpdate(
      { username: 'admin' },
      { username: 'Wizzy' },
      { new: true }
    );

    if (result) {
      console.log('Username updated successfully!');
      console.log('Old username: admin');
      console.log('New username:', result.username);
    } else {
      console.log('User "admin" not found');
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateUsername();
