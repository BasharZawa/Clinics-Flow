import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { whatsappService } from '../services/whatsapp.service';
import { AppError } from '../utils/errors';

const router = Router();

// Send manual message
router.post('/send', authenticate, async (req, res, next) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      throw new AppError('Phone and message are required', 400);
    }

    const result = await whatsappService.sendMessage(phone, message, 'manual');

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// WhatsApp webhook verification (GET)
router.get('/webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp webhook for incoming messages (POST)
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Check if it's a WhatsApp message
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Handle messages
      if (value?.messages) {
        for (const message of value.messages) {
          if (message.type === 'text') {
            await whatsappService.processIncomingMessage({
              from: message.from,
              body: message.text.body,
              messageId: message.id,
              context: message.context,
            });
          }
        }
      }

      // Handle message status updates
      if (value?.statuses) {
        for (const status of value.statuses) {
          console.log(`Message ${status.id} status: ${status.status}`);
          // Update message status in database
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('ERROR');
  }
});

export default router;
