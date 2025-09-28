interface AvatarProps {
    bgColor: string
    assetName: string
}

const SimpleAvatar: React.FC<AvatarProps> = ({ bgColor, assetName }) => (
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

export default SimpleAvatar;