import { View, Text } from 'react-native';

export default function PlaceholderScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Пока заглушка</Text>
      <Text>Этот экран будет наполнен позже</Text>
    </View>
  );
}