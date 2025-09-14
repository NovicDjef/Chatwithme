import { StyleSheet, View } from 'react-native';
import EmotionDemo from '../screens/Main/EmotionDemo.js';

export default function TabTwoScreen() {
  return (
    <View style={styles.container}>
      <EmotionDemo />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});