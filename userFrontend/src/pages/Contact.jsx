import React, { useState } from 'react';
import { API_BASE_URL } from '../config/api';
import '../styles/pagesStyle/contact.css';
import '../styles/teal-theme.css';
import axios from 'axios';

const ContactPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { name, email, message } = formData;
    const newErrors = {};
    if (!name) newErrors.name = 'Le nom est requis';
    if (!email) newErrors.email = 'L\'email est requis';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'L\'email est invalide';
    if (!message) newErrors.message = 'Le message est requis';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const response = await axios.post(`${API_BASE_URL}/api/contact/submit`, formData);
        if (response.status === 200 || response.status === 201) {
          setSuccessMessage('Votre message a été envoyé avec succès !');
          setFormData({ name: '', email: '', message: '' });
          setErrors({});
        } else {
          setSuccessMessage('Échec de l\'envoi du message.');
        }
      } catch {
        setSuccessMessage('Une erreur est survenue lors de l\'envoi du message.');
      } finally {
        setLoading(false);
      }
    } else {
      setErrors(newErrors);
      setSuccessMessage('');
    }
  };

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div className="card-teal" style={{ maxWidth: '600px' }}>
      <h2 style={{ marginBottom: '24px' }}>Nous Contacter</h2>
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Nom :</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
          {errors.name && <p className="error">{errors.name}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="email">Email :</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="message">Message :</label>
          <textarea id="message" name="message" value={formData.message} onChange={handleChange} required />
          {errors.message && <p className="error">{errors.message}</p>}
        </div>
        <button type="submit" className="submit-button" disabled={loading}>{loading ? 'Envoi en cours…' : 'Envoyer le message'}</button>
        {successMessage && <p className="success">{successMessage}</p>}
      </form>
      </div>
    </div>
  );
};

export default ContactPage;
