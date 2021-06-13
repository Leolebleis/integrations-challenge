# Processors challenge, Findings

## Objectives

- [x] Add your sandbox credentials to `Stripe.ts`
- [x] Implement the `authorize()` method in `Stripe.ts`
- [x] Implement the `capture()` method in `Stripe.ts`
- [x] Implement the `cancel()` method in `Stripe.ts`

## Stripe API

I created a Stripe Sandbox account to be able to use their API. The credentials to the sandbox are in [Stripe.ts](./Stripe.ts). All the endpoints leverage Stripe's [PaymentIntents API](https://stripe.com/docs/api/payment_intents) directly.

All calls containing a body require the body's content to be `application/x-www-form-urlencoded`, and a similar `Content-Type` header.

Stripe strongly suggests tokenizing card numbers when using its API as a way to limit the server's interactions with sensitive customer data. Given the purpose of this application, we are not tokenizing card numbers. 

This requires an additional setup step in the Stripe dashboard to enable the API to deal with non-tokenized card numbers:
- Enable `Handle card information directly` in [the integration settings of your dashboard](https://dashboard.stripe.com/settings/integration).

### PaymentIntents Lifecycle

Payments processed through Stripe's PaymentIntents API will go through several states. The different statuses are as follows:

1. `requires_payment_method`
2. `requires_confirmation`
3. `requires_capture`
4. `succeeded`

[You can read more on this page](https://stripe.com/docs/payments/intents).

### [PaymentIntents Creation call](https://stripe.com/docs/api/payment_intents/create)

The first call is implemented in the `authorize()` method in [`Stripe.ts`](./Stripe.ts).

We start by performing a `POST` request to [https://api.stripe.com/v1/payment_intents](https://api.stripe.com/v1/payment_intents), which will create a PaymentIntent.

```bash
curl --location --request POST 'https://api.stripe.com/v1/payment_intents' \
--header 'Authorization: Bearer rk_test_51J0kXcIXQ3bUyuVlj0cEnoBsiqgHRNeFtQEElxZvtTa0jPRswp4pkOpQ3BeOTp5372ri5K7L8bdXTOCLAKiUxn6C00mfoYBUFA' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'amount=2000' \
--data-urlencode 'currency=gbp' \
--data-urlencode 'payment_method_types[]=card' \
--data-urlencode 'payment_method_data[type]=card' \
--data-urlencode 'payment_method_data[card][exp_year]=2022' \
--data-urlencode 'payment_method_data[card][number]=4111111111111111' \
--data-urlencode 'payment_method_data[card][exp_month]=8' \
--data-urlencode 'payment_method_data[billing_details][name]=Mr Foo Bar' \
--data-urlencode 'payment_method_data[card][cvc]=020' \
--data-urlencode 'confirm=true' \
--data-urlencode 'capture_method=manual'
```

#### Notes

* The only two required parameters are `amount` and `currency`. However, since we already know the payment method will be a card and we know its details, we add it directly at the this step through the `payment_method_data` field. This will help us skip the `requires_payment_method` status mentioned in the section above.

* `confirm=true` will ensure the confirmation of the payment is performed directly at the PaymentIntent creation step, instead of requiring another, separate confirmation call. This will help us skip the `requires_confirmation` status.

* Without `capture_method=manual` and with the previous parameters, the result of this call would be `succeeded`. Setting `capture_method` to manual ensures that we can capture the funds separately, at a later stage, with a separate call ([you can read more about it here](https://stripe.com/docs/payments/capture-later)). Having this parameter ensures our payment intent has a status of `requires_capture`.

### [PaymentIntents Capture call](https://stripe.com/docs/api/payment_intents/capture)

The second call is implemented in the `capture()` method in [Stripe.ts](./Stripe.ts).

We perform a `POST` request to [https://api.stripe.com/v1/payment_intents/{paymentIntentId}/capture](https://api.stripe.com/v1/payment_intents), which will capture a PaymentIntent with the corresponding id, as long as it has a status of `requires_capture`.

```bash
curl --location --request POST 'https://api.stripe.com/v1/payment_intents/{paymentIntentId}/capture' \
--header 'Authorization: Bearer rk_test_51J0kXcIXQ3bUyuVlj0cEnoBsiqgHRNeFtQEElxZvtTa0jPRswp4pkOpQ3BeOTp5372ri5K7L8bdXTOCLAKiUxn6C00mfoYBUFA' \
--header 'Content-Type: application/x-www-form-urlencoded'
```

If this call is successful, the resulting PaymentIntent status should be `succeeded`.

### [PaymentIntents Cancellation call](https://stripe.com/docs/api/payment_intents/cancel)

The last call is implemented in the `cancel()` method in [Stripe.ts](./Stripe.ts).

We perform a `POST` request to [https://api.stripe.com/v1/payment_intents/{paymentIntentId}/cancel](https://api.stripe.com/v1/payment_intents), which will capture a PaymentIntent with the corresponding id, as long as it has a status that is any of `requires_payment_method`, `requires_capture`, `requires_confirmation`, `requires_action`.

```bash
curl --location --request POST 'https://api.stripe.com/v1/payment_intents/{paymentIntentId}/cancel' \
--header 'Authorization: Bearer rk_test_51J0kXcIXQ3bUyuVlj0cEnoBsiqgHRNeFtQEElxZvtTa0jPRswp4pkOpQ3BeOTp5372ri5K7L8bdXTOCLAKiUxn6C00mfoYBUFA' \
--header 'Content-Type: application/x-www-form-urlencoded'
```
