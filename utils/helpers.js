import { API_BASE_URL } from './constants';

export const getEmployeeToken = () => localStorage.getItem('employeeAuthToken');

export const getSystemTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getSpeed = async () => {
  const url = `${API_BASE_URL}/public/sample-files/image.jpg`;

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
