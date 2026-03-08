/**
 * JARVIS Navigation
 * Bottom Tab Navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

import ChatScreen from '../screens/ChatScreen';
import AgentsScreen from '../screens/AgentsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// Tab Icon Component
const TabIcon: React.FC<{ icon: string; label: string; focused: boolean }> = ({ 
  icon, 
  label, 
  focused 
}) => (
  <View style={styles.tabIcon}>
    <Text style={[styles.tabIconText, focused && styles.tabIconActive]}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
  </View>
);

// Main Navigator
export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{ 
          headerShown: false, 
          tabBarStyle: styles.tabBar, 
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{ 
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="💬" label="Chat" focused={focused} />
            ) 
          }}
        />
        <Tab.Screen
          name="Agents"
          component={AgentsScreen}
          options={{ 
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="🤖" label="Agents" focused={focused} />
            ) 
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ 
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="⚙️" label="Settings" focused={focused} />
            ) 
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.background.secondary,
    borderTopWidth: 0,
    height: 70,
    paddingBottom: SPACING.md,
    borderTopColor: COLORS.border.light,
    elevation: 0,
  },
  tabIcon: { 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: SPACING.sm,
  },
  tabIconText: { 
    fontSize: 22, 
    opacity: 0.6,
  },
  tabIconActive: { 
    opacity: 1,
  },
  tabLabel: { 
    fontSize: 10, 
    color: COLORS.text.tertiary, 
    marginTop: 4,
  },
  tabLabelActive: { 
    color: COLORS.neon.blue, 
    fontWeight: '600',
  },
});

export default RootNavigator;
