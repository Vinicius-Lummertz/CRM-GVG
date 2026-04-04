require('dotenv').config();
const express = require('express');
const cors = require('cors');

const messagesGet = require('./messages/get');
const messagesSendOtp = require('./messages/send/otp');
const messagesVerifyOtp = require('./messages/verify/otp');
const messagesSendFreeText = require('./messages/send/freeText');
const templatesCreate = require('./templates/create');
const templatesGet = require('./templates/get');

const app = express();

// Middlewares
app.use(cors({
    origin: '*', // Permite o front-end acessar de qualquer URL/localhost
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.post('/api/v2/otp/webhook', messagesGet);
app.post('/api/v2/otp/send', messagesSendOtp);
app.post('/api/v2/otp/verify', messagesVerifyOtp);

app.post('/api/v2/chat/send', messagesSendFreeText);

app.post('/api/v2/templates', templatesCreate);
app.get('/api/v2/templates', templatesGet);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
