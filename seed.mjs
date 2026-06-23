import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizapp';

const moduleSchema = new mongoose.Schema({
  name: String, year: Number, courses: [String],
}, { timestamps: true, versionKey: false });

const quizSchema = new mongoose.Schema({
  quizId: String, quizName: String,
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  year: Number, course: String,
  published: Boolean, explanation: String, timer: Number,
  question: {
    questionText: String, options: [String], correctAnswers: [String],
  },
}, { timestamps: true, versionKey: false });

const voiceExamSchema = new mongoose.Schema({
  title: String,
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  year: Number,
  clinicalCasePrompt: String,
  questions: [{ questionText: String, idealAnswer: String, criteria: [{ label: String, keywords: [String] }] }],
  images: [String],
}, { timestamps: true, versionKey: false });

const Module = mongoose.model('Module', moduleSchema);
const Quiz = mongoose.model('Quiz', quizSchema);
const VoiceExam = mongoose.model('VoiceExam', voiceExamSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await Module.deleteMany({}); await Quiz.deleteMany({}); await VoiceExam.deleteMany({});
  console.log('Cleared existing data');

  // ── Modules ──
  const modules = await Module.insertMany([
    { name: 'Cardiologie',             year: 3, courses: ['Insuffisance cardiaque', 'Troubles du rythme', 'HTA'] },
    { name: 'Pneumologie',             year: 3, courses: ['Asthme', 'BPCO', 'Pneumonies'] },
    { name: 'Gastro-entérologie',     year: 4, courses: ['Ulcère gastrique', 'Hépatites', 'Pancréatite'] },
    { name: 'Neurologie',              year: 4, courses: ['AVC', 'Épilepsie', 'Sclérose en plaques'] },
    { name: 'Pédiatrie',               year: 5, courses: ['Néonatologie', 'Infections pédiatriques', 'Croissance'] },
    { name: 'Médecine d\'urgence',    year: 6, courses: ['Détresse vitale', 'Traumatologie', 'Intoxications'] },
  ]);
  console.log(`Created ${modules.length} modules`);

  // ── Quizzes (QCM) ──
  const quizzes = await Quiz.insertMany([
    // Cardiology
    { quizId: 'Q001', quizName: 'Insuffisance cardiaque – Bases', moduleId: modules[0]._id, year: 3, course: 'Insuffisance cardiaque', published: true,
      question: { questionText: 'Quel est le traitement de première intention de l\'insuffisance cardiaque à fraction d\'éjection réduite ?', options: ['IEC / ARA II', 'Bêta-bloquants seuls', 'Diurétiques seuls', 'Digitaliques'], correctAnswers: ['IEC / ARA II'] } },
    { quizId: 'Q002', quizName: 'Troubles du rythme', moduleId: modules[0]._id, year: 3, course: 'Troubles du rythme', published: true,
      question: { questionText: 'Devant une fibrillation atriale récente non valvulaire, quel est le risque principal à prévenir ?', options: ['Accident vasculaire cérébral', 'Insuffisance rénale', 'Infarctus du myocarde', 'Embolie pulmonaire'], correctAnswers: ['Accident vasculaire cérébral'] } },
    // Pneumology
    { quizId: 'Q003', quizName: 'Asthme – Diagnostic', moduleId: modules[1]._id, year: 3, course: 'Asthme', published: true,
      question: { questionText: 'Quel examen est indispensable pour confirmer le diagnostic d\'asthme ?', options: ['EFR avec test de réversibilité', 'Radio thorax', 'Scanner thoracique', 'Gaz du sang'], correctAnswers: ['EFR avec test de réversibilité'] } },
    { quizId: 'Q004', quizName: 'BPCO – Stades', moduleId: modules[1]._id, year: 3, course: 'BPCO', published: true,
      question: { questionText: 'Quel stade de la BPCO correspond à un VEMS/CVF < 0,70 avec VEMS ≥ 80 % ?', options: ['STADE I (léger)', 'STADE II (modéré)', 'STADE III (sévère)', 'STADE IV (très sévère)'], correctAnswers: ['STADE I (léger)'] } },
    // Gastro
    { quizId: 'Q005', quizName: 'Ulcère gastrique – Prise en charge', moduleId: modules[2]._id, year: 4, course: 'Ulcère gastrique', published: true,
      question: { questionText: 'Quelle est la cause la plus fréquente d\'ulcère gastrique ?', options: ['Infection à Helicobacter pylori', 'AINS', 'Stress', 'Tabac'], correctAnswers: ['Infection à Helicobacter pylori'] } },
    // Neurology
    { quizId: 'Q006', quizName: 'AVC – Urgence', moduleId: modules[3]._id, year: 4, course: 'AVC', published: true,
      question: { questionText: 'Quelle est la fenêtre thérapeutique standard pour la thrombolyse dans l\'AVC ischémique ?', options: ['4 h 30', '6 h', '12 h', '24 h'], correctAnswers: ['4 h 30'] } },
    { quizId: 'Q007', quizName: 'Épilepsie – Traitement', moduleId: modules[3]._id, year: 4, course: 'Épilepsie', published: true,
      question: { questionText: 'Quel est le traitement de première intention d\'une crise d\'épilepsie généralisée tonicoclonique ?', options: ['Acide valproïque / Dépakine', 'Carbamazépine', 'Phénytoïne', 'Clonazépam'], correctAnswers: ['Acide valproïque / Dépakine'] } },
    // Pédiatrie
    { quizId: 'Q008', quizName: 'Néonatologie – Ictère', moduleId: modules[4]._id, year: 5, course: 'Néonatologie', published: true,
      question: { questionText: 'Quel est le seuil de bilirubine totale nécessitant une exsanguino-transfusion chez un nouveau-né à terme ?', options: ['> 350 µmol/L', '> 250 µmol/L', '> 450 µmol/L', '> 150 µmol/L'], correctAnswers: ['> 350 µmol/L'] } },
    // Urgence
    { quizId: 'Q009', quizName: 'Détresse vitale – Protocole', moduleId: modules[5]._id, year: 6, course: 'Détresse vitale', published: true,
      question: { questionText: 'Dans un arrêt cardiorespiratoire, quel est le rapport compression/ventilation recommandé ?', options: ['30/2', '15/2', '5/1', '30/5'], correctAnswers: ['30/2'] } },
    { quizId: 'Q010', quizName: 'Intoxication – Cyanure', moduleId: modules[5]._id, year: 6, course: 'Intoxications', published: true,
      question: { questionText: 'Quel est l\'antidote de l\'intoxication au cyanure ?', options: ['Hydroxocobalamine', 'Naloxone', 'Flumazénil', 'Vitamine K'], correctAnswers: ['Hydroxocobalamine'] } },
  ]);
  console.log(`Created ${quizzes.length} quizzes`);

  // ── Voice (Oral) Exams ──
  const voiceExams = await VoiceExam.insertMany([
    {
      title: 'Cas clinique – Insuffisance cardiaque',
      moduleId: modules[0]._id, year: 3,
      clinicalCasePrompt: 'Patient de 68 ans, dyspnée d\'effort progressive, œdèmes des membres inférieurs. À l\'examen : crépitants bases pulmonaires, turgescence jugulaire, hépatomégalie. TA 145/90, FC 92.',
      questions: [
        { questionText: 'Quels sont les signes cliniques d\'insuffisance cardiaque gauche ?', idealAnswer: 'Dyspnée, orthopnée, crépitants pulmonaires.', criteria: [{ label: 'Dyspnée', keywords: ['dyspnée', 'dyspnee'] }, { label: 'Crépitants', keywords: ['crépitants', 'crepitants'] }] },
        { questionText: 'Quel examen complémentaire demandez-vous en première intention ?', idealAnswer: 'Échocardiographie transthoracique (ETT) avec mesure de la FEVG.', criteria: [{ label: 'Échographie cardiaque', keywords: ['échocardiographie', 'echocardiographie', 'ETT', 'FEVG', 'fraction éjection'] }] },
      ], images: [],
    },
    {
      title: 'Cas clinique – BPCO décompensée',
      moduleId: modules[1]._id, year: 3,
      clinicalCasePrompt: 'Patient de 72 ans, tabagique à 45 PA, hospitalisé pour dyspnée aiguë. FR 28/min, SpO2 86 % à l\'air ambiant. Gaz du sang : pH 7,32, PaCO2 58 mmHg, PaO2 52 mmHg, HCO3- 28 mmol/L.',
      questions: [
        { questionText: 'Interprétez les gaz du sang.', idealAnswer: 'Acidose respiratoire décompensée sur insuffisance respiratoire chronique.', criteria: [{ label: 'Acidose respiratoire', keywords: ['acidose', 'respiratoire', 'pH', 'PaCO2'] }, { label: 'Décompensation', keywords: ['décompensée', 'decompensee', 'chronique'] }] },
        { questionText: 'Quelle oxygénothérapie préconisez-vous ?', idealAnswer: 'Oxygénothérapie à faible débit (1-2 L/min) avec objectif SpO2 88-92 %, surveiller la capnie.', criteria: [{ label: 'Faible débit', keywords: ['faible', '1', '2 L', 'bas débit'] }, { label: 'Objectif SpO2', keywords: ['88', '92', 'SpO2'] }] },
      ], images: [],
    },
    {
      title: 'Cas clinique – AVC ischémique',
      moduleId: modules[3]._id, year: 4,
      clinicalCasePrompt: 'Patient de 55 ans, hypertendu connu, présente une hémiplégie droite et une aphasie depuis 2 heures. NIHSS 14. Pas de contre-indication à la thrombolyse.',
      questions: [
        { questionText: 'Quelle est votre prise en charge immédiate ?', idealAnswer: 'Thrombolyse IV par altéplase après confirmation par TDM cérébrale sans injection (éliminer hémorragie).', criteria: [{ label: 'Thrombolyse', keywords: ['thrombolyse', 'altéplase', 'thrombolyse'] }, { label: 'TDM', keywords: ['TDM', 'scanner', 'cérébrale'] }] },
        { questionText: 'Quels sont les critères d\'exclusion de la thrombolyse ?', idealAnswer: 'Hémorragie intracrânienne, AVC grave (NIHSS > 25), symptômes > 4h30, TAC élevée, chirurgie récente.', criteria: [{ label: 'Hémorragie', keywords: ['hémorragie', 'hemorragie'] }, { label: 'Délai', keywords: ['4h30', '4 h', 'délai', 'delai'] }] },
      ], images: [],
    },
    {
      title: 'Cas clinique – Pancréatite aiguë',
      moduleId: modules[2]._id, year: 4,
      clinicalCasePrompt: 'Femme 45 ans, douleur épigastrique transfixiante depuis 48 h, vomissements. ATCD : lithiase vésiculaire. Lipase à 850 UI/L. CRP à 180 mg/L.',
      questions: [
        { questionText: 'Quels sont les critères de gravité de la pancréatite aiguë ?', idealAnswer: 'Score de Ranson (à 48h), IGS II, présence de coulées de nécrose au scanner.', criteria: [{ label: 'Score Ranson', keywords: ['Ranson', 'score'] }, { label: 'Nécrose', keywords: ['nécrose', 'necrose', 'coulées', 'coulees'] }] },
        { questionText: 'Quel traitement étiologique envisagez-vous ?', idealAnswer: 'Traitement conservateur puis cholécystectomie différée si lithiase vésiculaire confirmée.', criteria: [{ label: 'Chirurgie', keywords: ['cholécystectomie', 'cholecystectomie'] }, { label: 'Lithiase', keywords: ['lithiase', 'vésiculaire', 'vesiculaire'] }] },
      ], images: [],
    },
    {
      title: 'Cas clinique – Méningite bactérienne',
      moduleId: modules[4]._id, year: 5,
      clinicalCasePrompt: 'Enfant 3 ans, fièvre 39,5°C depuis 24 h, vomissements, raideur de nuque. Purpura aux membres inférieurs. Hémodynamique instable.',
      questions: [
        { questionText: 'Quelle est votre conduite à tenir immédiate ?', idealAnswer: 'Antibiothérapie probabiliste (C3G) + corticoïdes + PL après stabilisation, prévenir les signes de choc.', criteria: [{ label: 'Antibiothérapie', keywords: ['antibiotique', 'C3G', 'céphalosporine', 'ceftriaxone'] }, { label: 'Corticoïdes', keywords: ['corticoïdes', 'corticoides', 'dexaméthasone', 'dexamethasone'] }] },
        { questionText: 'Devant un purpura extensif, quelle est l\'urgence ?', idealAnswer: 'Suspicion de méningococcémie — antibiothérapie IV immédiate sans attendre la PL, remplissage, transfert en réanimation.', criteria: [{ label: 'Urgence vitale', keywords: ['méningococcémie', 'meningococemie', 'réanimation', 'reanimation'] }, { label: 'Antibiothérapie', keywords: ['antibiotique', 'immédiat', 'immediat', 'IV'] }] },
      ], images: [],
    },
    {
      title: 'Cas clinique – Arrêt cardiorespiratoire',
      moduleId: modules[5]._id, year: 6,
      clinicalCasePrompt: 'Homme 60 ans, effondré dans la rue. Inconscient, ne respire pas. Rythme en fibrillation ventriculaire au monitorage.',
      questions: [
        { questionText: 'Décrivez la procédure de réanimation.', idealAnswer: 'Appel au 15, RCP 30/2, DEA, choc dès que possible (200 J), puis adrénaline 1 mg/3-5 min, chercher cause réversible.', criteria: [{ label: 'Choc', keywords: ['choc', 'défibrillation', 'defibrillation', 'DEA', '200 J'] }, { label: 'Adrénaline', keywords: ['adrénaline', 'adrenaline', '1 mg'] }] },
        { questionText: 'Quelles causes réversibles recherchez-vous (4H/4T) ?', idealAnswer: 'Hypoxie, Hypovolémie, Hyper/Hypokaliémie, Hypothermie — Tension pneumothorax, Tamponnade, Toxiques, Thrombose coronaire/pulmonaire.', criteria: [{ label: 'Hypo', keywords: ['Hypoxie', 'Hypovolémie', 'Hypovolemie', 'Hypothermie'] }, { label: 'Thrombose', keywords: ['Thrombose', 'coronaire', 'pulmonaire', 'IDM', 'embolie'] }] },
      ], images: [],
    },
  ]);
  console.log(`Created ${voiceExams.length} voice exams`);

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
