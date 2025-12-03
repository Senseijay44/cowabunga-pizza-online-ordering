// server.js
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Cowabunga Pizza server running on http://localhost:${PORT}`);
});
