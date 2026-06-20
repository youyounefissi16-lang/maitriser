import mongoose from 'mongoose';
import Module from './models/moduleModel.js';
import Quiz from './models/quizModel.js';
import VoiceExam from './models/voiceExamModel.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/QuizApp';

const modules = [
  // Year 1
  { name: 'Anatomie', year: 1, courses: ['Anatomie générale', 'Anatomie des membres', 'Anatomie du thorax'] },
  { name: 'Biochimie', year: 1, courses: ['Biochimie structurale', 'Enzymologie', 'Métabolismes'] },
  { name: 'Biophysique', year: 1, courses: ['Biophysique des membranes', 'Radiations', 'Biomécanique'] },
  { name: 'Histologie', year: 1, courses: ['Histologie générale', 'Histologie spéciale', 'Embryologie'] },
  // Year 2
  { name: 'Physiologie', year: 2, courses: ['Physiologie cardiovasculaire', 'Physiologie respiratoire', 'Physiologie rénale'] },
  { name: 'Microbiologie', year: 2, courses: ['Bactériologie', 'Virologie', 'Parasitologie'] },
  { name: 'Immunologie', year: 2, courses: ['Immunité innée', 'Immunité adaptative', 'Immunopathologie'] },
  { name: 'Sémiologie', year: 2, courses: ['Sémiologie cardiovasculaire', 'Sémiologie digestive', 'Sémiologie neurologique'] },
  // Year 3
  { name: 'Pharmacologie', year: 3, courses: ['Pharmacocinétique', 'Pharmacodynamie', 'Pharmacovigilance'] },
  { name: 'Anatomopathologie', year: 3, courses: ['Pathologie générale', 'Pathologie tumorale', 'Pathologie inflammatoire'] },
  { name: 'Radiologie', year: 3, courses: ['Radioanatomie', 'Imagerie thoracique', 'Imagerie ostéoarticulaire'] },
  // Year 4
  { name: 'Médecine Interne', year: 4, courses: ['Hépato-gastro-entérologie', 'Néphrologie', 'Rhumatologie'] },
  { name: 'Pédiatrie', year: 4, courses: ['Pédiatrie générale', 'Néonatologie', 'Urgences pédiatriques'] },
  { name: 'Chirurgie Générale', year: 4, courses: ['Chirurgie digestive', 'Chirurgie orthopédique', 'Chirurgie vasculaire'] },
  // Year 5
  { name: 'Cardiologie', year: 5, courses: ['Cardiopathies ischémiques', 'Insuffisance cardiaque', 'Troubles du rythme'] },
  { name: 'Neurologie', year: 5, courses: ['Pathologies vasculaires cérébrales', 'Épilepsie', 'Maladies neurodégénératives'] },
  { name: 'Oncologie', year: 5, courses: ['Cancérogenèse', 'Chimiothérapie', 'Radiothérapie'] },
  // Year 6
  { name: 'Réanimation', year: 6, courses: ['Réanimation cardiovasculaire', 'Réanimation respiratoire', 'Sédation'] },
  { name: 'Urgences', year: 6, courses: ['Urgences médicales', 'Urgences chirurgicales', 'Urgences traumatologiques'] },
  { name: 'Éthique Médicale', year: 6, courses: ['Droits des patients', 'Consentement éclairé', 'Fin de vie'] },
  // Year 7
  { name: 'Préparation Internat', year: 7, courses: ['Synthèse cardiovasculaire', 'Synthèse neurologique', 'Synthèse infectieuse'] },
];

