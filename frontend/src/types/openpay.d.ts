
// TypeScript type definitions for Openpay.js SDK
// Documentation: https://www.openpay.mx/docs/

interface OpenPayCardData {
  card_number: string;
  holder_name: string;
  expiration_year: string;
  expiration_month: string;
  cvv2: string;
}

interface OpenPayTokenData {
  id: string;
  card: {
    type: string;
    brand: string;
    card_number: string;
    holder_name: string;
    expiration_year: string;
    expiration_month: string;
    allows_charges: boolean;
    allows_payouts: boolean;
    bank_name: string;
    bank_code: string;
  };
}

interface OpenPaySuccessResponse {
  data: OpenPayTokenData;
}

interface OpenPayErrorData {
  status: number;
  description: string;
  request_id: string;
  category: string;
  error_code: number;
  fraud_rules?: string[];
}

interface OpenPayErrorResponse {
  status: number;
  message: string;
  data: OpenPayErrorData;
}

interface OpenPaySDK {
  setId(merchantId: string): void;
  setApiKey(apiKey: string): void;
  setSandboxMode(enabled: boolean): void;
  
  token: {
    create(
      cardData: OpenPayCardData,
      successCallback: (response: OpenPaySuccessResponse) => void,
      errorCallback: (response: OpenPayErrorResponse) => void
    ): void;
  };
  
  card: {
    validateCardNumber(cardNumber: string): boolean;
    validateCVC(cvc: string, cardNumber?: string): boolean;
    validateExpiry(month: string, year: string): boolean;
    cardType(cardNumber: string): string;
  };
  
  deviceData: {
    setup(formId: string, hiddenInputId: string): void;
  };
}

// Declare global OpenPay object
declare global {
  interface Window {
    OpenPay: OpenPaySDK;
  }
}

// Export for module usage
export type {
  OpenPayCardData,
  OpenPayTokenData,
  OpenPaySuccessResponse,
  OpenPayErrorResponse,
  OpenPayErrorData,
  OpenPaySDK,
};

