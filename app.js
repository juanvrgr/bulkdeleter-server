const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(express.json());

app.use(cors());

const PORT = process.env.PORT || 3001;

app.use(authRoutes);
app.use(userRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));