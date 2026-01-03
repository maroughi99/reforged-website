require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ username: 'Wizzy' });
    
    if (user) {
      console.log('User found:');
      console.log('  Username:', user.username);
      console.log('  Email:', user.email);
      console.log('  isAdmin:', user.isAdmin);
      console.log('  createdAt:', user.createdAt);
      
      if (!user.isAdmin) {
        console.log('\n⚠️ User is NOT an admin. Setting isAdmin to true...');
        user.isAdmin = true;
        await user.save();
        console.log('✅ User is now an admin!');
      } else {
        console.log('\n✅ User is already an admin');
      }
    } else {
      console.log('❌ User "Wizzy" not found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAdmin();
