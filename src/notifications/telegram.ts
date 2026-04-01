import axios from 'axios';

import { logger } from '../logger';

export async function sendTelegramNotification(
  botToken: string,
  chatIds: string[],
  text: string,
): Promise<void> {
  for (const chatId of chatIds) {
    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        },
        {
          timeout: 10000,
        },
      );
    } catch (error) {
      logger.warn('Telegram notification failed', {
        chatId,
        error: String(error),
      });
    }
  }
}
