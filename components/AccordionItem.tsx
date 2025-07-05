import React, { PropsWithChildren, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type AccordionProps = PropsWithChildren<{
  title: string;
  iconName: React.ComponentProps<typeof IconSymbol>['name'];
}>;

const AccordionItem = ({ title, iconName, children }: AccordionProps) => {
  const theme = useColorScheme() ?? 'light';
  const iconColor = Colors[theme].icon;
  
  const [contentHeight, setContentHeight] = useState(0);
  const open = useSharedValue(false);

  // Animate the rotation of the chevron icon
  const iconAnimationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open.value ? '90deg' : '0deg') }],
  }));

  // Animate the height of the content container
  const heightAnimationStyle = useAnimatedStyle(() => {
    // Animate to the measured height when open, and to 0 when closed.
    return {
      height: open.value ? withTiming(contentHeight) : withTiming(0),
    };
  });

  const toggleAccordion = () => {
    open.value = !open.value;
  };
  
  const handleOnLayout = (event: LayoutChangeEvent) => {
    // Measure the height of the content once it's laid out
    setContentHeight(event.nativeEvent.layout.height);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleAccordion} style={styles.titleContainer}>
        <IconSymbol name={iconName} size={20} color={iconColor} />
        <ThemedText style={styles.title}>{title}</ThemedText>
        <Animated.View style={iconAnimationStyle}>
          <IconSymbol name="chevron.right" size={22} color={iconColor} />
        </Animated.View>
      </TouchableOpacity>
      
      {/* The animated container that will expand/collapse */}
      <Animated.View style={[styles.contentContainer, heightAnimationStyle]}>
        {/* A wrapper view that is never animated but is used to measure the true height of the content */}
        <View style={styles.content} onLayout={handleOnLayout}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  contentContainer: {
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    width: '100%',
  },
});

export default AccordionItem;