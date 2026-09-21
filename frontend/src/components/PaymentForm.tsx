import { useState, useEffect } from 'react';
import { useOpenpay } from '../hooks/useOpenpay';
import type { OpenPayCardData } from '../types/openpay';

interface PaymentFormProps {
  myTotal: number;
  selectedItemsCount: number;
  paymentProcessing: boolean;
  formatPrice: (price: number) => string;
  onConfirmPayment: (tokenId: string, deviceSessionId?: string) => void;
  onCancel: () => void;
}

function PaymentForm({ 
  myTotal, 
  selectedItemsCount, 
  paymentProcessing, 
  formatPrice, 
  onConfirmPayment, 
  onCancel 
}: PaymentFormProps) {
  const {
    isReady,
    error: openpayError,
    createToken,
    validateCardNumber,
    validateCVC,
    validateExpiry,
    getCardType,
    setupDeviceData,
  } = useOpenpay();

  // Form state
  const [cardNumber, setCardNumber] = useState('4111111111111111');
  const [holderName, setHolderName] = useState('JUAN PEREZ');
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('28');
  const [cvv, setCvv] = useState('123');
  const [deviceSessionId, setDeviceSessionId] = useState('');

  // Validation state
  const [cardNumberError, setCardNumberError] = useState('');
  const [holderNameError, setHolderNameError] = useState('');
  const [expiryError, setExpiryError] = useState('');
  const [cvvError, setCvvError] = useState('');

  // UI state
  const [cardBrand, setCardBrand] = useState('visa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Setup device data collection for fraud prevention
  useEffect(() => {
    if (isReady) {
      setupDeviceData('payment-form', 'deviceSessionId');
    }
  }, [isReady, setupDeviceData]);

  // Validate card number on change
  const handleCardNumberChange = (value: string) => {
    // Remove non-digits
    const cleaned = value.replace(/\D/g, '');
    setCardNumber(cleaned);
    setCardNumberError('');

    // Get card type
    if (cleaned.length >= 4) {
      const type = getCardType(cleaned);
      setCardBrand(type);
    } else {
      setCardBrand('');
    }

    // Validate if complete
    if (cleaned.length >= 13) {
      const isValid = validateCardNumber(cleaned);
      if (!isValid) {
        setCardNumberError('Número de tarjeta inválido');
      }
    }
  };

  // Validate CVV on change
  const handleCvvChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setCvv(cleaned);
    setCvvError('');

    if (cleaned.length >= 3) {
      const isValid = validateCVC(cleaned, cardNumber);
      if (!isValid) {
        setCvvError('CVV inválido');
      }
    }
  };

  // Validate expiry on change
  const handleExpiryChange = (month: string, year: string) => {
    setExpiryError('');
    
    if (month && year && month.length === 2 && year.length === 2) {
      const isValid = validateExpiry(month, year);
      if (!isValid) {
        setExpiryError('Fecha de expiración inválida o vencida');
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    // Validate all fields
    let hasErrors = false;

    if (!holderName.trim()) {
      setHolderNameError('Nombre del titular es requerido');
      hasErrors = true;
    }

    if (!validateCardNumber(cardNumber)) {
      setCardNumberError('Número de tarjeta inválido');
      hasErrors = true;
    }

    if (!validateExpiry(expiryMonth, expiryYear)) {
      setExpiryError('Fecha de expiración inválida');
      hasErrors = true;
    }

    if (!validateCVC(cvv, cardNumber)) {
      setCvvError('CVV inválido');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setIsProcessing(true);

    // Prepare card data for Openpay
    const cardData: OpenPayCardData = {
      card_number: cardNumber,
      holder_name: holderName,
      expiration_year: expiryYear,
      expiration_month: expiryMonth,
      cvv2: cvv,
    };

    // Create token
    createToken(
      cardData,
      (tokenId) => {
        // Success - pass token to parent for payment processing
        console.log('✅ Token created, processing payment...');
        onConfirmPayment(tokenId, deviceSessionId || undefined);
        setIsProcessing(false);
      },
      (errorMessage) => {
        // Error
        setPaymentError(errorMessage);
        setIsProcessing(false);
      }
    );
  };

  // Format card number for display (with spaces)
  const formatCardNumberDisplay = (value: string) => {
    return value.replace(/(\d{4})/g, '$1 ').trim();
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-2xl">
      <div className="text-center mb-5">
        <h3 className="m-0 mb-2 text-gray-800">💳 Pago con Tarjeta</h3>
        <p className="m-0 text-gray-500 text-sm">
          {isReady ? 'Procesamiento seguro con Openpay' : 'Cargando sistema de pagos...'}
        </p>
      </div>

      {/* Openpay Error */}
      {openpayError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
          {openpayError}
        </div>
      )}

      {/* Payment Error */}
      {paymentError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
          ❌ {paymentError}
        </div>
      )}
      
      {/* Payment Summary */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-base">Total a pagar:</span>
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(myTotal)}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {selectedItemsCount} item{selectedItemsCount !== 1 ? 's' : ''} seleccionado{selectedItemsCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Payment Form */}
      <form id="payment-form" onSubmit={handleSubmit}>
        {/* Hidden field for device session ID (fraud prevention) */}
        <input type="hidden" id="deviceSessionId" value={deviceSessionId} onChange={(e) => setDeviceSessionId(e.target.value)} />

        {/* Card Number */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Tarjeta
          </label>
          <div className="relative">
            <input
              type="text"
              value={formatCardNumberDisplay(cardNumber)}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className={`w-full p-3 border rounded-md text-base ${
                cardNumberError ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={!isReady || isProcessing || paymentProcessing}
            />
            {cardBrand && (
              <span className="absolute right-3 top-3 text-xs font-semibold text-gray-600 uppercase">
                {cardBrand}
              </span>
            )}
          </div>
          {cardNumberError && (
            <p className="text-red-600 text-xs mt-1">{cardNumberError}</p>
          )}
        </div>

        {/* Holder Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Titular
          </label>
          <input
            type="text"
            value={holderName}
            onChange={(e) => {
              setHolderName(e.target.value.toUpperCase());
              setHolderNameError('');
            }}
            placeholder="JUAN PEREZ RAMIREZ"
            className={`w-full p-3 border rounded-md text-base ${
              holderNameError ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            disabled={!isReady || isProcessing || paymentProcessing}
          />
          {holderNameError && (
            <p className="text-red-600 text-xs mt-1">{holderNameError}</p>
          )}
        </div>

        {/* Expiry and CVV */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Expiry Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <input
              type="text"
              value={expiryMonth}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                setExpiryMonth(value);
                handleExpiryChange(value, expiryYear);
              }}
              placeholder="12"
              maxLength={2}
              className={`w-full p-3 border rounded-md text-base ${
                expiryError ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={!isReady || isProcessing || paymentProcessing}
            />
          </div>

          {/* Expiry Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <input
              type="text"
              value={expiryYear}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                setExpiryYear(value);
                handleExpiryChange(expiryMonth, value);
              }}
              placeholder="25"
              maxLength={2}
              className={`w-full p-3 border rounded-md text-base ${
                expiryError ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={!isReady || isProcessing || paymentProcessing}
            />
          </div>

          {/* CVV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <input
              type="text"
              value={cvv}
              onChange={(e) => handleCvvChange(e.target.value)}
              placeholder="123"
              maxLength={4}
              className={`w-full p-3 border rounded-md text-base ${
                cvvError ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={!isReady || isProcessing || paymentProcessing}
            />
          </div>
        </div>

        {/* Error messages for expiry and CVV */}
        {expiryError && (
          <p className="text-red-600 text-xs mt-1 mb-2">{expiryError}</p>
        )}
        {cvvError && (
          <p className="text-red-600 text-xs mt-1 mb-2">{cvvError}</p>
        )}

        {/* Security Notice */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-gray-600">
          🔒 Tu información está protegida. No almacenamos datos de tu tarjeta.
        </div>

        {/* Test Card Info */}
        {isReady && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-gray-700">
            <strong>Tarjeta de prueba:</strong> 4111111111111111 | CVV: 123 | Fecha: 12/28
            <div className="mt-1 text-gray-500">
              Openpay no está configurado: Pagar Ahora completa un pago de prueba.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing || paymentProcessing}
            className={`flex-1 py-3 px-4 bg-gray-500 text-white border-none rounded-md text-base transition-colors duration-200 ${
              isProcessing || paymentProcessing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-600'
            }`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isReady || isProcessing || paymentProcessing}
            className={`flex-[2] py-3 px-4 bg-green-600 text-white border-none rounded-md text-base font-medium transition-colors duration-200 ${
              !isReady || isProcessing || paymentProcessing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-green-700'
            }`}
          >
            {isProcessing || paymentProcessing ? '⏳ Procesando...' : '✅ Pagar Ahora'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PaymentForm;
