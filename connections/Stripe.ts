import {
  APIKeyCredentials,
  CardDetails,
  DeclineReason,
  ParsedAuthorizationResponse,
  ParsedCancelResponse,
  ParsedCaptureResponse,
  ProcessorConnection,
  RawAuthorizationRequest,
  RawCancelRequest,
  RawCaptureRequest,
} from '@primer-io/app-framework';

import helpers from './helpers';

import HttpClient from '../common/HTTPClient';

const StripeConnection: ProcessorConnection<APIKeyCredentials, CardDetails> = {
  name: 'STRIPE',

  website: 'stripe.com',

  configuration: {
    accountId: 'acct_1J0kXcIXQ3bUyuVl',
    apiKey:
      'rk_test_51J0kXcIXQ3bUyuVlj0cEnoBsiqgHRNeFtQEElxZvtTa0jPRswp4pkOpQ3BeOTp5372ri5K7L8bdXTOCLAKiUxn6C00mfoYBUFA',
  },

  /**
   * Method to capture authorise a payment intent.
   * This method should authorise a card transaction.
   * NOTE: It will not capture the transaction.
   *
   * @param {RawAuthorizationRequest<APIKeyCredentials, CardDetails>} request - The request to Stripe for authorizing a transaction.
   * @returns {Promise<ParsedAuthorizationResponse>} Returns the response with the appropriate transactionStatus.
   */
  async authorize(
    request: RawAuthorizationRequest<APIKeyCredentials, CardDetails>,
  ): Promise<ParsedAuthorizationResponse> {
    const url = `${helpers.stripeApi.baseUrl}/${helpers.stripeApi.version}/payment_intents`;

    // URLSearchParams will format the object like required for a request of type application/x-www-form-urlencoded.
    const formData: string = helpers.encodeObjectToFormUrlEncodedBody({
      'amount': `${request.amount}`,
      'currency': `${request.currencyCode}`,
      'payment_method_types[]': 'card',
      'payment_method_data[type]': 'card',
      'payment_method_data[card][exp_year]': `${request.paymentMethod.expiryYear}`,
      'payment_method_data[card][exp_month]': `${request.paymentMethod.expiryMonth}`,
      'payment_method_data[card][number]': `${request.paymentMethod.cardNumber}`,
      'payment_method_data[card][cvc]': `${request.paymentMethod.cvv}`,
      'payment_method_data[billing_details][name]': `${request.paymentMethod.cardholderName}`,
      /* We have to set this to true in order to confirm the payment immediately.
       * This will run checks against the card values provided to Stripe.
       * Read more here: https://stripe.com/docs/api/payment_intents/confirm
       */
      'confirm': 'true',
      /* We have to set capture_method to manual, otherwise the capture call will be done
       * automatically when we authorise the payment.
       * Read more here: https://stripe.com/docs/payments/capture-later
       */
      'capture_method': 'manual',
    });

    return HttpClient.request(url, {
      method: 'post',
      body: formData,
      headers: {
        'Authorization': `Bearer ${request.processorConfig.apiKey}`,
        'Content-Type': helpers.stripeApi.contentType,
      },
    })
      .then((response) => {
        const parsedResponse = JSON.parse(response.responseText);
        // console.debug('stripeAuthoriseResponse', parsedResponse);

        let parsedAuthorizationResponse: ParsedAuthorizationResponse;

        if (response.statusCode === 200) {
          parsedAuthorizationResponse = {
            transactionStatus: 'AUTHORIZED',
            processorTransactionId: parsedResponse.id,
          };
        } else if (response.statusCode === 402) {
          const declineCode = parsedResponse.error.decline_code;
          let reason: DeclineReason;

          if (declineCode === 'insufficient_funds') {
            reason = 'INSUFFICIENT_FUNDS';
          } else if (declineCode === 'do_not_honor') {
            reason = 'DO_NOT_HONOR';
          } else {
            reason = 'UNKNOWN';
          }

          parsedAuthorizationResponse = {
            transactionStatus: 'DECLINED',
            declineReason: reason,
          };
        } else {
          parsedAuthorizationResponse = {
            transactionStatus: 'FAILED',
            errorMessage: parsedResponse.error.message,
          };
        }

        return parsedAuthorizationResponse;
      })
      .catch(() => {
        return {
          transactionStatus: 'FAILED',
          errorMessage: 'Could not connect to Stripe API',
        };
      });
  },

  /**
   * Method to capture a payment intent.
   * This method should capture the funds on an authorized transaction.
   *
   * @param {RawCaptureRequest<APIKeyCredentials>} request - the request to Stripe to capture a transaction.
   * @returns {Promise<ParsedCaptureResponse>} Returns the response with the appropriate transactionStatus.
   */
  async capture(
    request: RawCaptureRequest<APIKeyCredentials>,
  ): Promise<ParsedCaptureResponse> {
    const url = `${helpers.stripeApi.baseUrl}/${helpers.stripeApi.version}/payment_intents/${request.processorTransactionId}/capture`;

    return HttpClient.request(url, {
      method: 'post',
      body: '',
      headers: {
        'Authorization': `Bearer ${request.processorConfig.apiKey}`,
        'Content-Type': helpers.stripeApi.contentType,
      },
    })
      .then((response) => {
        const parsedResponse = JSON.parse(response.responseText);
        // console.debug('stripeCaptureResponse', parsedResponse);

        let parsedCaptureResponse: ParsedCaptureResponse;

        if (response.statusCode === 200) {
          parsedCaptureResponse = {
            transactionStatus: 'SETTLED',
          };
        } else {
          parsedCaptureResponse = {
            transactionStatus: 'FAILED',
            errorMessage: parsedResponse.error.message,
          };
        }

        return parsedCaptureResponse;
      })
      .catch(() => {
        return {
          transactionStatus: 'FAILED',
          errorMessage: 'Could not connect to Stripe API',
        };
      });
  },

  /**
   * Method to cancel a payment intent.
   * This method should cancel an authorized transaction.
   *
   * @param {RawCancelRequest<APIKeyCredentials>} request - the request to Stripe to cancel a transaction.
   * @returns {Promise<ParsedCancelResponse>} Returns the response with the appropriate transactionStatus.
   */
  async cancel(
    request: RawCancelRequest<APIKeyCredentials>,
  ): Promise<ParsedCancelResponse> {
    const url = `${helpers.stripeApi.baseUrl}/${helpers.stripeApi.version}/payment_intents/${request.processorTransactionId}/cancel`;

    return HttpClient.request(url, {
      method: 'post',
      body: '',
      headers: {
        'Authorization': `Bearer ${request.processorConfig.apiKey}`,
        'Content-Type': helpers.stripeApi.contentType,
      },
    })
      .then((response) => {
        const parsedResponse = JSON.parse(response.responseText);
        // console.debug('stripeCancellationResponse', parsedResponse);

        let parsedCancelResponse: ParsedCancelResponse;
        if (response.statusCode === 200) {
          parsedCancelResponse = {
            transactionStatus: 'CANCELLED',
          };
        } else {
          parsedCancelResponse = {
            transactionStatus: 'FAILED',
            errorMessage: parsedResponse.error.message,
          };
        }

        return parsedCancelResponse;
      })
      .catch(() => {
        return {
          transactionStatus: 'FAILED',
          errorMessage: 'Could not connect to Stripe API',
        };
      });
  },
};

export default StripeConnection;
