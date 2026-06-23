const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

export const validatePassword = (value) => {
  if (!PASSWORD_REGEX.test(value)) {
    throw new Error('Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character');
  }
  return true;
};
