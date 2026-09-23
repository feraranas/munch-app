import { Sheet } from 'react-modal-sheet';
import { useState } from 'react';
import { ModalHeader } from './ModalHeader';
import PaymentForm from './PaymentForm';
import { config } from '../config/environment';

export type PreparePaymentResult =
  | { mock: true }
  | { mock: false; clientSecret: string };

interface ModalSheetProps {
  myTotal: number;
  totalPaidByGroup?: number;
  totalPaid?: number;
  remainingBalance?: number;
  paymentProcessing?: boolean;
  selectedItemsCount?: number;
  formatPrice: (price: number) => string;
  /** Creates PaymentIntent (or mock-completes). */
  onPreparePayment?: () => Promise<PreparePaymentResult>;
  /** After Stripe confirmPayment succeeds (webhook may still be in flight). */
  onPaymentSuccess?: () => void | Promise<void>;
  onCancelPayment?: () => void;
  buttonText?: string;
  orderItems?: Array<{
    id: string;
    menuId: string;
    name: string;
    price: number;
    qty: number;
  }>;
  onConfirmOrder?: () => void;
}

function ModalSheet({
  myTotal,
  paymentProcessing,
  selectedItemsCount,
  formatPrice,
  onPreparePayment,
  onPaymentSuccess,
  onCancelPayment,
  buttonText,
  orderItems = [],
  onConfirmOrder,
}: ModalSheetProps) {
  const [isOpen, setOpen] = useState(false);
  const [frozenTotal, setFrozenTotal] = useState(0);
  const [frozenCount, setFrozenCount] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const onClickCloseModalCTA = () => {
    setOpen(false);
    setClientSecret(null);
    setMockMode(false);
  };

  const onClickExpandModalCTA = async () => {
    setFrozenTotal(myTotal);
    setFrozenCount(selectedItemsCount ?? 0);

    if (orderItems.length > 0 && onConfirmOrder) {
      setOpen(true);
      return;
    }

    // No publishable key → mock UX (button calls intents which auto-completes).
    if (!config.stripe.publishableKey) {
      setMockMode(true);
      setClientSecret(null);
      setOpen(true);
      return;
    }

    if (!onPreparePayment) {
      setOpen(true);
      return;
    }

    setPreparing(true);
    try {
      const result = await onPreparePayment();
      if (result.mock) {
        // Backend completed without client_secret (secret key also unset).
        return;
      }
      setMockMode(false);
      setClientSecret(result.clientSecret);
      setOpen(true);
    } catch (err) {
      console.error('Prepare payment failed:', err);
      alert(
        `Error al iniciar el pago: ${
          err instanceof Error ? err.message : 'Error desconocido'
        }`
      );
    } finally {
      setPreparing(false);
    }
  };

  const handleStripeSuccess = async () => {
    await onPaymentSuccess?.();
    onClickCloseModalCTA();
  };

  const handleMockConfirm = async () => {
    const result = await onPreparePayment?.();
    if (result?.mock) {
      onClickCloseModalCTA();
      return;
    }
    if (result && !result.mock && result.clientSecret) {
      // Backend has Stripe keys but we opened mock UI somehow — switch to Elements
      setMockMode(false);
      setClientSecret(result.clientSecret);
      return;
    }
    throw new Error('No se pudo completar el pago de prueba.');
  };

  return (
    <>
      <ModalHeader
        isPlayerOpen={isOpen}
        onClickExpand={onClickExpandModalCTA}
        myTotal={myTotal}
        formatPrice={formatPrice}
        buttonText={
          preparing || paymentProcessing ? 'Preparando…' : buttonText
        }
      />

      <Sheet isOpen={isOpen} onClose={onClickCloseModalCTA}>
        <Sheet.Container className="bg-gray-50">
          <Sheet.Header />
          <Sheet.Content>
            {orderItems.length > 0 && onConfirmOrder ? (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Confirmar Orden
                  </h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Revisa los items antes de crear la orden
                  </p>
                </div>

                <div className="mb-6 max-h-96 overflow-y-auto">
                  {orderItems.map((item) => (
                    <div
                      key={item.menuId}
                      className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          {formatPrice(item.price)} c/u
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 px-2 py-1 rounded-md text-sm">
                          Qty: {item.qty}
                        </div>
                        <div className="font-semibold text-gray-800 min-w-20 text-right">
                          {formatPrice(item.price * item.qty)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span>{formatPrice(myTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClickCloseModalCTA}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onConfirmOrder();
                      onClickCloseModalCTA();
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    Confirmar Orden
                  </button>
                </div>
              </div>
            ) : (
              <PaymentForm
                myTotal={frozenTotal}
                selectedItemsCount={frozenCount}
                paymentProcessing={paymentProcessing ?? false}
                formatPrice={formatPrice}
                clientSecret={clientSecret}
                mockMode={mockMode}
                onConfirmMock={handleMockConfirm}
                onPaymentSuccess={handleStripeSuccess}
                onCancel={() => {
                  onCancelPayment?.();
                  onClickCloseModalCTA();
                }}
              />
            )}
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop />
      </Sheet>
    </>
  );
}

export default ModalSheet;
