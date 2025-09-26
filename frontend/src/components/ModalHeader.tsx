
export function ModalHeader({
    isPlayerOpen,
    onClickExpand,
    myTotal,
    formatPrice,
}: {
    isPlayerOpen: boolean;
    onClickExpand: () => void;
    myTotal: number;
    formatPrice: (price: number) => string;
}) {
    return (
        <>
            {!isPlayerOpen && (
                <div className="mini-player flex justify-between items-center p-3 bg-white rounded-lg shadow-md m-4 border border-gray-200">
                    <div className="text-base font-semibold text-gray-800">
                        {formatPrice(myTotal)}
                    </div>
                    <button 
                        className="pay-button bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm font-semibold cursor-pointer border-none transition-colors duration-200" 
                        onClick={onClickExpand}
                    >
                        Pagar
                    </button>
                </div>
            )}
        </>
    );
}