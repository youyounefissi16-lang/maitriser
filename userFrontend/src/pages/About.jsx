import React from 'react';
import '../styles/pagesStyle/About.css';
import '../styles/teal-theme.css';

const AboutPage = () => {
  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card-teal" style={{ maxWidth: '720px' }}>
        <h1 className="about-heading">À propos de Quiz App</h1>
        <p className="about-paragraph">
          Bienvenue sur notre application Quiz ! Cette application est conçue pour rendre l'apprentissage amusant et engageant en testant vos connaissances sur divers sujets. Que vous soyez un étudiant préparant des examens, un passionné de culture générale ou quelqu'un qui aime les défis, notre application Quiz offre une façon interactive d'apprendre et de progresser.
        </p>
        <h3 className="features-heading">Fonctionnalités principales :</h3>
        <ul className="features-list">
          <li>🎯 Plusieurs catégories au choix</li>
          <li>⏱️ QCM chronométrés pour plus de défi</li>
          <li>📈 Suivez vos scores et vos progrès</li>
          <li>🧠 Questions de différents niveaux de difficulté</li>
          <li>🔗 Option de partager vos résultats avec vos amis</li>
        </ul>
        <p className="about-paragraph">
          Notre mission est de fournir une plateforme où l'apprentissage rencontre le divertissement, garantissant aux utilisateurs de profiter de leur parcours tout en acquérant de nouvelles connaissances. Restez curieux, continuez à vous entraîner et voyez comment vous vous comparez aux autres !
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
