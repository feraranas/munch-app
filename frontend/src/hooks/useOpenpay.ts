import { useEffect, useState, useCallback } from 'react';
import { config } from '../config/environment';
import type {
  OpenPayCardData,
  OpenPaySuccessResponse,
  OpenPayErrorResponse,
} from '../types/openpay';

interface UseOpenpayReturn {
  isReady: boolean;
  error: string | null;
  createToken: (
    cardData: OpenPayCardData,
    onSuccess: (tokenId: string, response: OpenPaySuccessResponse) => void,
    onError: (errorMessage: string, response: OpenPayErrorResponse) => void
  ) => void;
  validateCardNumber: (cardNumber: string) => boolean;
  validateCVC: (cvc: string, cardNumber?: string) => boolean;
  validateExpiry: (month: string, year: string) => boolean;
  getCardType: (cardNumber: string) => string;
  setupDeviceData: (formId: string, hiddenInputId: string) => void;
}

/**
 * Hook to interact with the Openpay.js SDK
 * Initializes the SDK and provides wrapped methods for token creation and validation
 */
export const useOpenpay = (): UseOpenpayReturn => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Openpay SDK
  useEffect(() => {
    const initializeOpenpay = () => {
      if (!window.OpenPay) {
        setError('Openpay SDK no está disponible. Verifica la conexión a internet.');
        return;
      }

      try {
        // Configure Openpay with merchant credentials
        window.OpenPay.setId(config.openpay.merchantId);
        window.OpenPay.setApiKey(config.openpay.publicApiKey);
        window.OpenPay.setSandboxMode(config.openpay.sandboxMode);

        setIsReady(true);
        setError(null);

        console.log('✅ Openpay SDK initialized successfully', {
          merchantId: config.openpay.merchantId,
          sandboxMode: config.openpay.sandboxMode,
        });
      } catch (err) {
        const errorMsg = 'Error al inicializar Openpay SDK';
        setError(errorMsg);
        console.error(errorMsg, err);
      }
    };

    // Wait for script to load if not ready yet
    if (window.OpenPay) {
      initializeOpenpay();
    } else {
      // Poll for OpenPay to be available
      const checkInterval = setInterval(() => {
        if (window.OpenPay) {
          initializeOpenpay();
          clearInterval(checkInterval);
        }
      }, 100);

      // Cleanup
      return () => clearInterval(checkInterval);
    }
  }, []);

  /**
   * Create a token from card data
   */
  const createToken = useCallback(
    (
      cardData: OpenPayCardData,
      onSuccess: (tokenId: string, response: OpenPaySuccessResponse) => void,
      onError: (errorMessage: string, response: OpenPayErrorResponse) => void
    ) => {
      if (!isReady || !window.OpenPay) {
        onError('Openpay SDK no está listo', {} as OpenPayErrorResponse);
        return;
      }

      const successCallback = (response: OpenPaySuccessResponse) => {
        const tokenId = response.data.id;
        console.log('✅ Token created successfully:', tokenId);
        onSuccess(tokenId, response);
      };

      const errorCallback = (response: OpenPayErrorResponse) => {
        console.error('❌ Token creation error:', response);
        
        // Map Openpay error messages to user-friendly Spanish messages
        let userMessage = 'Error al procesar el pago. Intenta nuevamente.';
        
        switch (response.message) {
          case 'Empty or invalid OpenPay ID':
            userMessage = 'Configuración inválida del comercio. Contacta soporte.';
            break;
          case 'Empty or invalid API Key':
            userMessage = 'Configuración inválida de la API. Contacta soporte.';
            break;
          case 'Browser error':
            userMessage = 'Error del navegador. Actualiza tu navegador e intenta nuevamente.';
            break;
          case 'Request error':
            userMessage = response.data?.description || 'Error en la solicitud. Verifica los datos de la tarjeta.';
            break;
          case 'Response error (Unknown final status)':
            userMessage = 'Error desconocido del servidor. Intenta más tarde.';
            break;
          default:
            if (response.message.includes('Timeout')) {
              userMessage = 'La solicitud tardó demasiado. Verifica tu conexión e intenta nuevamente.';
            } else if (response.message === 'Unknown error') {
              userMessage = 'Error desconocido. Verifica tu conexión e intenta nuevamente.';
            }
        }
        
        onError(userMessage, response);
      };

      window.OpenPay.token.create(cardData, successCallback, errorCallback);
    },
    [isReady]
  );

  /**
   * Validate card number using Luhn algorithm
   */
  const validateCardNumber = useCallback((cardNumber: string): boolean => {
    if (!window.OpenPay) return false;
    return window.OpenPay.card.validateCardNumber(cardNumber);
  }, []);

  /**
   * Validate CVC/CVV code
   */
  const validateCVC = useCallback((cvc: string, cardNumber?: string): boolean => {
    if (!window.OpenPay) return false;
    return window.OpenPay.card.validateCVC(cvc, cardNumber);
  }, []);

  /**
   * Validate expiration date
   */
  const validateExpiry = useCallback((month: string, year: string): boolean => {
    if (!window.OpenPay) return false;
    return window.OpenPay.card.validateExpiry(month, year);
  }, []);

  /**
   * Get card brand/type from card number
   */
  const getCardType = useCallback((cardNumber: string): string => {
    if (!window.OpenPay) return '';
    return window.OpenPay.card.cardType(cardNumber);
  }, []);

  /**
   * Setup device data collection for fraud prevention
   */
  const setupDeviceData = useCallback((formId: string, hiddenInputId: string) => {
    if (!window.OpenPay || !window.OpenPay.deviceData) {
      console.warn('Device data collection not available');
      return;
    }
    window.OpenPay.deviceData.setup(formId, hiddenInputId);
  }, []);

  return {
    isReady,
    error,
    createToken,
    validateCardNumber,
    validateCVC,
    validateExpiry,
    getCardType,
    setupDeviceData,
  };
};

