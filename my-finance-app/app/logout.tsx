// app/logout.tsx
import { View, Text } from 'react-native';

export default function Logout() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>Выход из аккаунта (заглушка)</Text>
      <Text>Здесь будет реальный logout</Text>
    </View>
  );
}