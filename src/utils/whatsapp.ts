import { Order } from '../types/ecommerce';

export function sanitizeWhatsAppNumber(raw = ''): string {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }
  return digits || '2348091234567';
}

export function buildOrderWhatsAppMessage(order: Order): string {
  const itemsBlock = order.items
    .map((item) => {
      const variantPart = [item.selectedVariant, item.selectedColor].filter(Boolean).join(', ');
      const label = variantPart ? `${item.productName} (${variantPart})` : item.productName;
      return `${label} × ${item.quantity}`;
    })
    .join('\n');

  const formattedTotal = Math.round(order.totalNgn).toLocaleString('en-NG');

  return [
    'Hello, I have made my payment for my gadgets, kindly confirm and get back to me.',
    '',
    `Customer Name: ${order.customerName}`,
    '',
    `Order Number: ${order.orderNumber}`,
    '',
    'Products Purchased:',
    itemsBlock,
    '',
    `Total Amount Paid: ₦${formattedTotal}`,
    '',
    `Payment Reference: ${order.paystackReference || 'N/A'}`,
    '',
    'Please confirm my order and provide the delivery details.',
  ].join('\n');
}

export function buildOrderWhatsAppUrl(whatsappNumber: string, order: Order): string {
  const phone = sanitizeWhatsAppNumber(whatsappNumber);
  const message = buildOrderWhatsAppMessage(order);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildGeneralWhatsAppUrl(whatsappNumber: string, promptText: string): string {
  const phone = sanitizeWhatsAppNumber(whatsappNumber);
  return `https://wa.me/${phone}?text=${encodeURIComponent(promptText)}`;
}
