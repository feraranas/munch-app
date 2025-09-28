
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
                <div className=" fixed bottom-16 left-0 right-0
                                 flex justify-center items-center 
                                 px-10 py-3
                                 z-10
                                 ">
                    <div className="flex justify-between items-center 
                                    px-4 py-3 bg-white shadow-md
                                    rounded-full border border-gray-100
                                    w-full max-w-sm
                                    ">
                        <div className="text-sm font-semibold text-gray-800">
                            Total {formatPrice(myTotal)}
                        </div>
                        <button 
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-500 hover:to-red-700 text-white 
                                       py-3 px-6 rounded-full text-base font-medium 
                                       cursor-pointer border-none 
                                       transition-all duration-200 shadow-sm" 
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