
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
                <div className="mini-player 
                                 flex justify-center items-center 
                                 px-6 py-3 
                                 mb-2
                                 ">
                    <div className="flex justify-between items-center 
                                    px-4 py-3 bg-white shadow-lg 
                                    rounded-xl border border-gray-200
                                    w-full max-w-sm
                                    ">
                        <div className="text-sm font-semibold text-gray-800">
                            Total {formatPrice(myTotal)}
                        </div>
                        <button 
                            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium cursor-pointer border-none transition-colors duration-200" 
                            onClick={onClickExpand}
                        >
                            Pagar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}