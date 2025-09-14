// services/notification/notificationService.js - Service de notifications (version démo)

class NotificationService {
  showIncomingMessage(senderName, messageText) {
    console.log(`Notification: ${senderName} - ${messageText}`);
    // En production, utiliser expo-notifications ou react-native-push-notification
  }

  requestPermissions() {
    return Promise.resolve(true);
  }
}

export const notificationService = new NotificationService();