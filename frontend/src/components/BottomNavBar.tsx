
import BillIcon from "./BillIcon";
import { BottomNavigation } from "./BottomNavigation";
import MenuIcon from "./MenuIcon";

function BottomNavBar() {
    const bottomNavItems = [
        {
            title: "Menu",
            onClick: () => { },
            icon: <MenuIcon width={20} height={20} fill="#A5A5A5" />,
            activeIcon: <MenuIcon width={20} height={20} fill="#252525" />
        },
        {
            onClick: () => { },
            icon: <BillIcon width={20} height={20} fill="none" />,
            activeIcon: <BillIcon width={20} height={20} fill="none" />,
            title: "Cuenta",
        },
    ];

    return (
        <div>
            <BottomNavigation
                items={bottomNavItems}
                selected={0}
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