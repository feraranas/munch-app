
import { BottomNavigation } from "./BottomNavigation";
import MenuIcon from "./MenuIcon";

function BottomNavBar() {
  const bottomNavItems = [
    {
      title: "Menu",
      onClick: () => {},
      icon: <MenuIcon width={24} height={24} fill="#666666" />,
      activeIcon: <MenuIcon width={24} height={24} fill="white" />
    },
    {
      title: "Cuenta",
    },
  ];

  return (
    <div>
      <BottomNavigation
        items={bottomNavItems}
        selected={0}
        activeBgColor="slateBlue"
        activeTextColor="white"
        hideOnScroll={true}
        className="custom-bottom-nav"
        style={{ position: "fixed", bottom: 0, width: "100%" }}
      />
    </div>
  );
}

export default BottomNavBar;