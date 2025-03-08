export const getEmployeeToken = () => localStorage.getItem('employeeAuthToken');

export const getSystemTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getSpeed = async () => {
  const url =
    'https://webtracker.infoware.xyz/uploads/1f26df891fde44db8e703bcb312dd24f.jpg';

  const startTime = new Date().getTime();

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Network response was not ok');

  const blob = await response.blob();
  const endTime = new Date().getTime();

  const duration = (endTime - startTime) / 1000;
  const fileSizeInBits = blob.size * 8;
  const speed = fileSizeInBits / duration;

  return speed;
};
