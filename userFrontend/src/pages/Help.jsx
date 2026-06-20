import React from 'react';
import '../styles/pagesStyle/help.css';
import '../styles/teal-theme.css';

const HelpPage = () => {
  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card-teal" style={{ maxWidth: '720px' }}>
      <h1 className="help-heading">Aide et Support</h1>

      <section className="section">
        <h2>Comment jouer</h2>
        <p className='text'>Pour commencer, sélectionnez une spécialité et choisissez votre niveau. Une fois prêt, cliquez sur "Commencer" et répondez aux questions. Vous pouvez sélectionner une ou plusieurs réponses selon la question. Après avoir soumis le QCM, votre score s'affichera.</p>
      </section>

      <section className="section">
        <h2>Système de notation</h2>
        <p className='text'>Vous obtenez des points pour chaque réponse correcte. Il n'y a pas de pénalité pour les réponses incorrectes. Votre score final est affiché à la fin de chaque QCM. Un minuteur vous aide à gérer votre temps.</p>
      </section>

      <section className="section">
        <h2>Examens Oraux</h2>
        <p className='text'>La fonction d'examen oral vous permet de pratiquer des cas cliniques. Enregistrez votre réponse vocale, qui sera transcrite et comparée à la réponse modèle. Vous pouvez choisir entre le mode Pratique (feedback immédiat) et le mode Examen (score à la fin).</p>
      </section>

      <section className="section">
        <h2>Questions fréquentes</h2>
        <ul>
          <li className='text'><strong>Comment réinitialiser mon score ?</strong> Le score et l'historique ne peuvent pas être réinitialisés.</li>
          <li className='text'><strong>Comment contacter le support ?</strong> Vous pouvez nous contacter par email à support@quizapp.com.</li>
        </ul>
      </section>

      <section className="section">
        <h2>Contacter le support</h2>
        <p className='text'>Si vous avez des problèmes ou des questions, n'hésitez pas à nous contacter à <a href="mailto:support@quizapp.com">support@quizapp.com</a>.</p>
      </section>
      </div>
    </div>
  );
};

export default HelpPage;
