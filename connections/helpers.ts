import { URLSearchParams } from 'url';

const helpers = {
  cardNumber: {
    valid: '4111111111111111',

    invalid: {
      // This card number will make payment confirmation fail if a cvc number is provided.
      incorrectCvc: '4000000000000101',

      // This will return a card_declined code with insufficient_funds as a decline_code
      insufficientFunds: '4000000000009995',
    },
  },

  /**
   * Stripe API constants, containing the version used of the Stripe API,
   * the base URL, and the content-type used by its endpoints.
   */
  stripeApi: {
    version: 'v1',
    baseUrl: 'https://api.stripe.com',
    contentType: 'application/x-www-form-urlencoded',
  },

  encodeObjectToFormUrlEncodedBody(parameters: NodeJS.Dict<string>): string {
    return new URLSearchParams(parameters).toString();
  },
};

export default helpers;
