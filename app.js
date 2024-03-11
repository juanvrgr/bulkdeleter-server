const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const stripeRoutes = require('./routes/stripeRoutes');

const app = express();
app.use(express.json());

app.use(cors());

const PORT = process.env.PORT || 3001;

app.use('/api/', authRoutes);
app.use('/api/', userRoutes);
app.use('/api/', blogRoutes);
app.use('/api/', stripeRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));