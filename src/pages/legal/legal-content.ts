/**
 * Documents légaux — source unique (web, desktop et liens depuis l'app mobile).
 * Toute modification de fond : mettre à jour LEGAL_REVISION (date, résumé, ré-acceptation).
 */

// ⚠️ Champs signalés « À compléter » : informations société non trouvées dans le projet.
export const LEGAL_ENTITY = {
  raisonSociale: 'MY TRUCK TRANSPORT ET LIVRAISON',
  formeJuridique: '[À compléter : forme juridique, ex. SAS]',
  capital: '[À compléter : capital social]',
  siege: '139, boulevard de Stalingrad, 94400 Vitry-sur-Seine, France',
  rcs: 'RCS Créteil 851 349 357',
  siret: '911 584 753 00014',
  tva: 'FR00911584753',
  directeurPublication: '[À compléter : nom du directeur de la publication]',
  email: 'contact@mytruck-com.net',
  telephone: '06 22 15 62 60',
  tribunal: 'Créteil',
};

export const LEGAL_REVISION = {
  version: '1.0',
  date: '12 octobre 2026',
  requiresReacceptance: false,
  summary:
    "Première publication des mentions légales, des conditions générales d'utilisation et de la politique de confidentialité, " +
    "incluant les notifications push et l'accès des administrateurs à l'application mobile.",
};

export type LegalDocKey = 'mentions-legales' | 'cgu' | 'confidentialite';

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  title: string;
  intro?: string;
  sections: LegalSection[];
}

const E = LEGAL_ENTITY;

