import type { EngineStep } from '../constants/engine';

export type Role = 'student' | 'teacher' | 'school-admin';

export type AgeTier = 'explorer' | 'creator' | 'innovator';

export type ThinkStarterType =
  | 'what-if'
  | 'spot-the-problem'
  | 'quick-observation'
  | '30-second'
  | 'odd-one-out'
  | 'rapid-ideas'
  | 'mini-scamper';

export type Challenge = {
  id: string;
  type: ThinkStarterType;
  title: string;
  prompt: string;
  options?: string[];
};

export type ProblemCategory = 'waste' | 'inconvenience' | 'inefficiency' | 'unmet-need';

export type ScamperKey = 'S' | 'C' | 'A' | 'M' | 'P' | 'E' | 'R';

export type Criterion =
  | 'relevance'
  | 'usefulness'
  | 'feasibility'
  | 'resources'
  | 'cost'
  | 'impact'
  | 'originality';

export type PrototypeLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type DesignFormat = 'mock-up' | 'storyboard' | 'process-diagram' | 'explanation';

export type Iteration = {
  id: string;
  hypothesis: string;
  procedure: string;
  result: string;
  wentWrong: string;
  learnings: string;
  createdAt?: string;
};

/** Where a project started, when adopted from the Showcase. */
export type ProjectOrigin = { kind: 'community' | 'gallery'; id: string; title: string };

/** Innovator-tier Lean Social Canvas. */
export type Venture = {
  beneficiary: string;
  costToProduce: string;
  valueProposition: string;
  impactMetric: string;
  updatedAt: string;
};

export type Idea = {
  id: string;
  text: string;
  ratings: Partial<Record<Criterion, number>>;
};

/** Photo of a sketch/storyboard. `localUri` is device-specific; `remoteUrl` is set once uploaded to Storage. */
export type DesignAttachment = {
  id: string;
  localUri: string | null;
  storagePath: string;
  remoteUrl: string | null;
  width: number;
  height: number;
  createdAt: string;
};

/**
 * Firestore `portfolios/{id}`: one self-contained document per innovation journey.
 * Related data (owner, challenge, selected idea, final solution) is embedded, not referenced.
 * Optional values use `null` because Firestore rejects `undefined`.
 */
export type InnovationPortfolio = {
  id: string;
  ownerId: string;
  /** Student's current teacher and school; grant them read access to this portfolio. */
  teacherId: string | null;
  schoolId: string | null;
  owner: { ageTier: AgeTier | null };
  status: 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  currentStep: EngineStep;
  thinkStarter: { challenge: Pick<Challenge, 'id' | 'title' | 'prompt'> | null; response: string };
  problem: { category: ProblemCategory | null; observation: string; statement: string };
  research: { fiveWhys: string[] };
  ideas: Idea[];
  scamper: Partial<Record<ScamperKey, string>>;
  selectedIdea: Pick<Idea, 'id' | 'text'> | null;
  hasMaterials: boolean | null;
  prototype: { level: PrototypeLevel; notes: Partial<Record<PrototypeLevel, string>> };
  design: { format: DesignFormat | null; content: string; attachments: DesignAttachment[] };
  iterations: Iteration[];
  reflection: {
    discovered: string;
    surprised: string;
    didNotWork: string;
    wouldChange: string;
    tryNext: string;
  };
  finalSolution: { idea: string; improvements: string } | null;
  origin: ProjectOrigin | null;
  /** Materials the student chose via Material Substitution. */
  substitutions: string[];
  venture: Venture | null;
};

export type Resource = { id: string; name: string; quantity: string };

/** Firestore `resourceBanks/{teacherUid}`: readable by any signed-in user so linked students see it. */
export type ResourceBank = { ownerId: string; resources: Resource[]; updatedAt: string };

/** Firestore `joinCodes/{code}`: public lookup from a 6-digit code to its class. */
export type JoinCode = {
  code: string;
  classId: string;
  className: string;
  teacherId: string;
  schoolId: string | null;
  createdAt: string;
};

export type SchoolLink = Omit<JoinCode, 'createdAt'>;

