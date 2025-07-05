import { DrawerContentScrollView } from '@react-navigation/drawer';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import AccordionItem from '@/components/AccordionItem';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function DrawerContent(props: any) {
  const theme = useColorScheme() ?? 'light';
  const iconColor = Colors[theme].icon;

  const activeRoute = props.state.routes[props.state.index];
  const focusedDrawerScreenName = activeRoute.state?.routes[activeRoute.state.index]?.name;

  const CustomDrawerItem = ({ label, iconName, onPress, isFocused, colorOverride }: { 
    label: string; 
    iconName: React.ComponentProps<typeof IconSymbol>['name']; 
    onPress: () => void;
    isFocused: boolean;
    colorOverride?: string;
  }) => {
    const activeBackgroundColor = Colors[theme].tint;
    const backgroundColor = isFocused ? activeBackgroundColor : 'transparent';
    const color = colorOverride || (isFocused ? Colors[theme].background : Colors[theme].text);
    const itemIconColor = colorOverride || (isFocused ? Colors[theme].background : iconColor);

    return (
      <TouchableOpacity onPress={onPress} style={[styles.customDrawerItem, { backgroundColor }]}>
        <IconSymbol name={iconName} size={20} color={itemIconColor} />
        <ThemedText style={[styles.customDrawerLabel, { color }]}>
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <DrawerContentScrollView {...props}>
      <ThemedView style={styles.container}>
        {/* --- NEW DEBUG LINK AT THE TOP --- */}
        <CustomDrawerItem
          label="** FILE SYSTEM TEST **"
          iconName="folder.badge.questionmark"
          isFocused={focusedDrawerScreenName === 'file-system-test'}
          colorOverride="green"
          onPress={() => {
            props.navigation.navigate('(drawer)', { screen: 'file-system-test' });
          }}
        />
        <View style={[styles.divider, { backgroundColor: "green" }]} />
        {/* --- END NEW DEBUG LINK --- */}

        <CustomDrawerItem label="Services Home" iconName="house.fill" isFocused={focusedDrawerScreenName === 'index'} onPress={() => { props.navigation.navigate('(drawer)', { screen: 'index' }); }} />
        <CustomDrawerItem label="AI Assistant" iconName="message.fill" isFocused={props.state.routes[props.state.index].name === '(tabs)'} onPress={() => { props.navigation.navigate('(tabs)', { screen: 'index' }); }} />
        <CustomDrawerItem label="Settings" iconName="gearshape.fill" isFocused={focusedDrawerScreenName === 'settings'} onPress={() => { props.navigation.navigate('(drawer)', { screen: 'settings' }); }} />
        
        <View style={[styles.divider, { backgroundColor: iconColor }]} />

        <AccordionItem title="Projects" iconName="folder.fill">
          <ThemedView style={styles.nestedView}>
            <AccordionItem title="NodeJS" iconName="memorychip.fill">
              <CustomDrawerItem label="Attendance Service" iconName="person.crop.rectangle.stack.fill" isFocused={focusedDrawerScreenName === 'attendance'} onPress={() => { props.navigation.navigate('(drawer)', { screen: 'attendance' }); }} />
            </AccordionItem>
          </ThemedView>
        </AccordionItem>
      </ThemedView>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, },
  nestedView: { paddingLeft: 10, },
  customDrawerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, },
  customDrawerLabel: { marginLeft: 15, fontSize: 15, fontWeight: '500', },
  divider: { height: 1, width: '100%', opacity: 0.2, marginVertical: 10, }
});
