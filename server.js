// =================================================================
//  IMPORTS
// =================================================================

// Modules of Node.js
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Modules of NPM
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');


// =================================================================
//  INITIALIZATION AND CONFIG
// =================================================================
const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);


// =================================================================
//  MIDDLEWARE
// =================================================================

// Security (Rate Limiters)
const DoSLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiadas peticiones enviadas.'
});

const burstLimiter = rateLimit({
    windowMs: 5 * 1000,
    max: 15,
    message: 'Has enviado demasiadas peticiones en un corto periodo. Por favor, espera unos segundos.',
});

app.use(DoSLimiter);
app.use(burstLimiter);

// Body parser
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session
const mongoUrl = 'mongodb://localhost:27017/mi_base_de_datos';
app.use(session({
    secret: 'un_secreto_muy_fuerte_y_largo',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoUrl }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }  // 7 days
}));

// Frontend
app.use(express.static(path.join(__dirname, 'public')));


// =================================================================
//  BD CONNECTION
// =================================================================
mongoose.connect('mongodb://localhost:27017/BD_BLOG')
    .then(() => console.log('✅ Conexión a MongoDB exitosa'))
    .catch(err => console.error('❌ Error de conexión a MongoDB:', err));


// =================================================================
//  MODELS AND SCHEMAS
// =================================================================

// Mongoose model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true},
    password: { type: String, required: true },
    securityPin: { type: String, required: true },
    profilePicturePath: { type: String },
    dateOfBirth: { type: Date, required: true },
    acceptsPublicity: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 2 * 1024 * 1024 // Límit 2 MB
  }
});

const apiLimiter = rateLimit({
    windowMs: 2 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Demasiadas peticiones a esta ruta, por favor intente de nuevo en unos segundos.'
});


// =================================================================
//  ROUTES
// =================================================================

// Route to login a user
app.post('/login', apiLimiter, async (req, res) => {
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
app.post('/register', apiLimiter, (req, res) => {
    upload.single('profilePicture')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'El archivo es demasiado grande. El límite es de 2MB.' });
            }
            return res.status(400).json({ message: `Error al subir el archivo: ${err.message}` });
        }
        else if (err) {
            return res.status(500).json({ message: `Error desconocido: ${err.message}` });
        }

        const tempFile = req.file;

        try {
            const { username, email, confirmEmail, password, confirmPassword, dateOfBirth, acceptsPublicity } = req.body;

            if (!username || !email || !password || !confirmPassword || !dateOfBirth || !tempFile) {
                if (tempFile) fs.unlinkSync(tempFile.path);
                return res.status(400).json({ message: 'Faltan campos por rellenar.' });
            }
            
            // Username validation
            if (username.length < 3) {
                if (tempFile) fs.unlinkSync(tempFile.path);
                return res.status(400).json({ message: 'El nombre de usuario debe tener al menos 3 caracteres.' });
            }
            
            // Email validation
            if (email !== confirmEmail) {
                if (tempFile) fs.unlinkSync(tempFile.path);
                return res.status(400).json({ message: 'Los emails no coinciden.' });
            }

            // Password validation
            if (password.length < 6) {
                if (tempFile) fs.unlinkSync(tempFile.path);
                return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
            }
            if (password !== confirmPassword) {
                if (tempFile) fs.unlinkSync(tempFile.path);
                return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
            }

            // Birthdate validation
            const birthDate = new Date(dateOfBirth);
            const minDate = new Date('1900-01-01');
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (isNaN(birthDate.getTime()) || birthDate > now || birthDate < minDate) {
                if (tempFile) fs.unlinkSync(tempFile.path);
                return res.status(400).json({ message: 'La fecha de nacimiento proporcionada no es válida.' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Generate a random security pin
            let securityPin;
            let isPinUnique = false;
            while (!isPinUnique) {
                securityPin = crypto.randomBytes(5).toString('hex');
                const existingUser = await User.findOne({ securityPin: securityPin });
                if (!existingUser) {
                    isPinUnique = true;
                }
            }

            const newUser = new User({
                username,
                email,
                password: hashedPassword,
                securityPin,
                dateOfBirth,
                acceptsPublicity: !!acceptsPublicity
            });
            await newUser.save();

            // Save the profile picture
            const newFileName = `${newUser._id}.webp`;
            const newPath = path.join(__dirname, 'uploads', newFileName);

            await sharp(tempFile.path)
                .resize(500, 500, { fit: 'cover' })
                .webp({ quality: 80 })
                .toFile(newPath);

            fs.unlinkSync(tempFile.path);

            newUser.profilePicturePath = `uploads/${newFileName}`;
            await newUser.save();

            res.status(201).json({ message: 'Usuario registrado con éxito!', userId: newUser._id });

        }
        catch (error) {
            if (tempFile) fs.unlinkSync(tempFile.path); // Delete the temporary file

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


// =================================================================
//  CATCH-ALL AND START SERVER
// =================================================================

// Catch-all route
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// Start the server
app.listen(PORT, () => { console.log(`Server started on 🌐 ​http://localhost:${PORT} 🌐​`); });