const quizzes = [
  // Year 1 — Anatomie
  { quizId: 'Q001', year: 1, moduleName: 'Anatomie', course: 'Anatomie générale',
    questionText: 'Quel est le nombre total d\'os dans le corps humain adulte ?',
    options: ['106', '206', '306', '406'], correctAnswers: ['206'], explanation: 'Le squelette adulte comprend 206 os.' },
  { quizId: 'Q002', year: 1, moduleName: 'Anatomie', course: 'Anatomie des membres',
    questionText: 'Quel est l\'os le plus long du corps humain ?',
    options: ['Fémur', 'Humérus', 'Tibia', 'Radius'], correctAnswers: ['Fémur'], explanation: 'Le fémur est l\'os le plus long, mesurant environ 50 cm.' },
  { quizId: 'Q003', year: 1, moduleName: 'Anatomie', course: 'Anatomie du thorax',
    questionText: 'Combien de côtes le thorax humain comporte-t-il normalement ?',
    options: ['10 paires', '11 paires', '12 paires', '13 paires'], correctAnswers: ['12 paires'], explanation: 'Il y a 12 paires de côtes.' },
  // Year 1 — Biochimie
  { quizId: 'Q004', year: 1, moduleName: 'Biochimie', course: 'Biochimie structurale',
    questionText: 'Quel est le glucide le plus abondant dans le sang ?',
    options: ['Fructose', 'Galactose', 'Glucose', 'Saccharose'], correctAnswers: ['Glucose'], explanation: 'La glycémie normale est maintenue par le glucose.' },
  { quizId: 'Q005', year: 1, moduleName: 'Biochimie', course: 'Enzymologie',
    questionText: 'Quel organe produit principalement les enzymes digestives ?',
    options: ['Foie', 'Pancréas', 'Estomac', 'Intestin grêle'], correctAnswers: ['Pancréas'], explanation: 'Le pancréas exocrine sécrète les enzymes digestives.' },
  // Year 2 — Physiologie
  { quizId: 'Q006', year: 2, moduleName: 'Physiologie', course: 'Physiologie cardiovasculaire',
    questionText: 'Quel est le volume d\'éjection systolique normal du cœur gauche ?',
    options: ['50 mL', '70 mL', '90 mL', '110 mL'], correctAnswers: ['70 mL'], explanation: 'Le VES est d\'environ 70 mL au repos.' },
  { quizId: 'Q007', year: 2, moduleName: 'Physiologie', course: 'Physiologie respiratoire',
    questionText: 'Quel est le principal muscle inspiratoire ?',
    options: ['Diaphragme', 'Intercostaux externes', 'Scalènes', 'Grand pectoral'], correctAnswers: ['Diaphragme'], explanation: 'Le diaphragme assure 70 % de l\'inspiration.' },
  // Year 2 — Microbiologie
  { quizId: 'Q008', year: 2, moduleName: 'Microbiologie', course: 'Bactériologie',
    questionText: 'Quel antibiotique cible la paroi bactérienne ?',
    options: ['Tétracycline', 'Pénicilline', 'Érythromycine', 'Ciprofloxacine'], correctAnswers: ['Pénicilline'], explanation: 'Les β-lactamines inhibent la synthèse du peptidoglycane.' },
  // Year 3 — Pharmacologie
  { quizId: 'Q009', year: 3, moduleName: 'Pharmacologie', course: 'Pharmacocinétique',
    questionText: 'Quel est le principal organe du métabolisme des médicaments ?',
    options: ['Rein', 'Foie', 'Poumon', 'Cœur'], correctAnswers: ['Foie'], explanation: 'Le foie assure le métabolisme de phase I et II.' },
  { quizId: 'Q010', year: 3, moduleName: 'Pharmacologie', course: 'Pharmacodynamie',
    questionText: 'Que signifie la CI50 d\'un médicament ?',
    options: ['Concentration inhibitrice 50%', 'Coefficient d\'innocuité 50%', 'Capacité d\'intégration 50%', 'Concentration idéale 50%'],
    correctAnswers: ['Concentration inhibitrice 50%'], explanation: 'La CI50 est la concentration qui inhibe 50 % de l\'activité cible.' },
  // Year 3 — Anatomopathologie
  { quizId: 'Q011', year: 3, moduleName: 'Anatomopathologie', course: 'Pathologie tumorale',
    questionText: 'Quel est le critère microscopique essentiel de la malignité ?',
    options: ['Anisocaryose', 'Nécrose', 'Fibrose', 'Œdème'], correctAnswers: ['Anisocaryose'], explanation: 'L\'anisocaryose (noyaux de taille variable) est un signe de malignité.' },
  // Year 4 — Médecine Interne
  { quizId: 'Q012', year: 4, moduleName: 'Médecine Interne', course: 'Hépato-gastro-entérologie',
    questionText: 'Quel est le principal facteur de risque du carcinome hépatocellulaire ?',
    options: ['Hépatite B', 'Stéatose hépatique', 'Cirrhose', 'Hémochromatose'],
    correctAnswers: ['Cirrhose'], explanation: 'La cirrhose, quelle qu\'en soit la cause, est le principal facteur de risque.' },
  { quizId: 'Q013', year: 4, moduleName: 'Médecine Interne', course: 'Néphrologie',
    questionText: 'Quel est le seuil de définition de l\'insuffisance rénale chronique (DFG) ?',
    options: ['< 90 mL/min', '< 60 mL/min', '< 30 mL/min', '< 15 mL/min'],
    correctAnswers: ['< 60 mL/min'], explanation: 'Un DFG < 60 mL/min/1.73m² pendant > 3 mois définit l\'IRC.' },
  // Year 4 — Pédiatrie
  { quizId: 'Q014', year: 4, moduleName: 'Pédiatrie', course: 'Néonatologie',
    questionText: 'Quel est le score d\'Apgar normal à 1 minute ?',
    options: ['5-6', '7-8', '7-10', '10-12'], correctAnswers: ['7-10'], explanation: 'Un score ≥ 7 est considéré comme normal.' },
  // Year 5 — Cardiologie
  { quizId: 'Q015', year: 5, moduleName: 'Cardiologie', course: 'Cardiopathies ischémiques',
    questionText: 'Quel est le traitement de première intention de l\'infarctus du myocarde ST+ ?',
    options: ['Angioplastie primaire', 'Thrombolyse', 'Pontage aorto-coronarien', 'Traitement médical seul'],
    correctAnswers: ['Angioplastie primaire'], explanation: 'L\'angioplastie primaire dans les 90 min est le gold standard.' },
  { quizId: 'Q016', year: 5, moduleName: 'Cardiologie', course: 'Troubles du rythme',
    questionText: 'Quel antiarythmique est utilisé en première intention dans la fibrillation atriale ?',
    options: ['Amiodarone', 'Flécaïnide', 'Bêta-bloquant', 'Digoxine'],
    correctAnswers: ['Bêta-bloquant'], explanation: 'Les bêta-bloquants sont la 1ère ligne pour le contrôle de la fréquence.' },
  // Year 5 — Neurologie
  { quizId: 'Q017', year: 5, moduleName: 'Neurologie', course: 'Pathologies vasculaires cérébrales',
    questionText: 'Quelle est la fenêtre thérapeutique de la thrombolyse dans l\'AVC ischémique ?',
    options: ['1h30', '3h', '4h30', '6h'], correctAnswers: ['4h30'], explanation: 'La thrombolyse peut être administrée jusqu\'à 4h30 après le début des symptômes.' },
  // Year 6 — Réanimation
  { quizId: 'Q018', year: 6, moduleName: 'Réanimation', course: 'Réanimation cardiovasculaire',
    questionText: 'Quel est le rapport compression/ventilation en RCP adulte ?',
    options: ['15:2', '30:2', '15:1', '30:1'], correctAnswers: ['30:2'], explanation: 'Le rapport est de 30 compressions pour 2 insufflations.' },
  { quizId: 'Q019', year: 6, moduleName: 'Réanimation', course: 'Réanimation respiratoire',
    questionText: 'Quel mode ventilatoire est recommandé en première intention en SDRA ?',
    options: ['Ventilation contrôlée en volume', 'Ventilation protectrice (6 mL/kg)', 'Ventilation en pression', 'Ventilation spontanée'],
    correctAnswers: ['Ventilation protectrice (6 mL/kg)'], explanation: 'La ventilation protectrice réduit la mortalité dans le SDRA.' },
  // Year 6 — Urgences
  { quizId: 'Q020', year: 6, moduleName: 'Urgences', course: 'Urgences médicales',
    questionText: 'Quel est le premier geste devant un malaise hypoglycémique chez un patient conscient ?',
    options: ['Injection d\'insuline', 'Resucrage oral', 'Glucagon IM', 'Hospitalisation'],
    correctAnswers: ['Resucrage oral'], explanation: 'L\'administration de sucre par voie orale est le premier geste.' },
  // Year 7 — Préparation Internat
  { quizId: 'Q021', year: 7, moduleName: 'Préparation Internat', course: 'Synthèse cardiovasculaire',
    questionText: 'Dans l\'insuffisance cardiaque à fraction d\'éjection réduite, quel traitement a prouvé une réduction de la mortalité ?',
    options: ['IEC + Bêta-bloquant + ARM', 'Diurétiques seuls', 'Digitale seule', 'Antagonistes calciques'],
    correctAnswers: ['IEC + Bêta-bloquant + ARM'], explanation: 'La trithérapie IEC/BB/ARM est le standard thérapeutique.' },
  { quizId: 'Q022', year: 7, moduleName: 'Préparation Internat', course: 'Synthèse infectieuse',
    questionText: 'Quel est le traitement probabiliste de la pneumonie aiguë communautaire ?',
    options: ['Amoxicilline 1g x3/j', 'Amoxicilline-acide clavulanique', 'Ceftriaxone + spiramycine', 'Lévofloxacine'],
    correctAnswers: ['Amoxicilline 1g x3/j'], explanation: 'L\'amoxicilline est le traitement de 1ère intention de la PAC.' },
];

