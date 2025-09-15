import { StyleSheet, View } from 'react-native';
import ProfileScreen from '../components/Profile/ProfileScreen';

export default function ProfileTabScreen() {
  return (
    <View style={styles.container}>
      <ProfileScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});