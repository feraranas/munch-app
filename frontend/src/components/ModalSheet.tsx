import { Sheet } from 'react-modal-sheet';
import { useState } from 'react';
import { ModalHeader } from './ModalHeader';
import PaymentForm from './PaymentForm';

interface ModalSheetProps {
  myTotal: number;
  totalPaidByGroup?: number;
  totalPaid?: number;
  remainingBalance?: number;
  paymentProcessing?: boolean;
  selectedItemsCount?: number;
  formatPrice: (price: number) => string;
  onPayment?: (tokenId: string, deviceSessionId?: string) => void;
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
  totalPaidByGroup, 
  totalPaid, 
  remainingBalance, 
  paymentProcessing, 
  selectedItemsCount,
  formatPrice, 
  onPayment,
  onCancelPayment,
  buttonText,
  orderItems = [],
  onConfirmOrder
}: ModalSheetProps) {
  const [isOpen, setOpen] = useState(false);
  const onClickExpandModalCTA = () => setOpen(true);  
  const onClickCloseModalCTA = () => setOpen(false);  

  return (
    <>
      {/* Opens to 50% since initial index is 1 */}
      {/* <Sheet
        ref={ref}
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        initialSnap={1}
        snapPoints={snapPoints}
        onSnap={(snapIndex) =>
          console.log('> Current snap point index:', snapIndex)
        }
        detent="content"
      > */}
      <ModalHeader 
        isPlayerOpen={isOpen} 
        onClickExpand={onClickExpandModalCTA} 
        myTotal={myTotal}
        formatPrice={formatPrice}
        buttonText={buttonText}
      />
      
      <Sheet
        isOpen={isOpen}
        onClose={onClickCloseModalCTA}
        // modalEffectRootId="root"
      >
        <Sheet.Container className='bg-gray-50'>
          <Sheet.Header />
            {/* <Sheet.DragIndicator /> */}
          <Sheet.Content>
            {orderItems.length > 0 && onConfirmOrder ? (
              // Order Confirmation View
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Confirmar Orden
                  </h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Revisa los items antes de crear la orden
                  </p>
                </div>

                {/* Order Items List */}
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

                {/* Total */}
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span>{formatPrice(myTotal)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
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
              // Payment View (original functionality)
              <>
                {/* <PaymentSummary
                  myTotal={myTotal}
                  // totalPaidByGroup={totalPaidByGroup ?? 0}
                  // totalPaid={totalPaid ?? 0}
                  // remainingBalance={remainingBalance ?? 0}
                  paymentProcessing={paymentProcessing ?? false}
                  formatPrice={formatPrice}
                  onPayment={onPayment ?? (() => {})}
                /> */}
                <PaymentForm
                  myTotal={myTotal}
                  selectedItemsCount={selectedItemsCount ?? 0}
                  paymentProcessing={paymentProcessing ?? false}
                  formatPrice={formatPrice}
                  onConfirmPayment={onPayment ?? ((tokenId: string, deviceSessionId?: string) => {})}
                  onCancel={onCancelPayment ?? (() => {})}
                />
              </>
            )}
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop />
    
    </Sheet >
    </>
  );
}

export default ModalSheet;