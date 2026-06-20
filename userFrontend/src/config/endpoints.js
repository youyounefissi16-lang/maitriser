import { API_BASE_URL } from './api';

export const ENDPOINTS = {
  MODULES:       `${API_BASE_URL}/api/modules`,
  QUIZZES:       `${API_BASE_URL}/api/quizzes`,
  ADMIN_QUIZZES: `${API_BASE_URL}/api/admin/quizzes`,
  BOOKS:         `${API_BASE_URL}/api/books`,
  CASES:         `${API_BASE_URL}/api/cases`,
  BOOKMARKS:     `${API_BASE_URL}/api/bookmarks`,
  VOICE_EXAMS:   `${API_BASE_URL}/api/voice-exams`,
  RESULTS:       `${API_BASE_URL}/api/results`,
  PROFILE:       `${API_BASE_URL}/api/users/profile`,
  CLERK_SYNC:    `${API_BASE_URL}/api/auth/clerk-sync`,
  ADMIN_CLAIM:   `${API_BASE_URL}/api/admin/claim`,
  CONTACT:       `${API_BASE_URL}/api/contact/submit`,
};
