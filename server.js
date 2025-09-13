const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            workerSrc: ["'self'", "blob:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 contact form submissions per hour
    message: 'Too many contact form submissions, please try again later.'
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('Connected to MongoDB successfully');
})
.catch((error) => {
    console.error('MongoDB connection error:', error);
    mongoose.connect(MONGODB_URI)
    .then(()=> {
        console.log("Trying again to connect with the mongodb server");
    })
    .catch((error)=> {
        console.log("2nd try failed to connect with mongodb", error);
        process.exit(1);
    })
});

// Contact form schema
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
        minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        maxlength: [200, 'Subject cannot exceed 200 characters'],
        minlength: [5, 'Subject must be at least 5 characters']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters'],
        minlength: [10, 'Message must be at least 10 characters']
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    }
});

// Add indexes for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ isRead: 1 });

const Contact = mongoose.model('Contact', contactSchema);

// Validation middleware
const validateContactForm = (req, res, next) => {
    const { name, email, subject, message } = req.body;
    const errors = [];

    // Name validation
    if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
    }
    if (name && name.length > 100) {
        errors.push('Name cannot exceed 100 characters');
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
    }

    // Subject validation
    if (!subject || subject.trim().length < 5) {
        errors.push('Subject must be at least 5 characters long');
    }
    if (subject && subject.length > 200) {
        errors.push('Subject cannot exceed 200 characters');
    }

    // Message validation
    if (!message || message.trim().length < 10) {
        errors.push('Message must be at least 10 characters long');
    }
    if (message && message.length > 1000) {
        errors.push('Message cannot exceed 1000 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors: errors
        });
    }

    next();
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add this test route to verify MongoDB is working
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('Testing MongoDB connection...');
        
        // Test creating a simple document
        const testContact = new Contact({
            name: 'Test User',
            email: 'test@example.com',
            subject: 'Test Subject',
            message: 'This is a test message',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Agent'
        });
        
        const saved = await testContact.save();
        
        // Count total contacts
        const count = await Contact.countDocuments();
        
        // Get recent contacts
        const recent = await Contact.find().sort({ createdAt: -1 }).limit(3);
        
        res.json({
            success: true,
            message: 'MongoDB is working correctly',
            testId: saved._id,
            totalContacts: count,
            recentContacts: recent.map(c => ({
                id: c._id,
                name: c.name,
                email: c.email,
                createdAt: c.createdAt
            }))
        });
        
    } catch (error) {
        console.error('MongoDB test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Contact form submission
app.post('/api/contact', contactLimiter, validateContactForm, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Get client IP and user agent
        const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';

        // Create new contact entry
        const newContact = new Contact({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            subject: subject.trim(),
            message: message.trim(),
            ipAddress,
            userAgent
        });

        // Save to database
        const savedContact = await newContact.save();

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully! I will get back to you soon.',
            contactId: savedContact._id
        });

    } catch (error) {
        console.error('Error saving contact form:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                errors: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'An error occurred while sending your message. Please try again later.'
        });
    }
});

// Admin route to view contact submissions (basic implementation)
app.get('/api/admin/contacts', async (req, res) => {
    try {
        // In production, add proper authentication here
        const contacts = await Contact.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .select('-userAgent -ipAddress'); // Hide sensitive data

        res.json({
            success: true,
            contacts: contacts
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching contact submissions'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// 404 handler - serve index.html for all unmatched routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Local URL: http://localhost:${PORT}`);
});