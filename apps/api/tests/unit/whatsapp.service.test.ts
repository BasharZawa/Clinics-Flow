/**
 * WhatsApp Service Unit Tests
 * 
 * Tests for:
 * - Sending messages
 * - Processing incoming webhooks
 * - Handling confirmations/cancellations via WhatsApp
 * - Message templates
 */

// Set environment variables BEFORE importing the service
process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';

import { WhatsAppService } from '../../src/services/whatsapp.service';
import { prismaMock } from '../mocks/prisma';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  const mockClinicId = 'clinic-123';
  const mockPhone = '+962795716713';

  beforeEach(() => {
    service = new WhatsAppService();
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'msg-123' }] },
      });

      await service.sendMessage(mockPhone, 'Hello test message');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('messages'),
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: mockPhone,
          type: 'text',
          text: { body: 'Hello test message' },
        }),
        expect.any(Object)
      );
    });

    it('should log message to database', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'msg-123' }] },
      });

      prismaMock.whatsappLog.create.mockResolvedValue({
        id: 'log-123',
      } as any);

      await service.sendMessage(mockPhone, 'Test', 'booking_confirmation', mockClinicId);

      expect(prismaMock.whatsappLog.create).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(
        service.sendMessage(mockPhone, 'Test')
      ).rejects.toThrow('Failed to send WhatsApp message');
    });
  });

  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation with appointment details', async () => {
      const appointment = {
        appointment_date: new Date('2026-02-15'),
        start_time: new Date('2026-02-15T10:00:00'),
        service: { name_ar: 'ليزر إزالة شعر' },
        staff: { full_name_ar: 'د. أحمد' },
      };

      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'msg-123' }] },
      });

      await service.sendBookingConfirmation(
        mockPhone,
        'محمد',
        appointment
      );

      const callArgs = mockedAxios.post.mock.calls[0];
      const messageBody = (callArgs[1] as any).text.body;
      
      expect(messageBody).toContain('محمد');
      expect(messageBody).toContain('ليزر إزالة شعر');
      expect(messageBody).toContain('د. أحمد');
      expect(messageBody).toContain('2026-02-15');
    });
  });

  describe('sendReminder24h', () => {
    it('should send 24-hour reminder', async () => {
      const appointment = {
        appointment_date: new Date('2026-02-15'),
        start_time: new Date('2026-02-15T10:00:00'),
        service: { name_ar: 'تنظيف بشرة' },
      };

      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'msg-123' }] },
      });

      await service.sendReminder24h(mockPhone, appointment);

      const callArgs = mockedAxios.post.mock.calls[0];
      expect((callArgs[1] as any).text.body).toContain('تذكير');
      expect((callArgs[1] as any).text.body).toContain('غداً');
    });
  });

  describe('sendWaitlistOffer', () => {
    it('should send waitlist slot offer with expiry', async () => {
      const slot = {
        date: new Date('2026-02-15'),
        startTime: '10:00',
        serviceName: 'ليزر',
      };

      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'msg-123' }] },
      });

      await service.sendWaitlistOffer(mockPhone, 'محمد', slot, 'waitlist-123');

      const callArgs = mockedAxios.post.mock.calls[0];
      const body = (callArgs[1] as any).text.body;
      
      expect(body).toContain('موعد متاح');
      expect(body).toContain('ليزر');
      expect(body).toContain('نعم');
    });
  });

  describe('processIncomingMessage', () => {
    it('should handle booking request', async () => {
      const result = await service.processIncomingMessage({
        from: mockPhone,
        body: 'بدي حجز',
        messageId: 'incoming-123',
      }, mockClinicId);

      expect(result.type).toBe('booking_intent');
      expect(result.response).toContain('أهلاً');
    });

    it('should handle confirmation reply', async () => {
      const result = await service.processIncomingMessage({
        from: mockPhone,
        body: 'نعم',
        messageId: 'msg-456',
        context: { id: 'msg-123' },
      }, mockClinicId);

      expect(result.type).toBe('confirmation');
    });

    it('should handle cancellation reply', async () => {
      const result = await service.processIncomingMessage({
        from: mockPhone,
        body: 'إلغاء',
        messageId: 'msg-789',
      }, mockClinicId);

      expect(result.type).toBe('cancellation');
    });

    it('should handle waitlist acceptance', async () => {
      // When replying "نعم" to a message with context, it's treated as confirmation
      // The actual waitlist logic would be handled by the caller
      const result = await service.processIncomingMessage({
        from: mockPhone,
        body: 'نعم',
        messageId: 'msg-wl',
        context: { id: 'waitlist-offer-msg' },
      }, mockClinicId);

      expect(result.type).toBe('confirmation');
    });

    it('should handle unknown messages', async () => {
      const result = await service.processIncomingMessage({
        from: mockPhone,
        body: 'شو الأخبار',
        messageId: 'msg-unknown',
      }, mockClinicId);

      expect(result.type).toBe('unknown');
    });
  });

  describe('getMessageStatus', () => {
    it('should return status of sent message', async () => {
      prismaMock.whatsappLog.findFirst.mockResolvedValue({
        id: 'log-123',
        status: 'delivered',
        delivered_at: new Date(),
      } as any);

      const status = await service.getMessageStatus('msg-123');

      expect(status).toBe('delivered');
    });
  });
});