const voiceExams = [
  // Year 1-2: Basic sciences
  { title: 'Cas clinique : Douleur thoracique', year: 1, moduleName: 'Anatomie',
    clinicalCasePrompt: 'Patient de 55 ans, homme, se présente aux urgences pour une douleur thoracique rétrosternale constrictive évoluant depuis 2 heures. Il est pâle, diaphorétique. PA: 90/60, FC: 110/min.\n\nDécrivez votre prise en charge initiale.',
    questions: [
      { questionText: 'Quels sont les diagnostics différentiels à évoquer en priorité ?',
        idealAnswer: 'Infarctus du myocarde, embolie pulmonaire, dissection aortique, péricardite aiguë, pneumothorax.',
        criteria: [
          { label: 'Syndrome coronarien aigu évoqué', keywords: ['infarctus', 'coronarien', 'SCA', 'IDM'] },
          { label: 'Embolie pulmonaire citée', keywords: ['embolie', 'pulmonaire'] },
          { label: 'Dissection aortique citée', keywords: ['dissection', 'aortique'] },
        ]},
      { questionText: 'Quel examen complémentaire réalisez-vous en urgence ?',
        idealAnswer: 'ECG 12 dérivations dans les 10 minutes, dosage de la troponinémie, radiographie thoracique, NFS, CRP, bilan rénal.',
        criteria: [
          { label: 'ECG urgent', keywords: ['ECG', 'électrocardiogramme'] },
          { label: 'Troponine demandée', keywords: ['troponine'] },
          { label: 'Radiographie thoracique', keywords: ['radiographie', 'thorax', 'RX'] },
        ]},
    ]},
  // Year 3: Pharmacology
  { title: 'Cas clinique : Prescription médicamenteuse', year: 3, moduleName: 'Pharmacologie',
    clinicalCasePrompt: 'Femme de 72 ans, polymédiquée, hospitalisée pour confusion. Traitement habituel : Ramipril 5mg, Metformine 850mg, Oméprazole 20mg, Acide acétylsalicylique 75mg, Simvastatine 20mg. Bilan : créatinine 120 µmol/L, kaliémie 5.8 mmol/L, glycémie 3.2 mmol/L.\n\nAnalysez la situation et proposez une prise en charge.',
    questions: [
      { questionText: 'Quelles sont les anomalies biologiques à corriger en urgence ?',
        idealAnswer: 'Hypoglycémie (glycémie 3.2) et hyperkaliémie (kaliémie 5.8). L\'hypoglycémie peut être due à la metformine + âge + insuffisance rénale. L\'hyperkaliémie peut être due au Ramipril (IEC) sur insuffisance rénale.',
        criteria: [
          { label: 'Hypoglycémie identifiée', keywords: ['hypoglycémie', 'glycémie', '3.2'] },
          { label: 'Hyperkaliémie identifiée', keywords: ['hyperkaliémie', 'kaliémie', '5.8'] },
          { label: 'IEC lié à l\'hyperkaliémie', keywords: ['IEC', 'ramipril', 'kaliémie'] },
        ]},
    ]},
  // Year 4: Internal medicine
  { title: 'Cas clinique : Syndrome occlusif', year: 4, moduleName: 'Médecine Interne',
    clinicalCasePrompt: 'Patient de 68 ans, sans antécédent chirurgical, se présente pour des douleurs abdominales diffuses, arrêt des matières et des gaz depuis 48h, nausées. À l\'examen : abdomen distendu, tympanique, douloureux diffusément. T° 38.2°C, FC 100/min.\n\nQuel est votre diagnostic et votre prise en charge ?',
    questions: [
      { questionText: 'Quels examens d\'imagerie demandez-vous en première intention ?',
        idealAnswer: 'ASP (abdomen sans préparation) debout et couché, et/ou TDM abdominal avec injection. L\'ASP recherche des niveaux hydro-aériques. Le TDM est plus sensible pour identifier la cause et rechercher des signes de gravité.',
        criteria: [
          { label: 'ASP demandé', keywords: ['ASP', 'abdomen sans préparation'] },
          { label: 'TDM abdominal demandé', keywords: ['TDM', 'scanner', 'tomodensitométrie'] },
          { label: 'Recherche de signes de gravité', keywords: ['gravité', 'complication', 'perforation'] },
        ]},
      { questionText: 'Quels critères cliniques indiquent une urgence chirurgicale ?',
        idealAnswer: 'Signes de choc (hypotension, tachycardie), fièvre élevée, défense ou contracture abdominale, douleur violente d\'installation brutale, suspicion de péritonite ou d\'ischémie intestinale.',
        criteria: [
          { label: 'Signes de choc mentionnés', keywords: ['choc', 'hypotension', 'tachycardie'] },
          { label: 'Contracture/défense citée', keywords: ['contracture', 'défense', 'péritonite'] },
        ]},
    ]},
  // Year 5: Cardiology
  { title: 'Cas clinique : Insuffisance cardiaque décompensée', year: 5, moduleName: 'Cardiologie',
    clinicalCasePrompt: 'Patient de 78 ans, connu pour insuffisance cardiaque à fraction d\'éjection réduite (FEVG 35%), se présente pour dyspnée d\'aggravation progressive depuis 5 jours, orthopnée, œdèmes des membres inférieurs. TA 150/90, FC 95/min, SpO2 88% en air ambiant.\n\nDécrivez votre prise en charge diagnostique et thérapeutique.',
    questions: [
      { questionText: 'Quels examens complémentaires réalisez-vous en urgence ?',
        idealAnswer: 'BNP ou NT-proBNP, NFS, CRP, ionogramme sanguin, créatininémie, troponine, ECG, radiographie thoracique, échocardiographie transthoracique.',
        criteria: [
          { label: 'BNP/NT-proBNP demandé', keywords: ['BNP', 'NT-proBNP', 'peptide'] },
          { label: 'Échocardiographie demandée', keywords: ['échocardiographie', 'échographie', 'ETT'] },
          { label: 'Bilan biologique standard', keywords: ['ionogramme', 'créatinine', 'NFS'] },
        ]},
      { questionText: 'Quel traitement instaurez-vous ?',
        idealAnswer: 'Oxygénothérapie pour SpO2 > 90%, diurétiques de l\'anse (furosémide IV), vasodilatateurs si hypertensive, voire inotropes si bas débit. Relais par IEC, bêta-bloquants et ARM après stabilisation.',
        criteria: [
          { label: 'Oxygénothérapie', keywords: ['oxygène', 'O2', 'oxygénothérapie'] },
          { label: 'Diurétique IV prescrit', keywords: ['furosémide', 'diurétique', 'lasilix'] },
          { label: 'Traitement de fond après stabilisation', keywords: ['IEC', 'bêta-bloquant', 'ARM'] },
        ]},
    ]},
  // Year 6: Emergency
  { title: 'Cas clinique : Polytraumatisé', year: 6, moduleName: 'Urgences',
    clinicalCasePrompt: 'Patient de 30 ans, victime d\'un accident de la voie publique (véhicule léger, choc frontal à 80 km/h). À l\'arrivée : GCS 13, TA 80/50, FC 130/min, FR 30/min, saturation 91%. Lésions apparentes : déformation du fémur gauche, plaie du cuir chevelu.\n\nQuelle est votre prise en charge immédiate ?',
    questions: [
      { questionText: 'Quelle est la priorité de prise en charge selon le damage control ?',
        idealAnswer: 'L\'hémodynamique est la priorité (choc hémorragique). Appliquer le protocole du damage control : contrôle de l\'hémorragie externe, remplissage vasculaire restrictif, activation du protocole de transfusion massive, puis bilan lésionnel rapide (Fast-echo, TDM corps entier).',
        criteria: [
          { label: 'Reconnaissance du choc hémorragique', keywords: ['choc', 'hémorragique', 'hypotension', 'tachycardie'] },
          { label: 'Damage control cité', keywords: ['damage control', 'contrôle'] },
          { label: 'Transfusion massive évoquée', keywords: ['transfusion', 'massive'] },
        ]},
    ]},
  // Year 7: Intern prep — Complex case
  { title: 'Cas clinique : Polypathologique complexe', year: 7, moduleName: 'Préparation Internat',
    clinicalCasePrompt: 'Femme de 82 ans, autonomie réduite (GIR 3), hospitalisée pour altération de l\'état général. ATCD : HTA, diabète type 2, insuffisance rénale stade 3, AVC ischémique sylvien gauche en 2022 sans séquelle motrice. Traitement : Amlodipine, Metformine, Atorvastatine, Clopidogrel. Examen : T° 38.5°C, confusion, déshydratation, plaie du talon droit nécrotique.\n\nDressez la liste exhaustive des problèmes et votre plan de soins priorisé.',
    questions: [
      { questionText: 'Établissez la liste hiérarchisée des problèmes médicaux.',
        idealAnswer: '1. Infection (plaie talon) pouvant expliquer la fièvre et la confusion. 2. Insuffisance rénale aiguë fonctionnelle sur déshydratation. 3. Déséquilibre du diabète. 4. Dénutrition. 5. Escarre talon droit. 6. Risque de chute. 7. Iatrogénie médicamenteuse.',
        criteria: [
          { label: 'Infection identifiée comme priorité', keywords: ['infection', 'plaie', 'fièvre'] },
          { label: 'IRA fonctionnelle évoquée', keywords: ['insuffisance rénale', 'déshydratation', 'fonctionnelle'] },
          { label: 'Dénutrition/escarre citée', keywords: ['dénutrition', 'escarre', 'plaie', 'talon'] },
        ]},
      { questionText: 'Quels examens prescrivez-vous en priorité ?',
        idealAnswer: 'NFS, CRP, PCT, hémocultures (x2), bilan rénal, ionogramme, glycémie, HbA1c, ECBU, radiographie du talon, échographie rénale, dosage des médicaments (metformine → risque d\'acidose lactique).',
        criteria: [
          { label: 'Bilan infectieux complet', keywords: ['NFS', 'CRP', 'hémoculture', 'PCT'] },
          { label: 'Fonction rénale évaluée', keywords: ['créatinine', 'rénal', 'urée'] },
          { label: 'Acidose lactique évoquée', keywords: ['acidose', 'lactique', 'metformine'] },
        ]},
    ]},
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const force = process.argv.includes('--force');
  const existingModules = await Module.countDocuments();
  if (existingModules > 0 && !force) {
    console.log(`Database already has ${existingModules} modules. Use --force to re-seed. Aborting.`);
    process.exit(0);
  }
  if (existingModules > 0) {
    await Promise.all([
      Module.deleteMany({}),
      Quiz.deleteMany({}),
      VoiceExam.deleteMany({}),
    ]);
    console.log('Existing data cleared.');
  }

  // Insert modules
  await Module.insertMany(modules);
  console.log(`Inserted ${modules.length} modules.`);

  // Get inserted modules by name for referencing
  const moduleDocs = await Module.find({});
  const moduleMap = {};
  moduleDocs.forEach((m) => { moduleMap[m.name] = m; });

  // Insert quizzes
  const quizDocs = [];
  for (const q of quizzes) {
    const mod = moduleMap[q.moduleName];
    if (!mod) { console.warn(`Module not found: ${q.moduleName}`); continue; }
    quizDocs.push({
      quizId: q.quizId,
      year: q.year,
      moduleId: mod._id,
      course: q.course,
      published: true,
      explanation: q.explanation,
      question: {
        questionText: q.questionText,
        options: q.options,
        correctAnswers: q.correctAnswers,
      },
    });
  }
  await Quiz.insertMany(quizDocs);
  console.log(`Inserted ${quizDocs.length} quizzes.`);

  // Insert voice exams
  const voiceExamDocs = [];
  for (const v of voiceExams) {
    const mod = moduleMap[v.moduleName];
    if (!mod) { console.warn(`Module not found: ${v.moduleName}`); continue; }
    voiceExamDocs.push({
      title: v.title,
      year: v.year,
      moduleId: mod._id,
      clinicalCasePrompt: v.clinicalCasePrompt,
      questions: v.questions,
    });
  }
  await VoiceExam.insertMany(voiceExamDocs);
  console.log(`Inserted ${voiceExamDocs.length} voice exams.`);

  console.log('\n--- Seed complete ---');
  console.log(`  Modules:  ${modules.length}`);
  console.log(`  Quizzes:  ${quizDocs.length}`);
  console.log(`  VoiceExams: ${voiceExamDocs.length}`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
