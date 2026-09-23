import { FormEvent, useState } from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { config } from '../config/environment';

export interface PaymentFormProps {
  myTotal: number;
  selectedItemsCount: number;
  paymentProcessing: boolean;
  formatPrice: (price: number) => string;
  /** When set, mount Stripe Payment Element and confirm this intent. */
  clientSecret?: string | null;
  /** Mock / no-keys path: one-click completes (backend already finished or will finish). */
  mockMode?: boolean;
  onConfirmMock: () => void | Promise<void>;
  onPaymentSuccess: () => void | Promise<void>;
  onCancel: () => void;
}

const stripePromise = config.stripe.publishableKey
  ? loadStripe(config.stripe.publishableKey)
  : null;

function StripeCheckoutForm({
  paymentProcessing,
  onPaymentSuccess,
  onCancel,
}: {
  paymentProcessing: boolean;
  onPaymentSuccess: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!stripe || !elements) {
      return;
    }
    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        setPaymentError(error.message || 'No se pudo confirmar el pago.');
        return;
      }
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        await onPaymentSuccess();
        return;
      }
      setPaymentError('El pago no se completó. Intenta de nuevo.');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
    }
  };

  const busy = isProcessing || paymentProcessing;

  return (
    <form onSubmit={handleSubmit}>
      {paymentError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
          ❌ {paymentError}
        </div>
      )}
      <div className="mb-5">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || busy}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium"
        >
          {busy ? 'Procesando…' : 'Pagar ahora'}
        </button>
      </div>
    </form>
  );
}

function PaymentForm({
  myTotal,
  selectedItemsCount,
  paymentProcessing,
  formatPrice,
  clientSecret,
  mockMode,
  onConfirmMock,
  onPaymentSuccess,
  onCancel,
}: PaymentFormProps) {
  const [mockBusy, setMockBusy] = useState(false);
  const [mockError, setMockError] = useState('');

  const handleMockPay = async () => {
    setMockError('');
    setMockBusy(true);
    try {
      await onConfirmMock();
    } catch (err) {
      setMockError(err instanceof Error ? err.message : 'Error al pagar');
    } finally {
      setMockBusy(false);
    }
  };

  const canUseStripe = Boolean(clientSecret) && Boolean(stripePromise) && !mockMode;
  const showConfigError = Boolean(clientSecret) && !stripePromise && !mockMode;
  const showMock = mockMode || (!clientSecret && !showConfigError);

  return (
    <div className="bg-white rounded-xl p-6 shadow-2xl">
      <div className="text-center mb-5">
        <h3 className="m-0 mb-2 text-gray-800">💳 Pago con Tarjeta</h3>
        <p className="m-0 text-gray-500 text-sm">
          {canUseStripe
            ? 'Procesamiento seguro con Stripe'
            : showConfigError
              ? 'Falta la clave publicable de Stripe'
              : 'Modo prueba (Stripe no configurado)'}
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-base">Total a pagar:</span>
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(myTotal)}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {selectedItemsCount} item{selectedItemsCount !== 1 ? 's' : ''} seleccionado
          {selectedItemsCount !== 1 ? 's' : ''}
        </div>
      </div>

      {showConfigError ? (
        <>
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            El servidor creó un PaymentIntent, pero falta{' '}
            <code>REACT_APP_STRIPE_PUBLISHABLE_KEY</code> en el frontend.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium"
          >
            Cerrar
          </button>
        </>
      ) : showMock ? (
        <>
          {mockError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
              ❌ {mockError}
            </div>
          )}
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            Stripe no está configurado: <strong>Pagar ahora (prueba)</strong> completa un
            pago de prueba en el servidor.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={mockBusy || paymentProcessing}
              className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleMockPay}
              disabled={mockBusy || paymentProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium"
            >
              {mockBusy || paymentProcessing ? 'Procesando…' : 'Pagar ahora (prueba)'}
            </button>
          </div>
        </>
      ) : (
        <Elements
          stripe={stripePromise}
          options={
            {
              clientSecret: clientSecret!,
              locale: 'es',
              appearance: { theme: 'stripe' },
            } as StripeElementsOptions
          }
        >
          <StripeCheckoutForm
            paymentProcessing={paymentProcessing}
            onPaymentSuccess={onPaymentSuccess}
            onCancel={onCancel}
          />
        </Elements>
      )}
    </div>
  );
}

export default PaymentForm;
