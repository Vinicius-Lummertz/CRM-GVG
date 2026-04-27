require('dotenv').config();
const express = require('express');
const cors = require('cors');

const messagesGet = require('./messages/get');
const messagesSendOtp = require('./messages/send/otp');
const messagesVerifyOtp = require('./messages/verify/otp');
const chatMessages = require('./chat/messages');
const chatRead = require('./chat/read');
const chatSendText = require('./chat/sendText');
const chatSendTemplate = require('./chat/sendTemplate');
const chatStatusWebhook = require('./chat/statusWebhook');
const templatesCreate = require('./templates/create');
const templatesGet = require('./templates/get');
const leadsGet = require('./leads/get');
const leadsCreate = require('./leads/create');
const eventsGet = require('./events/get');
const eventsGetById = require('./events/getById');
const eventsCreate = require('./events/create');
const eventsUpdate = require('./events/update');
const eventsDelete = require('./events/delete');
const profilesUpsert = require('./profiles/upsert');
const profilesGetByPhone = require('./profiles/getByPhone');
const companiesGet = require('./companies/get');
const companiesGetById = require('./companies/getById');
const companiesCreate = require('./companies/create');
const companyWhatsappGet = require('./companies/whatsapp/get');
const companyWhatsappCreate = require('./companies/whatsapp/create');
const companyWhatsappUpdate = require('./companies/whatsapp/update');
const companyWhatsappDelete = require('./companies/whatsapp/delete');
const companyMembersGet = require('./companies/members/get');
const companyMembersUpdate = require('./companies/members/update');
const companyInvitesGet = require('./companies/invites/get');
const companyInvitesCreate = require('./companies/invites/create');
const companyInvitesAccept = require('./companies/invites/accept');
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
    allowedHeaders: ['Content-Type', 'Authorization']
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

app.get('/api/v2/leads', leadsGet);
app.post('/api/v2/leads', leadsCreate);

app.get('/api/v2/events', eventsGet);
app.get('/api/v2/events/:eventId', eventsGetById);
app.post('/api/v2/events', eventsCreate);
app.put('/api/v2/events/:eventId', eventsUpdate);
app.delete('/api/v2/events/:eventId', eventsDelete);

app.post('/api/v2/profiles', profilesUpsert);
app.get('/api/v2/profiles/by-phone', profilesGetByPhone);

app.get('/api/v2/companies', companiesGet);
app.get('/api/v2/companies/:companyId', companiesGetById);
app.post('/api/v2/companies', companiesCreate);
app.get('/api/v2/companies/:companyId/whatsapp-numbers', companyWhatsappGet);
app.post('/api/v2/companies/:companyId/whatsapp-numbers', companyWhatsappCreate);
app.put('/api/v2/companies/:companyId/whatsapp-numbers/:numberId', companyWhatsappUpdate);
app.delete('/api/v2/companies/:companyId/whatsapp-numbers/:numberId', companyWhatsappDelete);
app.get('/api/v2/companies/:companyId/members', companyMembersGet);
app.put('/api/v2/companies/:companyId/members/:memberId', companyMembersUpdate);
app.get('/api/v2/companies/:companyId/invites', companyInvitesGet);
app.post('/api/v2/companies/:companyId/invites', companyInvitesCreate);
app.post('/api/v2/invites/:inviteId/accept', companyInvitesAccept);

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