export const LEGAL_DOCUMENTS: Record<LegalDocKey, LegalDocument> = {
  // ─────────────────────────────────────────────────────────────────────────
  'mentions-legales': {
    title: 'Mentions légales',
    sections: [
      {
        title: '1. Éditeur',
        items: [
          `Raison sociale : ${E.raisonSociale}`,
          `Forme juridique : ${E.formeJuridique}`,
          `Capital social : ${E.capital}`,
          `Siège social : ${E.siege}`,
          `Immatriculation : ${E.rcs}`,
          `SIRET : ${E.siret}`,
          `N° TVA intracommunautaire : ${E.tva}`,
          `Téléphone : ${E.telephone}`,
          `E-mail : ${E.email}`,
          `Directeur de la publication : ${E.directeurPublication}`,
        ],
      },
      {
        title: '2. Hébergement',
        paragraphs: [
          "L'application web est hébergée par Vercel Inc. (vercel.com). L'API et la base de données sont hébergées par Railway Corp. (railway.com). " +
          'Les photos, signatures et documents PDF sont stockés chez Cloudinary Ltd. (cloudinary.com).',
        ],
      },
      {
        title: '3. Propriété intellectuelle',
        paragraphs: [
          `L'ensemble des éléments de la plateforme My Truck (marques, logos, textes, interfaces, code) est la propriété de ${E.raisonSociale} ou de ses partenaires. ` +
          'Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.',
        ],
      },
      {
        title: '4. Données personnelles',
        paragraphs: [
          'Le traitement des données personnelles est décrit dans la politique de confidentialité, accessible depuis le pied de page du site et depuis le profil de l\'application mobile.',
        ],
      },
      {
        title: '5. Contact',
        paragraphs: [`Pour toute question : ${E.email} — ${E.telephone}.`],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  cgu: {
    title: "Conditions générales d'utilisation",
    intro:
      "Les présentes conditions encadrent l'utilisation de la plateforme My Truck (site web, application de bureau et application mobile) " +
      "par les utilisateurs professionnels qui y disposent d'un compte. Les conditions commerciales (tarifs, facturation, engagements de service) " +
      'relèvent du contrat conclu séparément entre My Truck et chaque client professionnel.',
    sections: [
      {
        title: '1. Objet',
        paragraphs: [
          'My Truck est une plateforme professionnelle de gestion de livraisons et de cessions inter-magasins : création et suivi des commandes, dispatch des chauffeurs, ' +
          'suivi GPS en temps réel, preuves d\'enlèvement et de livraison, messagerie et notifications.',
        ],
      },
      {
        title: '2. Accès et comptes',
        items: [
          "L'accès est réservé aux comptes créés par My Truck ou par l'administrateur d'une organisation cliente. Il n'existe pas d'inscription libre du public.",
          'Les rôles disponibles sont : administrateur, direction, magasin et chauffeur. Chaque rôle n\'accède qu\'aux fonctions et aux données de sa structure.',
          "L'application mobile est réservée aux chauffeurs ainsi qu'aux administrateurs et à la direction.",
          "L'utilisateur garde ses identifiants confidentiels et signale sans délai toute utilisation non autorisée de son compte.",
        ],
      },
      {
        title: '3. Organisations clientes',
        paragraphs: [
          'Une organisation cliente peut utiliser la plateforme pour ses propres livraisons. Ses données sont cloisonnées : elles ne sont visibles ni par My Truck dans ses propres écrans d\'exploitation, ' +
          'ni par les autres organisations. Les notifications et e-mails liés à son activité sont adressés à ses seuls administrateurs.',
        ],
      },
      {
        title: '4. Obligations des utilisateurs',
        items: [
          'Saisir des informations exactes et à jour (adresses, contacts, dimensions et poids des articles, créneaux).',
          'Utiliser la plateforme dans un cadre strictement professionnel et conformément à la loi.',
          'Ne collecter que les données des destinataires nécessaires à la livraison et les en informer.',
          'Chauffeurs : activer le suivi de position pendant les livraisons en cours, réaliser les photos d\'enlèvement et de preuve, et recueillir la signature du destinataire lorsqu\'elle est demandée.',
          'Messagerie : échanger dans un cadre professionnel, sans contenu injurieux, discriminatoire ou illicite.',
        ],
      },
      {
        title: '5. Géolocalisation',
        paragraphs: [
          "Pendant une livraison en cours, l'application mobile transmet la position du chauffeur, y compris lorsque l'application est en arrière-plan, " +
          'afin d\'informer en temps réel la direction, le magasin et le destinataire (lien de suivi temporaire). Le suivi s\'arrête à la fin de la livraison ou lorsque le chauffeur le désactive.',
        ],
      },
      {
        title: '6. Notifications',
        paragraphs: [
          "L'application mobile peut envoyer des notifications push (nouvelle course, modification, annulation, étapes de livraison, réserves, messages). " +
          'Elles sont désactivables à tout moment dans les réglages du téléphone. La plateforme envoie aussi des e-mails et des SMS opérationnels liés aux commandes.',
        ],
      },
      {
        title: '7. Disponibilité',
        paragraphs: [
          'My Truck s\'efforce d\'assurer la disponibilité de la plateforme 24 h/24, sans obligation de résultat. Des interruptions peuvent survenir pour maintenance, mise à jour ou en cas d\'incident chez un hébergeur ou un opérateur.',
        ],
      },
      {
        title: '8. Responsabilité',
        paragraphs: [
          'Chaque utilisateur est responsable des informations qu\'il saisit et de l\'usage de son compte. My Truck ne saurait être tenue responsable des conséquences d\'informations inexactes ' +
          'transmises par un utilisateur, ni des indisponibilités indépendantes de sa volonté (réseau mobile, services de cartographie, opérateurs de notification).',
        ],
      },
      {
        title: '9. Suspension et fin d\'accès',
        paragraphs: [
          'En cas de manquement aux présentes conditions, l\'accès d\'un utilisateur peut être suspendu ou supprimé par My Truck ou par l\'administrateur de son organisation. ' +
          'L\'accès prend fin à la clôture du compte ou à la fin du contrat avec l\'organisation concernée.',
        ],
      },
      {
        title: '10. Données personnelles',
        paragraphs: ['Les traitements de données personnelles sont décrits dans la politique de confidentialité.'],
      },
      {
        title: '11. Modification des conditions',
        paragraphs: [
          'Les présentes conditions peuvent évoluer. La date et la version en vigueur figurent en bas de page. ' +
          'En cas de changement des droits ou obligations des utilisateurs, ceux-ci en sont informés avant l\'entrée en vigueur.',
        ],
      },
      {
        title: '12. Droit applicable',
        paragraphs: [
          `Les présentes conditions sont soumises au droit français. À défaut de résolution amiable, tout litige relève des tribunaux compétents de ${E.tribunal}.`,
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  confidentialite: {
    title: 'Politique de confidentialité',
    intro:
      'Cette politique explique quelles données personnelles la plateforme My Truck traite, pourquoi, combien de temps, avec qui elles sont partagées et comment exercer vos droits, ' +
      'conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.',
    sections: [
      {
        title: '1. Responsable du traitement',
        paragraphs: [
          `${E.raisonSociale}, ${E.siege} (${E.email}) est responsable des traitements réalisés pour sa propre activité de transport et de livraison.`,
          'Lorsqu\'une organisation cliente utilise la plateforme pour ses propres livraisons, cette organisation est responsable du traitement de ses données ; ' +
          'My Truck agit alors comme sous-traitant, sur ses instructions, au sens de l\'article 28 du RGPD.',
        ],
      },
      {
        title: '2. Données traitées',
        items: [
          'Comptes utilisateurs (administrateurs, direction, magasins, chauffeurs) : nom, prénom, e-mail, téléphone, rôle, structure de rattachement, dates de connexion. Le mot de passe est stocké uniquement sous forme chiffrée (hachage).',
          'Destinataires des livraisons : nom, prénom, téléphone(s), adresse, type de logement, bâtiment, étage, ascenseur, code d\'accès ou interphone, conditions d\'accès.',
          'Commandes et livraisons : articles (nature, dimensions, poids, photos), créneaux, statuts et leur historique, remarques, tarif.',
          'Preuves : photos d\'enlèvement et de livraison, photos jointes aux rapports et réserves, signature manuscrite du destinataire ou du magasin.',
          'Géolocalisation des chauffeurs : position GPS transmise environ toutes les 30 secondes pendant une livraison en cours, y compris lorsque l\'application est en arrière-plan.',
          'Messagerie : contenu des messages, expéditeur, date d\'envoi et de lecture.',
          'Formulaire de contact : nom du magasin, adresse, téléphone, e-mail, motif et message.',
          'Notifications push : identifiant technique de l\'appareil (jeton Expo) et plateforme (iOS ou Android), associés au compte connecté.',
          'Avis clients : note et commentaire déposés après une livraison.',
          'Données techniques stockées sur l\'appareil : jeton de connexion, préférences d\'affichage et cache hors ligne. La plateforme n\'utilise aucun cookie publicitaire ni outil de mesure d\'audience.',
        ],
      },
      {
        title: '3. Finalités et bases légales',
        items: [
          'Organiser, exécuter et suivre les livraisons et cessions (exécution du contrat avec le client professionnel).',
          'Informer en temps réel la direction, le magasin et le destinataire de l\'avancement de la livraison, y compris par lien de suivi, e-mail, SMS et notification push (exécution du contrat et intérêt légitime).',
          'Conserver les preuves d\'enlèvement et de livraison et gérer les réserves et litiges (intérêt légitime et constatation de droits).',
          'Permettre les échanges entre direction, magasins et chauffeurs (intérêt légitime).',
          'Sécuriser les comptes et cloisonner les données entre structures (intérêt légitime et obligation de sécurité).',
          'Établir les devis et factures et les conserver (obligation légale).',
          'Envoyer des notifications push et accéder à la position, à la caméra et aux photos du téléphone : uniquement après autorisation donnée dans les réglages de l\'appareil.',
        ],
      },
      {
        title: '4. Destinataires',
        paragraphs: [
          'Les données sont accessibles aux seules personnes habilitées de la structure concernée, selon leur rôle (direction, magasin, chauffeur assigné). ' +
          'Le destinataire d\'une livraison n\'accède qu\'au lien de suivi temporaire de sa propre commande. Les données sont confiées aux prestataires techniques suivants, pour les seuls besoins du service :',
        ],
        items: [
          'Railway (hébergement de l\'API et de la base de données)',
          'Vercel (hébergement de l\'application web)',
          'Cloudinary (stockage des photos, signatures et documents PDF)',
          'Resend (envoi des e-mails)',
          'Twilio (envoi des SMS)',
          'Expo, Apple (APNs) et Google (Firebase Cloud Messaging) (acheminement des notifications push)',
          'Mapbox (cartographie et calcul d\'itinéraires dans l\'application web)',
        ],
      },
      {
        title: '5. Transferts hors Union européenne',
        paragraphs: [
          'Certains de ces prestataires sont établis aux États-Unis. Ces transferts sont encadrés par des garanties appropriées au sens du RGPD ' +
          '(clauses contractuelles types de la Commission européenne ou adhésion du prestataire au Data Privacy Framework UE–États-Unis).',
        ],
      },
      {
        title: '6. Durées de conservation',
        items: [
          'Destinataires des livraisons : 3 ans après la dernière commande, puis anonymisation automatique (nom, téléphones et adresse effacés).',
          'Comptes utilisateurs : pendant toute la durée du compte, puis suppression ou anonymisation à sa clôture.',
          'Positions GPS et événements de suivi : [À compléter : durée de conservation retenue]. Le lien de suivi public expire automatiquement à la fin de la livraison.',
          'Photos, signatures et rapports : pendant la durée nécessaire au traitement des réserves et litiges, et au plus [À compléter : durée retenue].',
          'Messages : [À compléter : durée retenue].',
          'Jeton de notification push : jusqu\'à la déconnexion de l\'application, sa désinstallation ou la désactivation des notifications.',
          'Devis et factures : 10 ans (article L123-22 du Code de commerce).',
        ],
      },
      {
        title: '7. Autorisations de l\'application mobile',
        items: [
          'Localisation (au premier plan et en arrière-plan) : suivi de la livraison en cours. Révocable dans les réglages du téléphone ; le suivi en temps réel ne fonctionne alors plus.',
          'Caméra et photos : photos d\'enlèvement, de preuve de livraison et de réserve.',
          'Notifications : alertes de courses, d\'étapes de livraison et de messages. Désactivables dans les réglages du téléphone ; la déconnexion de l\'application les arrête aussi pour ce compte.',
        ],
      },
      {
        title: '8. Sécurité',
        paragraphs: [
          'Les échanges sont chiffrés (HTTPS), les mots de passe sont hachés, l\'accès aux données est limité selon le rôle et cloisonné entre My Truck et chaque organisation cliente. ' +
          'Les liens de suivi publics sont temporaires et non devinables.',
        ],
      },
      {
        title: '9. Vos droits',
        paragraphs: [
          'Vous disposez d\'un droit d\'accès, de rectification, d\'effacement, de limitation, d\'opposition et de portabilité de vos données, ainsi que du droit de définir des directives relatives à leur sort après votre décès. ' +
          `Pour les exercer, écrivez à ${E.email} en précisant votre demande ; une réponse vous sera apportée dans un délai d'un mois. ` +
          'Si vos données sont traitées pour le compte d\'une organisation cliente, votre demande lui sera transmise.',
          'Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).',
        ],
      },
      {
        title: '10. Mineurs',
        paragraphs: ['La plateforme est réservée à un usage professionnel et ne s\'adresse pas aux mineurs.'],
      },
      {
        title: '11. Modifications',
        paragraphs: [
          'Cette politique peut évoluer en fonction des fonctionnalités et de la réglementation. La version et la date en vigueur figurent en bas de page.',
        ],
      },
    ],
  },
};
