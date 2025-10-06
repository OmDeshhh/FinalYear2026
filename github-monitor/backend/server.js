require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const ngrok = require('@ngrok/ngrok');

const app = express();
app.use(cors());
app.use(express.json());

const webhooks = new Map();
let publicUrl = null; // Store the public internet URL

function generateWebhookId() {
  return crypto.randomBytes(16).toString('hex');
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
  const webhookId = generateWebhookId();
  
  // Use public URL if available, otherwise use request host
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

app.all('/webhook/:id', (req, res) => {
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
  
  res.status(200).json({ 
    message: 'Webhook received successfully',
    webhookId: id 
  });
});

app.get('/api/webhooks/:id', (req, res) => {
  const { id } = req.params;
  
  if (!webhooks.has(id)) {
    return res.status(404).json({ error: 'Webhook not found' });
  }
  
  res.json(webhooks.get(id));
});

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

// Proxy endpoint for Slack webhooks (fixes CORS)
app.post('/api/slack/send', async (req, res) => {
  const { webhookUrl, payload } = req.body;
  
  if (!webhookUrl || !payload) {
    return res.status(400).json({ error: 'webhookUrl and payload required' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    
    if (response.ok && text === 'ok') {
      console.log('✅ Slack message sent successfully');
      res.json({ success: true, message: 'Message sent to Slack!' });
    } else {
      console.log('❌ Slack error:', text);
      res.status(response.status).json({ success: false, message: text });
    }
  } catch (error) {
    console.error('❌ Slack proxy error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3001;

// Start server with automatic tunnel
async function startServer() {
  // Start Express server
  app.listen(PORT, async () => {
    console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
    console.log(`📡 Ready to receive webhooks`);
    console.log('');
    
    // Try to create ngrok tunnel automatically
    try {
      console.log('🌐 Creating tunnel to expose server to internet...');
      console.log('⏳ Please wait...');
      console.log('');
      
      // Start ngrok tunnel with authtoken from .env
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
      console.log('📝 To enable automatic tunneling:');
      console.log('   1. Make sure .env file exists in backend folder');
      console.log('   2. Add: NGROK_AUTH_TOKEN=your_token_here');
      console.log('   3. Get token from: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('');
      console.log('🔗 Server running locally on http://localhost:' + PORT);
      
      // Create startup webhook with local URL
      createStartupWebhook(`http://localhost:${PORT}`);
    }
  });
}

// Start the server
startServer();