import * as React from 'react';

interface User {
  id: string;
  qr_session: string;
  avatar: string;
  joined_at: number;
}

interface CollaborativeUsersProps {
  qrSessionId: string;
  isConnected: boolean;
  connectedUsers: User[];
}

// Global map to track used assets per QR session
const usedAssetsPerSession: { [sessionId: string]: Map<string, string> } = {};

// Asset files from /public/assets directory
// const assets: Map<string, boolean> = {
//   {'1.png': false}, 
//   '3.png', '4.png', '5.png', '6.png', '7.png', '8.png', '9.png', '10.png',
//   '11.png', '12.png', '13.png', '14.png', '15.png', '16.png', '17.png', '18.png', '19.png', '20.png',
//   '21.png', '22.png', '23.png', '24.png', '25.png', '26.png', '27.png', '28.png', '29.png', '30.png',
//   '31.png', '32.png', '33.png', '34.png', '35.png'
// };

const assets: Record<string, boolean> = {
  '1.png': false,
  '3.png': false,
  '4.png': false,
  '5.png': false,
  '6.png': false,
  '7.png': false,
  '8.png': false,
  '9.png': false,
  '10.png': false,
  '11.png': false,
  '12.png': false,
  '13.png': false,
  '14.png': false,
  '15.png': false,
  '16.png': false,
  '17.png': false,
  '18.png': false,
  '19.png': false,
  '20.png': false,
  '21.png': false,
  '22.png': false,
  '23.png': false,
  '24.png': false,
  '25.png': false,
  '26.png': false,
  '27.png': false,
  '28.png': false,
  '29.png': false,
  '30.png': false,
  '31.png': false,
  '32.png': false,
  '33.png': false,
  '34.png': false,
  '35.png': false,
};

const CollaborativeUsers: React.FC<CollaborativeUsersProps> = ({ 
  qrSessionId, 
  isConnected, 
  connectedUsers 
}) => {
  if (!isConnected) {
    return null;
  }

  // User ID is a 4 byte random integer "bf85e5d8".
  const getRandomAsset = (userId: string): string => {
    // Initialize used assets set for this session if it doesn't exist
    if (!usedAssetsPerSession[qrSessionId]) {
      usedAssetsPerSession[qrSessionId] = new Map();
    }

    const sessionMap = usedAssetsPerSession[qrSessionId];

    // If this user has an asset already return it
    if (sessionMap.has(userId)) {
      return sessionMap.get(userId)!; // <-- "!" tells TS it's safe
    }

    // Find available assets
    const availableAssets = Object.keys(assets).filter(asset => assets[asset] === false);

    // TODO: Improve logic If all assets are used. e.g., reset the set for this session
    if (availableAssets.length === 0) {
      return '1.png'
    }

     // Pick a random one
    const selectedAsset = availableAssets[Math.floor(Math.random() * availableAssets.length)];

    // Mark it as used
    assets[selectedAsset] = true;

    // Save assignment in session
    sessionMap.set(userId, selectedAsset);

    return selectedAsset;
  };

  const SimpleAvatar = ({ bgColor, assetName }: { bgColor: string; assetName: string }) => (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <img 
        src={`/assets/${assetName}`} 
        alt="User avatar" 
        className="w-full h-full object-cover"
      />
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center pt-2 pb-2">
      <div className="flex flex-row gap-4">
        {connectedUsers
          .filter(user => user.qr_session === qrSessionId)
          .map((user, index) => (
            <SimpleAvatar
              key={user.id}
              bgColor={'#d8d8d8'}
              assetName={getRandomAsset(user.id)}
            />
          ))}
      </div>
    </div>
  );
};

export default CollaborativeUsers;