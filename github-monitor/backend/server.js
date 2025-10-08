require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const ngrok = require('@ngrok/ngrok');
const mongoose = require('mongoose');

const app = express();

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

const webhooks = new Map();
let publicUrl = null;

function generateWebhookId() {
  return crypto.randomBytes(16).toString('hex');
}

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/slack-services', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️  Server will continue but database features will not work');
  });

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
  channel: String,
  events: [{
    eventType: { type: String, enum: ['webhook_init', 'update', 'success', 'error', 'retry'] },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

// NEW: Slack Configuration Schema
const SlackConfigSchema = new mongoose.Schema({
  webhookUrl: { type: String, required: true },
  channel: String,
  username: { type: String, default: 'Webhook Bot' },
  iconEmoji: { type: String, default: ':robot_face:' },
  updatedAt: { type: Date, default: Date.now }
});

const WebhookLog = mongoose.model('WebhookLog', WebhookLogSchema);
const Alert = mongoose.model('Alert', AlertSchema);
const Thread = mongoose.model('Thread', ThreadSchema);
const SlackConfig = mongoose.model('SlackConfig', SlackConfigSchema);

// Validation helper
function isValidSlackWebhookUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('https://hooks.slack.com/services/')) return false;
  const pathParts = url.replace('https://hooks.slack.com/services/', '').split('/');
  return pathParts.length >= 3 && pathParts.every(part => part.length > 0);
}

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
  try {
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
  } catch (err) {
    console.error('Error creating webhook:', err);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

app.all('/webhook/:id', async (req, res) => {
  const { id } = req.params;

  if (!webhooks.has(id)) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  // Handle Slack URL verification
  if (req.body && req.body.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
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

  // Log to MongoDB
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
  try {
    const { id } = req.params;
    
    if (!webhooks.has(id)) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json(webhooks.get(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeWebhooks: webhooks.size,
    uptime: process.uptime(),
    publicUrl: publicUrl || 'Not exposed',
    isLive: !!publicUrl,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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

// ========== SLACK CONFIGURATION ENDPOINTS ==========

// Save Slack configuration
app.post('/api/slack/config', async (req, res) => {
  try {
    const { webhookUrl, channel, username, iconEmoji } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    if (!isValidSlackWebhookUrl(webhookUrl)) {
      return res.status(400).json({ error: 'Invalid Slack webhook URL format' });
    }

    // Delete existing config and create new one (singleton pattern)
    await SlackConfig.deleteMany({});
    
    const config = await SlackConfig.create({
      webhookUrl,
      channel: channel || '',
      username: username || 'Webhook Bot',
      iconEmoji: iconEmoji || ':robot_face:',
      updatedAt: new Date()
    });

    console.log('✅ Slack configuration saved');

    res.json({ 
      success: true,
      message: 'Configuration saved successfully',
      config: {
        webhookUrl: config.webhookUrl,
        channel: config.channel,
        username: config.username,
        iconEmoji: config.iconEmoji
      }
    });
  } catch (err) {
    console.error('Error saving Slack config:', err);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Get Slack configuration
app.get('/api/slack/config', async (req, res) => {
  try {
    const config = await SlackConfig.findOne().sort({ updatedAt: -1 });
    
    if (!config) {
      return res.json({ 
        config: null,
        message: 'No configuration found'
      });
    }

    res.json({ 
      config: {
        webhookUrl: config.webhookUrl,
        channel: config.channel,
        username: config.username,
        iconEmoji: config.iconEmoji
      }
    });
  } catch (err) {
    console.error('Error loading Slack config:', err);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// ========== SLACK WEBHOOK ENDPOINTS ==========

// Send message via incoming webhook
app.post('/api/slack/send-message', async (req, res) => {
  try {
    const { webhookUrl, text, channel, username, icon_emoji } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Slack webhook URL is required' });
    }

    if (!isValidSlackWebhookUrl(webhookUrl)) {
      return res.status(400).json({ error: 'Invalid Slack webhook URL' });
    }

    const payload = {
      text: text || 'Hello from Slack Integration!',
      ...(channel && { channel }),
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
        error: result || 'Unknown error'
      });
    }
  } catch (err) {
    console.error('Slack webhook error:', err);
    
    await WebhookLog.create({
      webhookId: 'slack-outgoing',
      method: 'POST',
      status: 'failed',
      error: err.message
    }).catch(e => console.error('Failed to log error:', e));

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

    if (!isValidSlackWebhookUrl(webhookUrl)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Slack webhook URL format' 
      });
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
    console.error('Test webhook error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ========== MESSAGE THREADING ENDPOINTS ==========

// Create a new thread
app.post('/api/slack/create-thread', async (req, res) => {
  try {
    const { channel, initialMessage, eventType } = req.body;
    
    if (!channel || !initialMessage) {
      return res.status(400).json({ error: 'Channel and initial message are required' });
    }

    const thread = await Thread.create({
      channel: channel,
      events: [{
        eventType: eventType || 'webhook_init',
        message: initialMessage,
        timestamp: new Date()
      }],
      createdAt: new Date()
    });

    console.log(`✅ Created thread in ${channel}`);

    res.json({ 
      success: true, 
      thread,
      message: 'Thread created successfully!'
    });
  } catch (err) {
    console.error('Thread creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add message to existing thread - FIXED: Use MongoDB _id instead of threadId
app.post('/api/slack/add-to-thread', async (req, res) => {
  try {
    const { threadId, message, eventType } = req.body;
    
    if (!threadId || !message) {
      return res.status(400).json({ error: 'Thread ID and message are required' });
    }

    // Use MongoDB _id to find the thread
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Add new event to thread
    thread.events.push({
      eventType: eventType || 'update',
      message: message,
      timestamp: new Date()
    });

    await thread.save();

    console.log(`✅ Added message to thread ${threadId}`);

    res.json({ 
      success: true,
      message: 'Message added to thread!',
      thread
    });
  } catch (err) {
    console.error('Add to thread error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all threads
app.get('/api/slack/threads', async (req, res) => {
  try {
    const threads = await Thread.find().sort({ createdAt: -1 });
    res.json({ threads });
  } catch (err) {
    console.error('Get threads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single thread by ID
app.get('/api/slack/threads/:id', async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ thread });
  } catch (err) {
    console.error('Get thread error:', err);
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
        active: webhookLogs > 0
      },
      alertSystem: {
        total: alertsTotal,
        success: alertsTotal,
        failed: 0,
        active: alertsTotal > 0
      },
      messageThreading: {
        total: threadsTotal,
        success: threadsTotal,
        failed: 0,
        active: threadsTotal > 0
      }
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get webhook logs
app.get('/api/slack/webhook-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await WebhookLog.find().sort({ timestamp: -1 }).limit(limit);
    res.json({ logs, total: await WebhookLog.countDocuments() });
  } catch (err) {
    console.error('Get webhook logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get alerts
app.get('/api/slack/alerts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(limit);
    res.json({ alerts, total: await Alert.countDocuments() });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create alert manually
app.post('/api/slack/alerts/create', async (req, res) => {
  try {
    const { level, message, webhookUrl } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const alert = await Alert.create({
      level: level || 'info',
      message,
      webhookUrl: webhookUrl || ''
    });

    console.log(`✅ Created ${level} alert`);

    res.json({ success: true, alert });
  } catch (err) {
    console.error('Create alert error:', err);
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
    console.error('Create webhook log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Slack configuration status
app.get('/api/slack/config-status', async (req, res) => {
  try {
    const config = await SlackConfig.findOne().sort({ updatedAt: -1 });
    
    res.json({
      configured: !!config,
      lastUpdate: config?.updatedAt || null
    });
  } catch (err) {
    console.error('Get config status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
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
      if (process.env.NGROK_AUTH_TOKEN) {
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
        createStartupWebhook(publicUrl);
        console.log('');
        console.log('🔥 Ready to receive webhooks from anywhere!');
        console.log('═══════════════════════════════════════════════');
      } else {
        console.log('ℹ️  NGROK_AUTH_TOKEN not found in environment variables');
        console.log('🔗 Server running locally on http://localhost:' + PORT);
        console.log('');
        createStartupWebhook(`http://localhost:${PORT}`);
      }
      
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

// Start the server
startServer();