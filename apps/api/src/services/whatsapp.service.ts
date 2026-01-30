import axios from 'axios';
import { prisma } from '../utils/prisma';
import { format } from 'date-fns';

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export class WhatsAppService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}`;
  }

  async sendMessage(
    phone: string,
    message: string,
    type: string = 'manual'
  ): Promise<{ messageId: string }> {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp credentials not configured');
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const messageId = response.data.messages?.[0]?.id;

      // Log the message
      await prisma.whatsapp_logs.create({
        data: {
          phone,
          message_type: type,
          direction: 'outgoing',
          content: message,
          status: 'sent',
          external_message_id: messageId,
          sent_at: new Date(),
        },
      });

      return { messageId };
    } catch (error: any) {
      // Log failed message
      await prisma.whatsapp_logs.create({
        data: {
          phone,
          message_type: type,
          direction: 'outgoing',
          content: message,
          status: 'failed',
          error_message: error.message,
        },
      });

      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  async sendBookingConfirmation(
    phone: string,
    name: string,
    appointment: {
      appointment_date: Date;
      start_time: Date;
      services: { name_ar: string };
      users: { full_name_ar: string };
    }
  ): Promise<void> {
    const message = `
أهلاً ${name}! 👋

تم تأكيد حجزك:
📅 التاريخ: ${format(appointment.appointment_date, 'yyyy-MM-dd')}
⏰ الوقت: ${format(appointment.start_time, 'HH:mm')}
💆 الخدمة: ${appointment.services.name_ar}
👨‍⚕️ المختص: ${appointment.users.full_name_ar}

للإلغاء، رد بـ "إلغاء"
`.trim();

    await this.sendMessage(phone, message, 'booking_confirmation');
  }

  async sendReminder24h(
    phone: string,
    appointment: {
      appointment_date: Date;
      start_time: Date;
      services: { name_ar: string };
    }
  ): Promise<void> {
    const message = `
⏰ تذكير: موعدك غداً!

📅 ${format(appointment.appointment_date, 'yyyy-MM-dd')}
⏰ ${format(appointment.start_time, 'HH:mm')}
💆 ${appointment.services.name_ar}

نراكم غداً! 😊

للإلغاء، رد بـ "إلغاء"
`.trim();

    await this.sendMessage(phone, message, 'reminder_24h');
  }

  async sendReminder1h(
    phone: string,
    appointment: {
      appointment_date: Date;
      start_time: Date;
      services: { name_ar: string };
    }
  ): Promise<void> {
    const message = `
⏰⏰ موعدك بعد ساعة!

💆 ${appointment.services.name_ar}
⏰ ${format(appointment.start_time, 'HH:mm')}

نراكم قريباً! 🌟
`.trim();

    await this.sendMessage(phone, message, 'reminder_1h');
  }

  async sendWaitlistOffer(
    phone: string,
    name: string,
    slot: {
      date: Date;
      startTime: string;
      serviceName: string;
    },
    waitlistId: string
  ): Promise<void> {
    const message = `
أهلاً ${name}! 👋

موعد متاح أسرع:
📅 ${format(slot.date, 'yyyy-MM-dd')}
⏰ ${slot.startTime}
💆 ${slot.serviceName}

تبيه؟ رد بـ "نعم" خلال 10 دقائق
رقم الطلب: ${waitlistId}
`.trim();

    await this.sendMessage(phone, message, 'waitlist_offer');
  }

  async processIncomingMessage(payload: {
    from: string;
    body: string;
    messageId: string;
    context?: { id: string };
  }): Promise<{ type: string; response: string }> {
    const { from, body, context } = payload;
    const normalizedBody = body.trim().toLowerCase();

    // Log incoming message
    await prisma.whatsapp_logs.create({
      data: {
        phone: from,
        message_type: 'incoming',
        direction: 'incoming',
        content: body,
        status: 'delivered',
      },
    });

    // Handle booking intent
    if (
      normalizedBody.includes('حجز') ||
      normalizedBody.includes('موعد') ||
      normalizedBody.includes('بدي')
    ) {
      return {
        type: 'booking_intent',
        response: `
أهلاً! 👋

للحجز، اختار الخدمة:
1️⃣ ليزر إزالة شعر
2️⃣ تنظيف بشرة
3️⃣ استشارة دكتور
4️⃣ عناية بالبشرة

أرسل رقم الخدمة
        `.trim(),
      };
    }

    // Handle confirmation
    if (normalizedBody === 'نعم' || normalizedBody === 'أكيد') {
      // Check if replying to a confirmation message
      if (context?.id) {
        return {
          type: 'confirmation',
          response: 'تم تأكيد موعدك! 🎉\n\nنشوفك بالموعد.',
        };
      }
    }

    // Handle cancellation
    if (normalizedBody === 'إلغاء' || normalizedBody === 'الغاء') {
      return {
        type: 'cancellation',
        response:
          'تم استلام طلب الإلغاء. سنتواصل معك لتأكيد الإلغاء.',
      };
    }

    // Handle waitlist acceptance
    if (normalizedBody === 'نعم' && context?.id) {
      // Check if replying to waitlist offer
      return {
        type: 'waitlist_accept',
        response: 'تم تأكيد الحجز من قائمة الانتظار! ✅',
      };
    }

    // Default response
    return {
      type: 'unknown',
      response: `
أهلاً! 👋

كيف أقدر أساعدك؟
- للحجز: أرسل "حجز"
- للاستفسار: اتصل على العيادة

شكراً لتواصلك معنا! 🌟
      `.trim(),
    };
  }

  async getMessageStatus(messageId: string): Promise<string> {
    // This would check the database for the message status
    const log = await prisma.whatsapp_logs.findFirst({
      where: { external_message_id: messageId },
    });

    return log?.status || 'unknown';
  }
}

export const whatsappService = new WhatsAppService();
