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

// Simplified Thread Schema matching frontend
const ThreadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Slack thread_ts
  text: { type: String, required: true }, // Original message text
  createdAt: { type: String, required: true }, // Formatted date string
  replies: [{
    id: String, // Reply message ts
    text: String, // Reply text
    createdAt: String // Formatted date string
  }]
});

// Slack Configuration Schema
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

// Helper function to post message to Slack using Bot Token
async function postSlackMessage(text, threadTs = null) {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    throw new Error('SLACK_BOT_TOKEN and SLACK_CHANNEL_ID must be set in environment variables');
  }

  const fetch = (await import('node-fetch')).default;
  const payload = {
    channel: SLACK_CHANNEL_ID,
    text: text,
    ...(threadTs && { thread_ts: threadTs })
  };

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || 'Failed to post to Slack');
  }

  return data; // Returns { ok: true, ts: "1234567890.123456", ... }
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
    // WEBHOOK NOT FOUND - Create alert and post to Slack
    try {
      const alert = await Alert.create({
        level: 'error',
        message: `Webhook not found: ${id}`,
        webhookUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        timestamp: new Date()
      });

      // Post to Slack immediately
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        attachments: [{
          color: '#f44336',
          title: '🚨 Webhook Delivery Failed',
          fields: [
            { title: 'Webhook ID', value: id, short: true },
            { title: 'Method', value: req.method, short: true },
            { title: 'Error', value: 'Webhook not found', short: false },
            { title: 'URL', value: req.originalUrl, short: false },
            { title: 'Time', value: new Date().toLocaleString(), short: false }
          ],
          footer: 'Alert System'
        }]
      }).then(response => {
        alert.slackMessageTs = response.data.ts;
        alert.save();
      }).catch(slackErr => {
        console.error('Failed to post to Slack:', slackErr.message);
      });

    } catch (err) {
      console.error('❌ Alert creation error:', err.message);
    }

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
      status: 'success',
      timestamp: new Date()
    });
  } catch (err) {
    console.error('❌ MongoDB logging error:', err.message);
    
    // CREATE ALERT ON MONGODB FAILURE
    try {
      const alert = await Alert.create({
        level: 'error',
        message: `MongoDB logging failed: ${err.message}`,
        webhookUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        timestamp: new Date()
      });

      // Post to Slack immediately
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        attachments: [{
          color: '#ff9800',
          title: '⚠️ Database Error',
          fields: [
            { title: 'Webhook ID', value: id, short: true },
            { title: 'Error', value: err.message, short: false },
            { title: 'Time', value: new Date().toLocaleString(), short: false }
          ],
          footer: 'Alert System'
        }]
      }).then(response => {
        alert.slackMessageTs = response.data.ts;
        alert.save();
      }).catch(slackErr => {
        console.error('Failed to post to Slack:', slackErr.message);
      });

    } catch (alertErr) {
      console.error('❌ Alert creation error:', alertErr.message);
    }
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

// Get alerts endpoint
app.get('/api/slack/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(50);
    res.json({ alerts });
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
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    slackConfigured: !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID)
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

// ========== IMPROVED MESSAGE THREADING ENDPOINTS WITH SLACK INTEGRATION ==========

// Create a new thread (posts to Slack and saves to DB)
app.post('/api/slack/create-thread', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Post message to Slack
    const slackResponse = await postSlackMessage(text);
    const threadTs = slackResponse.ts;

    // Save to database with the actual Slack thread_ts
    const thread = await Thread.create({
      id: threadTs,
      text,
      createdAt: new Date().toLocaleString(undefined, { second: '2-digit', hour12: true }),
      replies: []
    });

    console.log(`✅ Created thread in Slack: ${threadTs}`);

    res.json({ 
      success: true, 
      thread,
      slackTs: threadTs,
      message: 'Thread created and posted to Slack!'
    });
  } catch (err) {
    console.error('Thread creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add reply to existing thread (posts to Slack thread and saves to DB)
app.post('/api/slack/add-to-thread', async (req, res) => {
  try {
    const { threadId, text } = req.body;
    
    if (!threadId || !text) {
      return res.status(400).json({ error: 'Thread ID and text are required' });
    }

    // Find thread in DB
    const thread = await Thread.findOne({ id: threadId });
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Post reply to Slack thread
    const slackResponse = await postSlackMessage(text, threadId);
    const replyTs = slackResponse.ts;

    // Add reply to database
    thread.replies.push({
      id: replyTs,
      text: text,
      createdAt: new Date().toLocaleString(undefined, { second: '2-digit', hour12: true })
    });

    await thread.save();

    console.log(`✅ Added reply to thread ${threadId} in Slack`);

    res.json({ 
      success: true,
      thread,
      slackTs: replyTs,
      message: 'Reply posted to Slack thread!'
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

// Get single thread by Slack thread_ts
app.get('/api/slack/threads/:id', async (req, res) => {
  try {
    const thread = await Thread.findOne({ id: req.params.id });
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ thread });
  } catch (err) {
    console.error('Get thread error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete thread
app.delete('/api/slack/threads/:id', async (req, res) => {
  try {
    const thread = await Thread.findOneAndDelete({ id: req.params.id });
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    console.log(`✅ Deleted thread: ${req.params.id}`);
    res.json({ success: true, message: 'Thread deleted from database (Slack messages remain)' });
  } catch (err) {
    console.error('Delete thread error:', err);
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
      lastUpdate: config?.updatedAt || null,
      botTokenConfigured: !!process.env.SLACK_BOT_TOKEN,
      channelConfigured: !!process.env.SLACK_CHANNEL_ID
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
    
    // Check Slack configuration
    if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
      console.log('✅ Slack Bot Token configured');
      console.log('✅ Slack Channel ID configured');
      console.log('🎯 Threading will post to Slack channel:', process.env.SLACK_CHANNEL_ID);
    } else {
      console.log('⚠️  SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not configured');
      console.log('💡 Threading features will not work without these');
    }
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