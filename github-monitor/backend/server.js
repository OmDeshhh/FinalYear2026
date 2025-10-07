require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const ngrok = require('@ngrok/ngrok');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const webhooks = new Map();
let publicUrl = null;

function generateWebhookId() {
  return crypto.randomBytes(16).toString('hex');
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/slack-services')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Schemas
const WebhookLogSchema = new mongoose.Schema({
  webhookId: String,
  method: String,
  status: { type: String, enum: ['success', 'failed'] },
  timestamp: { type: Date, default: Date.now },
  error: String,
  slackMessageTs: String
});

const AlertSchema = new mongoose.Schema({
  level: { type: String, enum: ['info', 'warning', 'error'] },
  message: String,
  webhookUrl: String,
  timestamp: { type: Date, default: Date.now },
  slackMessageTs: String
});

const ThreadSchema = new mongoose.Schema({
  threadId: String,
  message: String,
  threadTs: String,
  replies: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

const WebhookLog = mongoose.model('WebhookLog', WebhookLogSchema);
const Alert = mongoose.model('Alert', AlertSchema);
const Thread = mongoose.model('Thread', ThreadSchema);

// Generate webhook on startup
function createStartupWebhook(baseUrl) {
  const webhookId = generateWebhookId();
  const webhookUrl = `${baseUrl}/webhook/${webhookId}`;

  webhooks.set(webhookId, {
    id: webhookId,
    url: webhookUrl,
    createdAt: new Date().toISOString(),
    requests: []
  });

  console.log(`✅ [Startup] Created webhook: ${webhookUrl}`);
  return webhookId;
}

// API route to manually create webhook
app.post('/api/webhooks/create', (req, res) => {
  const webhookId = generateWebhookId();
  
  const baseUrl = publicUrl || `${req.protocol}://${req.get('host')}`;
  const webhookUrl = `${baseUrl}/webhook/${webhookId}`;
  
  webhooks.set(webhookId, {
    id: webhookId,
    url: webhookUrl,
    createdAt: new Date().toISOString(),
    requests: []
  });
  
  console.log(`✅ Created webhook: ${webhookUrl}`);
  
  res.json({
    webhookId,
    webhookUrl,
    createdAt: webhooks.get(webhookId).createdAt
  });
});

// Webhook receiver with logging (NO SLACK BOT TOKEN)
app.all('/webhook/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!webhooks.has(id)) {
    return res.status(404).json({ error: 'Webhook not found' });
  }
  
  const webhookData = webhooks.get(id);
  const requestData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress
  };
  
  webhookData.requests.push(requestData);
  console.log(`📨 Received ${req.method} request to webhook ${id}`);
  
  // Log to MongoDB only (no Slack integration)
  try {
    await WebhookLog.create({
      webhookId: id,
      method: req.method,
      status: 'success'
    });
  } catch (err) {
    console.error('❌ MongoDB logging error:', err.message);
  }
  
  res.status(200).json({ 
    message: 'Webhook received successfully',
    webhookId: id 
  });
});

// Get webhook data
app.get('/api/webhooks/:id', (req, res) => {
  const { id } = req.params;
  
  if (!webhooks.has(id)) {
    return res.status(404).json({ error: 'Webhook not found' });
  }
  
  res.json(webhooks.get(id));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeWebhooks: webhooks.size,
    uptime: process.uptime(),
    publicUrl: publicUrl || 'Not exposed',
    isLive: !!publicUrl
  });
});

// Get public URL endpoint
app.get('/api/public-url', (req, res) => {
  res.json({
    publicUrl: publicUrl,
    isLive: !!publicUrl,
    localUrl: `http://localhost:${PORT}`
  });
});

// ========== SLACK WEBHOOK ENDPOINTS (NO BOT TOKEN) ==========

// Send message via incoming webhook
app.post('/api/slack/send-message', async (req, res) => {
  try {
    const { webhookUrl, text, channel, username, icon_emoji } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Slack webhook URL is required' });
    }

    const payload = {
      text: text || 'Hello from Slack Integration!',
      channel: channel,
      username: username || 'Webhook Bot',
      icon_emoji: icon_emoji || ':robot_face:'
    };

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.text();

    // Log the message
    await WebhookLog.create({
      webhookId: 'slack-outgoing',
      method: 'POST',
      status: response.ok ? 'success' : 'failed',
      error: response.ok ? null : result
    });

    if (response.ok && result === 'ok') {
      res.json({ 
        success: true, 
        message: 'Message sent to Slack via webhook!'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result 
      });
    }
  } catch (err) {
    console.error('Slack webhook error:', err);
    
    await WebhookLog.create({
      webhookId: 'slack-outgoing',
      method: 'POST',
      status: 'failed',
      error: err.message
    });

    res.status(500).json({ error: err.message });
  }
});

