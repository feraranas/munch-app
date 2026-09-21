import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRSession } from '../services/api';

interface SessionGridProps {
    sessions: QRSession[];
}

const SessionGrid: React.FC<SessionGridProps> = ({ sessions }) => {
    const navigate = useNavigate();

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(price);
    };

    const formatDateTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleSessionClick = (session: QRSession) => {
        navigate(`/admin/table/${session.id}/pos`);
    };

    const getStatusColor = (session: QRSession) => {
        if (!session.has_order) return 'bg-gray-100 text-gray-600'; // Gray for no order
        if (session.order?.status === 'paid') return 'bg-green-500 text-white'; // Green for paid
        return 'bg-sky text-white'; // Blue for active order
    };

    const getStatusText = (session: QRSession) => {
        if (!session.has_order) return 'Sin orden';
        if (session.order?.status === 'paid') return 'Pagado';
        return 'Orden activa';
    };

    if (sessions.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                <h3 className="text-lg font-medium mb-2">No hay sesiones QR</h3>
                <p>Crea códigos QR desde el <Link to="/admin/qr" className="text-blue-500 hover:text-blue-600 underline">Generador de QR</Link></p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-6">
            {sessions.map((session) => (
                <div
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    className="relative bg-white mx-0
                     border-b-2 border-r-2
                     border-black-100
                     rounded-2xl px-3 pt-9 pb-3 cursor-pointer 
                     transition-all duration-200
                     hover:border-blue-500 hover:-translate-y-0.5 
                     hover:shadow-md"
                >
                    {/* Status badge in top-right corner */}
                    <div className={`absolute top-0 left-0 w-full
                            px-4 py-1 text-xs
                            font-medium rounded-tl-xl rounded-tr-xl
                            shadow-lg ${getStatusColor(session)}`}>
                        {getStatusText(session)}
                    </div>

                    {/* Row 1: Table Number */}
                    <div className="mb-3">
                        <h4 className="m-0 text-md font-semibold text-black">
                            {session.table_number || `Mesa ${session.id.slice(0, 8)}`}
                        </h4>
                    </div>

                    {/* Row 2: Items count */}
                    <div className="text-sm mb-3 text-gray-500">
                        <strong>Orden:</strong> {session.has_order && session.order ? `${session.order.items.length} items` : '0 items'}
                    </div>

                    {/* Row 3: Total */}
                    <div className="text-base font-semibold mb-3">
                        <strong>Total:</strong> {session.has_order && session.order ? formatPrice(session.order.total) : '$0.00'}
                    </div>

                    {/* Row 4: Created at */}
                    <div className="text-xs text-gray-500">
                        <strong>Creada:</strong> {session.has_order && session.order ? formatDateTime(session.order.created_at) : '-'}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SessionGrid;

