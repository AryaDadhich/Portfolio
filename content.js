// ─────────────────────────────────────────────────────────────────────────────
//  content.js — the only file you need to edit.
//  All text, links, project data, demo settings and the colour palette live here.
//  Anything written as "[ADD: …]" is a placeholder: it is shown on the site with a
//  dashed outline (and never rendered as a link) until you replace it.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  meta: {
    siteTitle: 'Arya Dadhich — Data & ML Engineer',
    description:
      'Portfolio of Arya Dadhich, a data engineer and ML practitioner: data pipelines on AWS, computer vision, and analytical models, with interactive project demos.',
    siteUrl: '[ADD: site URL once deployed]', // used for the og:url tag only
  },

  // Extracted from the portrait photo with tools/extract-palette.mjs (colorthief).
  // Light pastel fills only; `ink` is the single dark colour for text and line art.
  palette: {
    paper: '#f9f8f3',
    paperDeep: '#f4f2e9',
    tintSky: '#d5e0ee',
    tintMeadow: '#e4e9d6',
    tintSand: '#efebd4',
    accent: '#a5bad5',
    accentInk: '#345174',
    ink: '#353222',
    inkSoft: '#676351',
  },

  person: {
    name: 'Arya Dadhich',
    headline: 'Data engineer and ML practitioner. I build end-to-end data pipelines and computer vision systems that turn raw data into decisions.',
    email: 'aryadadhichwp@gmail.com',
    linkedin: 'https://www.linkedin.com/in/aryadadhich/',
    github: 'https://github.com/AryaDadhich',
    location: '[ADD: current city]',
    photo: 'assets/portrait.jpg',
    cv: 'assets/Arya_Dadhich_CV.pdf',
    bio: [
      'I am a data engineer and AI/ML practitioner with hands-on experience designing end-to-end data pipelines, deploying computer vision solutions, and building analytical models that drive business decisions.',
      'At ZS Associates I designed and maintained pipelines across the full data lifecycle, from landing through standardised and normalised layers to MDM, on AWS (S3, Glue, Athena, EMR) with Apache Airflow. Before that, at Marico, I shipped an object detection system that identifies over 50 SKUs on retail shelves and built regression models for trade-offer optimisation.',
      'I hold an Integrated MTech in Computer Science Engineering (Business Analytics) from Vellore Institute of Technology. Outside work I have led a 20+ member dramatics club, reached the top 100 of the Rakuten RAKATHON, and trek at high altitude.',
    ],
    status: '[ADD: one line on what you are doing now / what roles you are open to]',
  },

  // ── Home ───────────────────────────────────────────────────────────────────
  home: {
    hint: 'scroll, swipe or press ↓ to zoom in',
    // One short caption per intro stage (the final stage shows the portrait instead).
    captions: ['It starts with one dot.', 'One dot becomes data.', 'Data becomes a model.', 'And the work becomes a trail.'],
    bullets: [
      { label: 'Projects', href: 'projects.html', tint: 'tintSky', icon: 'nodes' },
      { label: 'About me', href: 'about.html', tint: 'tintMeadow', icon: 'person' },
      { label: 'Experience', href: 'experience.html', tint: 'tintSand', icon: 'trail' },
      { label: 'Contact', href: 'about.html#contact', tint: 'accent', icon: 'mail' },
    ],
  },

  nav: [
    { label: 'Projects', href: 'projects.html' },
    { label: 'About', href: 'about.html' },
    { label: 'Experience', href: 'experience.html' },
  ],

  // ── Projects ───────────────────────────────────────────────────────────────
  // demo.module is a file in js/demos/. demo.config is passed straight to it.
  projects: [
    {
      id: 'gesture',
      title: 'Gesture-Based Upper-Body Recognition for Virtual Game Interfaces',
      period: 'Dec 2021 – Mar 2022',
      context: 'Self-learning project · Computer vision · Human-computer interaction',
      summary:
        'A gesture recognition system that combines gesture spotting with real-time recognition on MediaPipe pose estimation, so a player controls a virtual game with their body instead of a keyboard or controller.',
      highlights: [
        'Mapped upper-body skeletal landmarks to custom game control bindings with PyAutoGUI.',
        'Backed by a multi-database architecture storing user gesture profiles and session data.',
      ],
      tags: ['Python', 'OpenCV', 'MediaPipe', 'PyAutoGUI', 'MySQL', 'MongoDB', 'Cassandra', 'Oracle GCP'],
      links: [{ label: 'GitHub', href: '[ADD: GitHub repo URL]' }],
      demo: {
        module: 'pose',
        type: 'Live webcam demo',
        why: 'The project is real-time pose control, so the honest demo is your own camera driving a character. It runs on MediaPipe Pose Landmarker in your browser.',
        config: {
          // Pinned versions; loaded only after "Try it" is pressed.
          visionBundle: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
          wasmPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
          model: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          fallbackSequence: 'assets/pose-sequence.json',
          video: { width: 480, height: 360 },
          smoothing: 0.45, // 0 = raw, closer to 1 = smoother but laggier
          privacy: 'Runs fully in your browser. No video is uploaded or stored.',
        },
      },
    },
    {
      id: 'shelf',
      title: 'Share of Shelf — Modern Trade',
      period: 'Jan 2024 – Jul 2024',
      context: 'AI/ML Intern, Marico Limited · Computer vision',
      summary:
        'An object detection model (Single Shot Detection with ElasticNet and MobileNet backbones) that identifies over 50 SKUs on modern-trade retail shelves, with an analytics pipeline and real-time dashboard for the Modern Trade team.',
      highlights: [
        'Processed and annotated approximately 2,000 images per SKU category.',
        'End-to-end pipeline: ingestion, preprocessing, batch inference and continuous retraining cycles.',
        'Dashboard gave live visibility into SKU placement and competitor shelf activity; inference results and image metadata processed with Spark and Hadoop (HDFS).',
      ],
      tags: ['TensorFlow', 'Keras', 'PyTorch', 'Scikit-learn', 'Apache Spark', 'Hadoop', 'HDFS', 'Python'],
      links: [],
      demo: {
        module: 'shelf',
        type: 'Interactive demo on sample data',
        why: 'The real model and shelf images are proprietary, so this uses an illustrative shelf with pre-computed detections to show the idea: detect facings, then turn them into share of shelf.',
        config: {
          brands: ['Own brand', 'Competitor A', 'Competitor B'],
          note: 'Illustrative shelf and scores, not Marico data. The production model identified 50+ SKUs.',
        },
      },
    },
    {
      id: 'trade',
      title: 'Trade Offer Optimisation',
      period: 'Jan 2024 – Jul 2024',
      context: 'AI/ML Intern, Marico Limited · Statistical modelling',
      summary:
        'Regression models quantifying how trade promotional offers relate to sales volume. A multilevel model evaluated the differing impact of offers across channel, geography and SKU level.',
      highlights: [
        'Applied custom feature elimination in Python to improve model parsimony and predictive accuracy.',
        'Worked with the Trade Marketing team to turn model outputs into spend allocation recommendations across channels, geographies and SKUs.',
      ],
      tags: ['Python', 'Scikit-learn', 'Linear Regression', 'Multilevel Regression', 'Feature Elimination'],
      links: [],
      demo: {
        module: 'regression',
        type: 'Interactive demo on sample data',
        why: 'Regression is easiest to understand by moving a slider. The fit is computed live in your browser on synthetic data, comparing one pooled line with a line per group.',
        config: {
          groups: ['Channel A', 'Channel B', 'Channel C'],
          note: 'Synthetic data for illustration. Not actual sales figures.',
        },
      },
    },
    {
      id: 'recommender',
      title: 'Meme-Enhanced Hybrid Movie Recommender with Cold Start Resolution',
      period: 'Dec 2022 – Mar 2023',
      context: 'Self-learning project · Recommender systems',
      summary:
        'A hybrid recommendation engine combining content-based and collaborative filtering. It addresses the cold start problem by using profile-based memes and popular film dialogues as proxy preference signals for new users.',
      highlights: [
        'Personalises from the first session, before a user has any viewing history.',
        'Dashboard built with Python, Pandas and Streamlit with an HTML/CSS front end.',
      ],
      tags: ['Python', 'Pandas', 'Streamlit', 'HTML/CSS', 'Tableau', 'Power BI', 'Plotly', 'ggplot2', 'Matplotlib', 'Seaborn'],
      links: [{ label: 'GitHub', href: '[ADD: GitHub repo URL]' }],
      demo: {
        module: 'recommender',
        type: 'Interactive demo on sample data',
        why: 'Cold start is a "new user" problem, so you play the new user: pick a few dialogue styles and watch the ranking change, then blend content-based and collaborative scores.',
        config: {
          note: 'Small illustrative catalogue and synthetic ratings, not the original dataset.',
        },
      },
    },
    {
      id: 'renal',
      title: 'Detection of Renal Calculi (Kidney Stones)',
      period: 'Jul 2021 – Dec 2021',
      context: 'Self-learning project · Medical image processing',
      summary:
        'A diagnostic tool for detecting renal calculi in medical images, using colour deconvolution for pre-processing and morphological reconstruction for segmentation.',
      highlights: [
        'Over 95% accuracy in feature extraction and classification of renal stones.',
        'Outcome: 20% reduction in diagnostic errors.',
      ],
      tags: ['MATLAB', 'Image Processing Toolbox', 'Segmentation', 'Classification'],
      links: [{ label: 'GitHub', href: '[ADD: GitHub repo URL]' }],
      demo: {
        module: 'pipeline',
        type: 'Clickable pipeline on a synthetic image',
        why: 'Medical images cannot be bundled, and the original is MATLAB. Each step of the pipeline is re-implemented in a few lines of JavaScript and run on a synthetic image so you can see what every stage does.',
        config: {
          note: 'Synthetic test image generated in your browser. No patient data.',
        },
      },
    },
  ],

  // ── About ──────────────────────────────────────────────────────────────────
  skills: [
    { group: 'Languages & query', items: ['Python', 'SQL', 'R', 'MATLAB'] },
    { group: 'Cloud & data engineering', items: ['AWS S3', 'AWS Glue', 'AWS Athena', 'AWS EMR', 'Apache Airflow', 'Apache Spark', 'Hadoop', 'HDFS', 'ETL pipelines', 'Git'] },
    { group: 'Machine learning & AI', items: ['TensorFlow', 'Keras', 'PyTorch', 'Scikit-learn', 'OpenCV', 'MediaPipe', 'Object detection (SSD, MobileNet, ElasticNet)'] },
    { group: 'Data & visualisation', items: ['Pandas', 'Tableau', 'Power BI', 'Plotly', 'Matplotlib', 'Seaborn', 'ggplot2', 'Streamlit'] },
    { group: 'Databases', items: ['MySQL', 'MongoDB', 'Cassandra', 'Oracle', 'NoSQL'] },
    { group: 'Analytics', items: ['Big data analytics', 'Predictive analytics', 'Prescriptive analytics', 'Statistical modelling', 'Regression analysis'] },
  ],

  // "Life beyond code" cards. To add one, copy a line. icon: mountain | play | curtain | sprout | book | camera | plus
  // tint: tintSky | tintMeadow | tintSand. Leave href as '' for a card with no link.
  beyond: [
    { title: 'Trekking', text: 'High-altitude treks reaching 15,000 ft. Photos and a list of expeditions.', href: 'trekking.html', icon: 'mountain', tint: 'tintSky' },
    { title: 'Vlogs & writing', text: '[ADD: one line about your vlogs or writing]', href: '[ADD: vlog / blog URL]', icon: 'play', tint: 'tintSand' },
    { title: 'Theatre', text: 'General Secretary of the Dramatics Club at VIT; performed at inter-collegiate festivals at IITs and NITs.', href: '', icon: 'curtain', tint: 'tintMeadow' },
    { title: 'Volunteering', text: 'Helphen India: menstrual hygiene access and a cross-state flood relief effort during COVID-19.', href: '', icon: 'sprout', tint: 'tintSky' },
    { title: 'Reading & yoga', text: '[ADD: a favourite book or what you practise]', href: '', icon: 'book', tint: 'tintSand' },
    { title: '[OTHER: e.g. photography]', text: '[ADD: description]', href: '[ADD: link]', icon: 'plus', tint: 'tintMeadow' },
  ],

  // ── Trekking page ──────────────────────────────────────────────────────────
  trekking: {
    intro: 'I have completed multiple high-altitude treks, reaching up to 15,000 ft. They take sustained endurance, patience and disciplined preparation, which is most of what good engineering takes too.',
    photos: [
      { src: 'assets/trek-01.jpg', alt: 'Arya standing in a high-altitude valley with snow peaks behind', caption: '[ADD: place, year]' },
      // { src: 'assets/trek-02.jpg', alt: '…', caption: '…' },
    ],
    expeditions: [
      { name: '[ADD: expedition name]', where: '[ADD: region]', altitude: '[ADD: altitude]', when: '[ADD: year]' },
      { name: '[ADD: expedition name]', where: '[ADD: region]', altitude: '[ADD: altitude]', when: '[ADD: year]' },
    ],
  },

  // ── Experience ─────────────────────────────────────────────────────────────
  // Shown in this order along the trail (oldest first).
  timeline: [
    {
      kind: 'Education',
      title: 'Integrated MTech, Computer Science Engineering',
      org: 'Vellore Institute of Technology',
      when: '2019 – 2024',
      where: '',
      tint: 'tintSand',
      points: [
        'Specialisation in Business Analytics. CGPA 8.12 / 10.',
        'Coursework: machine learning, deep learning, computer vision, NLP, big data analytics, NoSQL databases, statistical analysis.',
      ],
      tags: [],
    },
    {
      kind: 'Internship',
      title: 'AI/ML Intern',
      org: 'Marico Limited',
      when: 'Jan 2024 – Jul 2024',
      where: 'Mumbai · Hybrid',
      tint: 'tintMeadow',
      points: [
        'Deployed an SSD object detection model identifying over 50 SKUs on retail shelves, trained on about 2,000 annotated images per SKU category.',
        'Built the analytics pipeline and real-time dashboard used by the Modern Trade team, with Spark and Hadoop for large-scale processing.',
        'Built linear and multilevel regression models linking trade offers to sales volume, feeding spend allocation recommendations.',
      ],
      tags: ['TensorFlow', 'PyTorch', 'Spark', 'Hadoop', 'Scikit-learn'],
    },
    {
      kind: 'Role',
      title: 'Data Engineer',
      org: 'ZS Associates',
      when: 'Jan 2025 – Apr 2026',
      where: 'Pune, India',
      tint: 'tintSky',
      points: [
        'Designed and maintained scalable pipelines across the full data lifecycle: Landing → Standardised → Normalised → MDM.',
        'Ran impact analysis and data quality checks with SQL validation scripts and Python automation, resolving bad attributes before they reached downstream systems.',
        'Supported production deployments and environment migrations, and translated business requirements into pipeline specifications with cross-functional teams.',
      ],
      tags: ['Python', 'SQL (Athena)', 'AWS S3', 'Glue', 'EMR', 'Airflow', 'Git'],
    },
  ],

  extras: [
    {
      heading: 'Achievements',
      items: [
        { title: 'Finalist, Rakuten RAKATHON', meta: 'Chennai · Jul 2022', text: 'Led a team of 4 to the top 100 on the Cloud technologies theme, with a dynamic video scaling solution powered by deep neural networks that adapts quality to network conditions and device constraints.' },
      ],
    },
    {
      heading: 'Leadership',
      items: [
        { title: 'General Secretary, Dramatics Club, VIT', meta: 'Chennai', text: 'Led a team of 20+ across direction, screenwriting and rehearsals for full-scale productions, and represented VIT at inter-collegiate theatre festivals at IITs and NITs.' },
      ],
    },
    {
      heading: 'Volunteering',
      items: [
        { title: 'Volunteer, Helphen India', meta: 'Tamil Nadu / Bengal · during COVID-19', text: 'Worked on the Period Sanity Drive for menstrual hygiene access, and coordinated a cross-state flood relief effort with Tata Motors, delivering first aid kits and food supplies funded by a public donation drive.' },
      ],
    },
    {
      heading: 'Certifications',
      items: [
        { title: 'Getting Started with Data Science Enterprise', meta: 'IBM SkillsBuild', text: '' },
        { title: 'Python for Machine Learning', meta: 'Kaggle', text: '' },
        { title: 'Pandas', meta: 'Kaggle', text: '' },
      ],
    },
  ],
};
