export const showNotification = async (title: string) => {
  const result = await Notification.requestPermission();
  new Notification(title);
};
