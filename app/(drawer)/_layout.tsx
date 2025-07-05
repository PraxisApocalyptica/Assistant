import { Drawer } from 'expo-router/drawer';
import React from 'react';

import { IconSymbol } from '@/components/ui/IconSymbol';
import DrawerContent from './content';

export default function DrawerLayout() {
  return (
    <Drawer drawerContent={(props) => <DrawerContent {...props} />}>
      {/* --- NEW TEST SCREEN --- */}
      <Drawer.Screen
        name="direct-test"
        options={{
          title: 'Direct Bridge Test',
          // This will be hidden from the default drawer list, but accessible
          // via our custom DrawerContent and direct navigation.
          drawerItemStyle: { display: 'none' }, 
        }}
      />
      {/* --- END NEW TEST SCREEN --- */}
      
      <Drawer.Screen
        name="index"
        options={{
          title: 'Services Home',
          drawerIcon: ({ color }) => <IconSymbol name="house.fill" size={20} color={color} />,
        }}
      />
      
      <Drawer.Screen
        name="attendance"
        options={{
          title: 'Attendance Service',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="file-system-test"
        options={{
          title: 'File System Test',
          drawerItemStyle: { display: 'none' }, 
        }}
      />
      
      <Drawer.Screen
        name="code-viewer"
        options={{
          title: 'Service Code',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="package-json-viewer"
        options={{
          title: 'package.json Editor',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="package-manager"
        options={{
          title: 'NPM Package Manager',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="content"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}
