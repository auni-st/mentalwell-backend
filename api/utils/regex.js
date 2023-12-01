const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
const phoneRegex = /^\d{1,13}$/;

module.exports = { emailRegex, passwordRegex, phoneRegex }
