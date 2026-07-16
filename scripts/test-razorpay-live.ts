import { createRazorpayOrder, verifyRazorpayOrderSignature, PLAN_PRICES } from '../src/lib/razorpay';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('==================================================');
  console.log('         RAZORPAY LIVE CREDENTIALS TEST           ');
  console.log('==================================================');

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  console.log('Loaded credentials:');
  console.log(`  RAZORPAY_KEY_ID: ${keyId ? `${keyId.slice(0, 8)}...${keyId.slice(-4)}` : 'MISSING'}`);
  console.log(`  RAZORPAY_KEY_SECRET: ${keySecret ? 'PRESENT' : 'MISSING'}`);

  if (!keyId || !keyId.startsWith('rzp_live')) {
    throw new Error('FAILED: RAZORPAY_KEY_ID is missing or not a live key (does not start with rzp_live)');
  }
  if (!keySecret) {
    throw new Error('FAILED: RAZORPAY_KEY_SECRET is missing');
  }

  // Find a test user or the admin user in the database to run order creation test
  const user = await prisma.user.findFirst({
    where: { email: 'admin@pdfaihub.com' }
  }) || await prisma.user.findFirst();

  if (!user) {
    throw new Error('FAILED: No user found in database to run order creation test.');
  }

  console.log(`Testing Order Creation for user: ${user.name} (${user.email})...`);
  try {
    const orderResult = await createRazorpayOrder(user.id, 'monthly');
    console.log('SUCCESS: Order created successfully on Razorpay live servers!');
    console.log('Order Details:', orderResult);

    // Verify signature logic
    console.log('\nTesting signature verification helper...');
    const fakePaymentId = 'pay_fake1234567890';
    const fakeSignature = 'fake_signature_hash';
    const verified = verifyRazorpayOrderSignature(orderResult.orderId, fakePaymentId, fakeSignature);
    console.log(`Signature verification helper called (verified status: ${verified})`);
    
    console.log('==================================================');
    console.log('         LIVE CREDENTIALS WORK PERFECTLY!         ');
    console.log('==================================================');
  } catch (err: any) {
    console.error('\n❌ TEST FAILED:', err.message || err);
    if (err.description) {
      console.error('Razorpay Error Description:', err.description);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
