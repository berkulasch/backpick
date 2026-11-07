import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#111827', tabBarInactiveTintColor: '#9ca3af' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Board',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'easel' : 'easel-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="playbook"
        options={{
          title: 'Playbook',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'globe' : 'globe-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'My Team',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
