import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/legal.css';

const TermsPage = () => {
  const { t } = useTranslation();
  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card-teal legal-page">
        <h1 className="legal-heading">{t('terms.title', 'Conditions d\'utilisation')}</h1>
        <p className="legal-updated">Dernière mise à jour : Juin 2026</p>

        <section className="legal-section">
          <h2>1. Acceptation des conditions</h2>
          <p>En accédant et en utilisant MAITRISEZ, vous acceptez d'être lié par les présentes conditions d'utilisation.</p>
        </section>

        <section className="legal-section">
          <h2>2. Description du service</h2>
          <p>MAITRISEZ est une plateforme éducative destinée aux étudiants en médecine, proposant des QCM, des examens oraux, des études de cas et des ressources documentaires.</p>
        </section>

        <section className="legal-section">
          <h2>3. Compte utilisateur</h2>
          <p>Vous êtes responsable de la confidentialité de votre compte et de votre mot de passe. Vous devez nous informer immédiatement de toute utilisation non autorisée.</p>
        </section>

        <section className="legal-section">
          <h2>4. Propriété intellectuelle</h2>
          <p>Tout le contenu présent sur MAITRISEZ est protégé par les droits d'auteur. Vous ne pouvez pas reproduire, distribuer ou créer des œuvres dérivées sans autorisation.</p>
        </section>

        <section className="legal-section">
          <h2>5. Limitation de responsabilité</h2>
          <p>MAITRISEZ ne peut être tenu responsable des dommages indirects résultant de l'utilisation de la plateforme.</p>
        </section>

        <section className="legal-section">
          <h2>6. Contact</h2>
          <p>Pour toute question concernant ces conditions, contactez-nous à support@maitrisez.com.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
