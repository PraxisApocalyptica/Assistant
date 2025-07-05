// Fallback for using MaterialIcons on Android and web.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING: IconMapping = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'magnifyingglass': 'search',
  'folder.fill': 'folder',
  'memorychip.fill': 'memory',
  'person.crop.rectangle.stack.fill': 'fact-check',
  'line.3.horizontal': 'menu',
  'message.fill': 'chat',
  'gearshape.fill': 'settings',
  'folder.badge.questionmark': 'folder-special', // <-- ADD THIS NEW ICON
};

export function IconSymbol({ name, size = 24, color, style, }: { name: IconSymbolName; size?: number; color: string | OpaqueColorValue; style?: StyleProp<TextStyle>; }) {
  const iconName = MAPPING[name] || 'help-outline'; // Fallback icon
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
