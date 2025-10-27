import { useNavigate, useParams, useLocation } from "react-router-dom";
import BillIcon from "./BillIcon";
import { BottomNavigation } from "./BottomNavigation";
import MenuIcon from "./MenuIcon";

interface RouteParams {
    orderId?: string;
}

interface LocationState {
    fromOrderId?: string;
}

function BottomNavBar() {
    const navigate = useNavigate();
    const { orderId } = useParams<keyof RouteParams>() as RouteParams;
    const location = useLocation();
    const locationState = location.state as LocationState;

    // Get orderId from URL params or from location state (if navigated from check view)
    const currentOrderId = orderId || locationState?.fromOrderId;

    // Determine which tab is active based on the current path
    const isMenuActive = location.pathname.includes('/menu');
    const selectedTab = isMenuActive ? 0 : 1;

    const handleMenuClick = () => {
        // Pass the current orderId in state so we can navigate back
        navigate('/menu', { state: { fromOrderId: currentOrderId } });
    };

    const handleCheckClick = () => {
        if (currentOrderId) {
            navigate(`/check/${currentOrderId}`);
        }
    };

    const bottomNavItems = [
        {
            title: "Menu",
            onClick: handleMenuClick,
            icon: <MenuIcon width={20} height={20} fill="#A5A5A5" />,
            activeIcon: <MenuIcon width={20} height={20} fill="#252525" />
        },
        {
            onClick: handleCheckClick,
            icon: <BillIcon width={20} height={20} fill="none" />,
            activeIcon: <BillIcon width={20} height={20} fill="none" />,
            title: "Cuenta",
        },
    ];

    return (
        <div>
            <BottomNavigation
                items={bottomNavItems}
                selected={selectedTab}
                activeBgColor="#F5F5F5"
                activeTextColor="black"
                hideOnScroll={true}
                className="custom-bottom-nav"
                style={{ position: "fixed", bottom: 0, width: "100%" }}
            />
        </div>
    );
}

export default BottomNavBar;