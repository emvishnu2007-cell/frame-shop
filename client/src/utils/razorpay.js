import { api } from '../services/api';

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
    document.body.appendChild(s);
    return undefined;
  });
}

/**
 * Opens Razorpay Checkout for an existing booking. The amount is created on the server
 * from the saved order, and the payment signature is verified on the server too.
 * Resolves with { paid: true } or { paid: false } if the customer closes the window.
 */
export async function payOnline(order, shopName) {
  const created = await api.createRazorpayOrder(order.orderId, order.phone);
  await loadScript();
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: created.keyId,
      amount: created.amount,
      currency: created.currency,
      name: shopName,
      description: `Booking ${order.orderId}`,
      order_id: created.razorpayOrderId,
      prefill: { name: order.customerName, email: order.email, contact: order.phone },
      theme: { color: '#A8803F' },
      handler: async (resp) => {
        try {
          await api.verifyRazorpay(order.orderId, {
            phone: order.phone,
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          });
          resolve({ paid: true });
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => resolve({ paid: false }) },
    });
    rz.on('payment.failed', () => resolve({ paid: false }));
    rz.open();
  });
}
