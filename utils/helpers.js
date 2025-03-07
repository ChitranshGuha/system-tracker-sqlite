export const getEmployeeToken = () => localStorage.getItem('employeeAuthToken');

export const getSystemTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getSpeed = async () => {
  const url =
    'https://omnichannel.infoware.xyz/uploads/f01cca18169d4308b2dc801a7bd2c97e.jpg';

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
