import { StyleSheet, View } from 'react-native';
import ChatNavigator from '../components/Chat/ChatNavigator.js';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ChatNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});