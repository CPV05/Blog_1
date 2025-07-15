const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Servir el contenido estático de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Catch-All" or "Fallback"
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// Start server
app.listen(PORT, () => { console.log(`Server started on 🌐 ​http://localhost:${PORT} 🌐​`); });