// Test webhook connection
app.post('/api/slack/test-webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const payload = {
      text: '🧪 Test message from Slack Integration',
      username: 'Webhook Tester',
      icon_emoji: ':test_tube:'
    };

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.text();

    if (response.ok && result === 'ok') {
      res.json({ 
        success: true, 
        message: 'Webhook test successful! Check your Slack channel.'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Webhook test failed: ' + result 
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== SERVICE STATISTICS ENDPOINTS ==========

// Get service stats
app.get('/api/slack/services/stats', async (req, res) => {
  try {
    const webhookLogs = await WebhookLog.countDocuments();
    const webhookSuccess = await WebhookLog.countDocuments({ status: 'success' });
    const webhookFailed = await WebhookLog.countDocuments({ status: 'failed' });

    const alertsTotal = await Alert.countDocuments();
    const threadsTotal = await Thread.countDocuments();

    res.json({
      webhookLogs: {
        total: webhookLogs,
        success: webhookSuccess,
        failed: webhookFailed,
        active: true
      },
      alertSystem: {
        total: alertsTotal,
        success: alertsTotal,
        failed: 0,
        active: true
      },
      messageThreading: {
        total: threadsTotal,
        success: threadsTotal,
        failed: 0,
        active: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get webhook logs
app.get('/api/slack/webhook-logs', async (req, res) => {
  try {
    const logs = await WebhookLog.find().sort({ timestamp: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get alerts
app.get('/api/slack/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get threads
app.get('/api/slack/threads', async (req, res) => {
  try {
    const threads = await Thread.find().sort({ timestamp: -1 }).limit(50);
    res.json(threads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create alert manually
app.post('/api/slack/alerts/create', async (req, res) => {
  try {
    const { level, message, webhookUrl } = req.body;
    
    const alert = await Alert.create({
      level: level || 'info',
      message,
      webhookUrl: webhookUrl || ''
    });

    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create thread manually
app.post('/api/slack/threads/create', async (req, res) => {
  try {
    const { threadId, message, replies } = req.body;
    
    const thread = await Thread.create({
      threadId: threadId || generateWebhookId(),
      message,
      replies: replies || 0
    });

    res.json({ success: true, thread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create webhook log manually
app.post('/api/slack/webhook-logs/create', async (req, res) => {
  try {
    const { webhookId, method, status, error } = req.body;
    
    const log = await WebhookLog.create({
      webhookId: webhookId || generateWebhookId(),
      method: method || 'POST',
      status: status || 'success',
      error: error || null
    });

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;

// Start server with automatic tunnel
async function startServer() {
  app.listen(PORT, async () => {
    console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
    console.log(`📡 Ready to receive webhooks`);
    console.log('');
    
    // Try to create ngrok tunnel automatically
    try {
      console.log('🌐 Creating tunnel to expose server to internet...');
      console.log('⏳ Please wait...');
      console.log('');
      
      const listener = await ngrok.forward({
        addr: PORT,
        authtoken: process.env.NGROK_AUTH_TOKEN,
      });

      publicUrl = listener.url();
      
      console.log('═══════════════════════════════════════════════');
      console.log('🎉 SUCCESS! Server is LIVE on the internet! 🎉');
      console.log('═══════════════════════════════════════════════');
      console.log('');
      console.log('📡 Public URL:', publicUrl);
      console.log('🔗 Local URL:  http://localhost:' + PORT);
      console.log('');
      console.log('✅ All webhook URLs will automatically use public URL');
      console.log('');
      
      // Create startup webhook with public URL
      const startupWebhookId = createStartupWebhook(publicUrl);
      console.log('');
      console.log('🔥 Ready to receive webhooks from anywhere!');
      console.log('═══════════════════════════════════════════════');
      
    } catch (error) {
      console.log('⚠️  Could not create automatic tunnel');
      console.log('💡 Reason:', error.message);
      console.log('');
      console.log('🔗 Server running locally on http://localhost:' + PORT);
      
      // Create startup webhook with local URL
      createStartupWebhook(`http://localhost:${PORT}`);
    }
  });
}

// Start the server
startServer();