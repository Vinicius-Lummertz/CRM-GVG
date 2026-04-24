require('dotenv').config();
const express = require('express');
const cors = require('cors');

const messagesGet = require('./messages/get');
const messagesList = require('./messages/list');
const messagesSendOtp = require('./messages/send/otp');
const messagesVerifyOtp = require('./messages/verify/otp');
const chatMessages = require('./chat/messages');
const chatRead = require('./chat/read');
const chatSendText = require('./chat/sendText');
const chatSendTemplate = require('./chat/sendTemplate');
const chatStatusWebhook = require('./chat/statusWebhook');
const templatesCreate = require('./templates/create');
const templatesGet = require('./templates/get');
const templatesSend = require('./templates/send');
const leadsGet = require('./leads/get');
const leadsCreate = require('./leads/create');
const sandboxMiddleware = require('./sandbox/middleware');
const sandboxSessionPreflight = require('./sandbox/session/preflight');
const sandboxOtpSend = require('./sandbox/otp/send');
const sandboxOtpVerify = require('./sandbox/otp/verify');
const sandboxChatSend = require('./sandbox/chat/send');
const sandboxTemplateSend = require('./sandbox/templates/send');

const app = express();

// Middlewares
app.use(cors({
    origin: '*', // Permite o front-end acessar de qualquer URL/localhost
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-sandbox-key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.post('/api/v2/otp/webhook', messagesGet);
app.post('/api/v2/otp/send', messagesSendOtp);
app.post('/api/v2/otp/verify', messagesVerifyOtp);

app.get('/api/v2/chat/:leadId/messages', chatMessages);
app.post('/api/v2/chat/:leadId/read', chatRead);
app.post('/api/v2/chat/send', chatSendText);
app.post('/api/v2/chat/send-template', chatSendTemplate);
app.post('/api/v2/chat/status-webhook', chatStatusWebhook);
app.post('/api/v2/chat/webhook', messagesGet);

app.post('/api/v2/templates', templatesCreate);
app.get('/api/v2/templates', templatesGet);
app.post('/api/v2/templates/send', templatesSend);

app.get('/api/v2/leads', leadsGet);
app.post('/api/v2/leads', leadsCreate);

app.use('/api/sandbox', sandboxMiddleware);
app.post('/api/sandbox/session/preflight', sandboxSessionPreflight);
app.post('/api/sandbox/otp/send', sandboxOtpSend);
app.post('/api/sandbox/otp/verify', sandboxOtpVerify);
app.post('/api/sandbox/chat/send', sandboxChatSend);
app.post('/api/sandbox/templates/send', sandboxTemplateSend);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
