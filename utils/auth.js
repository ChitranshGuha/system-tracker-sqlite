const VALID_USERS = [
    { mobile: '9999999999', password: '123456', name: 'John', color: '#4f46e5' },
    { mobile: '8888888888', password: '123456', name: 'Alice', color: '#059669' },
    { mobile: '7777777777', password: '123456', name: 'Bob', color: '#dc2626' },
    { mobile: '6666666666', password: '123456', name: 'Emma', color: '#7c3aed' }
  ];
  
  export function login(mobile, password) {
    const user = VALID_USERS.find(u => u.mobile === mobile && u.password === password);
    if (user) {
      localStorage.setItem('loggedInUser', JSON.stringify(user));
      return { success: true };
    }
    return { success: false, message: 'Invalid mobile number or password' };
  }
  
  export function logout() {
    localStorage.removeItem('loggedInUser');
  }
  
  export function isLoggedIn() {
    return !!localStorage.getItem('loggedInUser');
  }
  
  export function getLoggedInUser() {
    const userString = localStorage.getItem('loggedInUser');
    return userString ? JSON.parse(userString) : null;
  }