/** Firestore `users/{uid}`. */
export type UserProfile = {
  role: Role | null;
  ageTier: AgeTier | null;
  activeProjectId: string | null;
  /** A student's class link. */
  school: SchoolLink | null;
  /** First name only; shown on the Passport, certificates and approved Showcase entries. */
  displayName: string | null;
  /** Students only: tells apart classmates with the same first name (e.g. "Amina B."). */
  lastInitial: string | null;
  /** Staff only: access code used to register; rules require it for teacher/school-admin roles. */
  teacherCode: string | null;
  /** Staff only: the school the access code belongs to. */
  schoolId: string | null;
  /** Students only: a login PIN exists (set by the server), enabling shared-tablet login. */
  hasPin?: boolean;
};

/** Firestore `teacherCodes/{code}`: school-admin codes are created in the console; teacher codes by school admins. */
export type TeacherCode = {
  code: string;
  active: boolean;
  role?: 'teacher' | 'school-admin';
  schoolId?: string | null;
  label?: string;
  createdAt?: string;
};

/** Firestore `schools/{id}`: created by the platform admin in the console. */
export type School = {
  id: string;
  name: string;
  /** The school admin confirmed parental/guardian consent is collected for students using the app. */
  consent?: { confirmedBy: string; confirmedByName: string; confirmedAt: string } | null;
};

/** Firestore `schools/{schoolId}/staff/{uid}`. */
export type StaffMember = { uid: string; name: string; role: 'teacher' | 'school-admin'; joinedAt: string };

/** Firestore `classes/{classId}/members/{studentUid}`: written by the student's app so teachers see progress. */
export type ClassMember = {
  uid: string;
  name: string;
  lastInitial: string | null;
  schoolId: string | null;
  tier: AgeTier | null;
  currentProject: string | null;
  currentStep: string | null;
  completed: number;
  badges: number;
  /** Can log in on a shared tablet with a PIN. */
  hasPin?: boolean;
  joinedAt: string;
  lastActive: string;
};

/** Firestore `classes/{classId}/notes/{studentUid}`: private teacher note (e.g. roll number). */
export type StudentNote = { text: string; updatedAt: string };

/**
 * Firestore `assignments/{studentUid}`: staff moving (`to`) or removing (`to: null`) a student.
 * Applied by the student's app, since staff cannot edit students' own profiles.
 */
export type Assignment = { to: SchoolLink | null; fromClassId: string | null; assignedBy: string; createdAt: string };

/** Firestore `levelRequests/{studentUid}`: a student's request to move tier, approved by their linked teacher. */
export type LevelRequest = {
  uid: string;
  teacherId: string;
  studentName: string;
  className: string;
  from: AgeTier | null;
  to: AgeTier;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
};

export type Group = { id: string; name: string };

/** Firestore `classes/{id}`; groups are embedded. */
export type Classroom = {
  id: string;
  ownerId: string;
  /** Teacher's first name, so school admins can see who runs the class. */
  teacherName?: string;
  schoolId: string | null;
  name: string;
  joinCode: string;
  groups: Group[];
  createdAt: string;
};

/** Firestore `classes/{classId}/outputs/{id}`; group name is denormalized for display without lookups. */
export type GroupOutput = {
  id: string;
  groupId: string;
  groupName: string;
  stage: string;
  content: string;
  createdAt: string;
};

/**
 * `communityProblems/{id}` (curated globally via console) or
 * `schoolProblems/{teacherId}/problems/{id}` (posted by a teacher for their students).
 */
export type CommunityProblem = {
  id: string;
  title: string;
  description: string;
  location: string;
  postedBy: string;
  scope: 'global' | 'school';
  teacherId: string | null;
  createdAt: string;
};

export type GalleryStatus = 'pending' | 'approved' | 'rejected';

/** Firestore `galleryItems/{portfolioId}`: a teacher-approved, minimal public snapshot of a portfolio. */
export type GalleryItem = {
  id: string;
  ownerId: string;
  teacherId: string;
  authorName: string;
  className: string;
  status: GalleryStatus;
  createdAt: string;
  reviewedAt: string | null;
  snapshot: {
    title: string;
    observation: string;
    selectedIdea: string;
    ideasCount: number;
    scamperCount: number;
    hasMaterials: boolean | null;
    prototypeLevel: number;
    designFormat: DesignFormat | null;
    iterationsCount: number;
    finalSolution: string;
    tier: AgeTier | null;
  };
};

/** Preset reactions only: peers can encourage, but cannot post free text to minors' work. */
export type ReactionKey = 'great-idea' | 'love-prototype' | 'brave-testing' | 'want-to-try';
