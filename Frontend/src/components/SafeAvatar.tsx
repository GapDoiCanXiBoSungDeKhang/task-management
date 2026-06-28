import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface Props {
  src?: string;
  name?: string;
  size?: number | 'small' | 'default' | 'large';
}

/**
 * Avatar tự động fallback về initials / icon khi ảnh 404
 */
export default function SafeAvatar({ src, name, size = 32 }: Props) {
  const initial = name?.trim()?.[0]?.toUpperCase();

  return (
    <Avatar
      size={size}
      src={src || undefined}
      icon={!initial ? <UserOutlined /> : undefined}
      onError={() => true}   // returning true keeps Avatar from retrying
    >
      {!src && initial ? initial : undefined}
    </Avatar>
  );
}
