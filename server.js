const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');


const app = express();
const PORT = process.env.PORT || 5000;

// --- Middlewares ---
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const mongoUrl = 'mongodb://localhost:27017/mi_base_de_datos';
app.use(session({
    secret: 'un_secreto_muy_fuerte_y_largo',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUrl }),
    cookie: { maxAge: 1000 * 60 * 60 * 120 }  // 5 days
}));

app.use(express.static(path.join(__dirname, 'public')));


// --- BD ---
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mi_base_de_datos')
    .then(() => console.log('✅ Conexión a MongoDB exitosa'))
    .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Model and Schema of users
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true},
    password: { type: String, required: true },
    securityPin: { type: String, required: true },
    profilePicturePath: { type: String },
    dateOfBirth: { type: Date, required: true }
});
const User = mongoose.model('User', userSchema);

// Route to login a user
app.post('/login', async (req, res) => {
    try {
        const { loginIdentifier, password } = req.body;

        if (!loginIdentifier || !password) {
            return res.status(400).json({ message: 'Se requieren usuario/email y contraseña.' });
        }

        const user = await User.findOne({
            $or: [
                { username: loginIdentifier },
                { email: loginIdentifier.toLowerCase() }
            ]
        });
        
        if (!user) { return res.status(401).json({ message: 'Usuario no encontrado.' }); }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(401).json({ message: 'Contraseña incorrecta.' }); }

        req.session.userId = user._id;

        res.status(200).json({ message: 'Inicio de sesión exitoso.' });

    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// Route to register a new user
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    try {
        const { username, email, password, confirmPassword, dateOfBirth } = req.body;
        const tempFile = req.file;

        if (!username || !email || !password || !confirmPassword || !dateOfBirth || !tempFile) {
            if(tempFile) fs.unlinkSync(tempFile.path);
            return res.status(400).json({ message: 'Faltan campos por rellenar.' });
        }

        //Email validation
        if (email !== confirmEmail) {
            if(tempFile) fs.unlinkSync(tempFile.path); // Si no coinciden, se borra el archivo subido.
            return res.status(400).json({ message: 'Los emails no coinciden.' });
        }

        //Password validation
        if (password !== confirmPassword) {
            if(tempFile) fs.unlinkSync(tempFile.path);
            return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate a random security pin
        const securityPin = Math.floor(10000000 + Math.random() * 90000000).toString();

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            securityPin,
            dateOfBirth
        });
        await newUser.save();

        // Save the profile picture
        const fileExtension = path.extname(tempFile.originalname);
        const newFileName = `${newUser._id}${fileExtension}`;
        const newPath = path.join('uploads', newFileName);
        
        fs.renameSync(tempFile.path, newPath);

        newUser.profilePicturePath = newPath;
        await newUser.save();

        res.status(201).json({ message: 'Usuario registrado con éxito!', userId: newUser._id });

    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern.username) {
                return res.status(409).json({ message: 'Este usuario ya existe.' });
            }
            if (error.keyPattern.email) {
                return res.status(409).json({ message: 'El email ya está registrado.' });
            }
        }
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
});

// Route to logout a user
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'No se pudo cerrar la sesión.' });
        }
        res.clearCookie('connect.sid'); // Limpia la cookie de sesión
        res.status(200).json({ message: 'Sesión cerrada con éxito.' });
    });
});
// --- End BD ---

// Catch-All"
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// Start server
app.listen(PORT, () => { console.log(`Server started on 🌐 ​http://localhost:${PORT} 🌐​`); });