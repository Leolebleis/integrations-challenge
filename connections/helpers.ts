import { URLSearchParams } from 'url';

const helpers = {
  cardNumber: {
    valid: '4111111111111111',

    // This card number will make payment confirmation fail if a cvc number is provided.
    invalid: '4000000000000101',
  },

  encodeObjectToFormUrlEncodedBody(
    parameters: NodeJS.Dict<string | ReadonlyArray<string>>,
  ): string {
    return new URLSearchParams(parameters).toString();
  },
};

export default helpers;
