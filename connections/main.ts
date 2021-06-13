import {
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse,
} from '@primer-io/app-framework';
import StripeConnection from './Stripe';
import helpers from './helpers';

(async () => {
  console.log('\n=== TEST: authorization ===');
  await testAuthTransaction();
  console.log('\n=== TEST: capture ===');
  await testCaptureTransaction();
  console.log('\n=== TEST: cancel ===');
  await testCancelTransaction();
})();

async function testAuthTransaction(): Promise<ParsedAuthorizationResponse> {
  console.log(`Authorizing payment using "${StripeConnection.name}"`);

  let response: ParsedAuthorizationResponse | null = null;

  try {
    response = await StripeConnection.authorize({
      processorConfig: StripeConnection.configuration,
      amount: 100,
      currencyCode: 'GBP',
      paymentMethod: {
        expiryMonth: 4,
        expiryYear: 2022,
        cardholderName: 'Mr Foo Bar',
        cvv: '020',
        // Use helpers.cardNumbers.invalid to make the authorization call fail.
        cardNumber: helpers.cardNumber.valid,
      },
    });
  } catch (e) {
    console.error('Error while authorizing transaction:');
    console.error(e);
    process.exit(1);
  }

  if (response.transactionStatus === 'FAILED') {
    console.log(`Authorization Request failed: ${response.errorMessage}`);
    process.exit(1);
  }

  if (response.transactionStatus === 'DECLINED') {
    console.log(`Authorization was declined: ${response.declineReason}`);
    process.exit(1);
  }

  console.log(
    `✓ Authorization request complete: "${response.transactionStatus}"`,
  );

  return response;
}

async function testCancelTransaction(): Promise<void> {
  const authResponse = await testAuthTransaction();

  console.log('Cancelling authorized payment...');

  if (authResponse.transactionStatus !== 'AUTHORIZED') {
    console.error('Transaction must be AUTHORIZED in order to cancel it');
    process.exit(1);
  }

  let response: ParsedCancelResponse | null = null;

  try {
    response = await StripeConnection.cancel({
      processorTransactionId: authResponse.processorTransactionId,
      processorConfig: StripeConnection.configuration,
    });
  } catch (e) {
    console.error('Error while cancelling transaction:');
    console.error(e);
    process.exit(1);
  }

  if (response.transactionStatus !== 'CANCELLED') {
    console.error(
      `Expected transaction status to be "CANCELLED" but received "${response.transactionStatus}"`,
    );
  } else {
    console.log(
      `✓ Cancellation request complete: "${response.transactionStatus}"`,
    );
  }
}

async function testCaptureTransaction(): Promise<void> {
  const authResponse = await testAuthTransaction();

  console.log('Capturing authorized payment...');

  if (authResponse.transactionStatus !== 'AUTHORIZED') {
    console.error('Transaction must be AUTHORIZED in order to capture it');
    process.exit(1);
  }

  let response: ParsedCaptureResponse | null = null;

  try {
    response = await StripeConnection.capture({
      processorTransactionId: authResponse.processorTransactionId,
      processorConfig: StripeConnection.configuration,
    });
  } catch (e) {
    console.error('Error while capturing transaction:');
    console.error(e);
    process.exit(1);
  }

  if (response.transactionStatus !== 'SETTLED') {
    console.error(
      `Expected transaction status to be "SETTLED" but received "${response.transactionStatus}"`,
    );
  } else {
    console.log(`✓ Capture request complete: "${response.transactionStatus}"`);
  }
}
