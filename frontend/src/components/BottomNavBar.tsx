
import { BottomNavigation } from "./BottomNavigation";
import SimpleAvatar from "./Avatar";

function BottomNavBar() {
  const bottomNavItems = [
    {
      title: "Menu",
      onClick: () => {},
      icon: <img src='../../public/menu-item.svg' />,
      activeIcon: <img src='../../public/menu-item.svg' />
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