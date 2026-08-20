export type LearningSummary = {
  typicalPatients?: string;
  typicalSymptoms?: string[];
  keyPoint?: string;
  differentialDiagnosis?: string[];
};

export type PhysicalExam = {
  name?: string;
  target?: string;
  method?: string;
  positiveFinding?: string;
  meaning?: string;
  imageUrl?: string;
};

export type ImagingGuide = {
  preferredTests?: string[];
  readingPoints?: string[];
  commonPitfalls?: string[];
};

export type DecisionStep = {
  id?: string | number;
  question?: string;
  yes?: string;
  no?: string;
  note?: string;
};

export type DecisionFlow = {
  title?: string;
  disclaimer?: string;
  steps?: DecisionStep[];
};

export type WorkflowStep = {
  stepId?: string;
  title?: string;
  tasks?: string[];
};

export type ProcedureRef = {
  id: string;
  name: string;
  englishName?: string;
  summary?: string;
  pro?: boolean;
  status?: "preview" | "published" | "updating";
};

export type ApproachRef = {
  id: string;
  name: string;
  englishName?: string;
};

export type ProcedureData = {
  id: string;
  name: string;
  englishName?: string;
  relatedDiseaseIds?: string[];
  summary?: string;
  indications?: string[];
  contraindications?: string[];
  preopImaging?: string[];
  positioning?: string[];
  cArm?: string[];
  instruments?: string[];
  approachRefs?: ApproachRef[];
  reductionSequence?: string[];
  fixationStrategy?: string[];
  intraopChecks?: string[];
  failureModes?: string[];
  bailout?: string[];
  postopFramework?: string[];
  evidenceUpdatedAt?: string;
  reviewStatus?: "draft" | "evidence_checked" | "human_reviewed";
};

export type DiseaseData = {
  id: string;
  name: string;
  englishName: string;
  searchKeywords?: string;
  viewCount: number;
  hasClassification?: boolean;
  classifications?: any[];
  commonImages?: any[];
  workflowSteps?: WorkflowStep[];
  quickActions?: {
    writeMedicalRecord?: string;
    prescribe?: string;
    sutureRemoval?: string;
    emergencyHandling?: string;
  };
  surgeryTable?: {
    headers?: string[];
    rows?: any[][];
  };
  rehabPlan?: any[];
  learningSummary?: LearningSummary;
  physicalExams?: PhysicalExam[];
  imagingGuide?: ImagingGuide;
  decisionFlow?: DecisionFlow;
  templateVersion?: string;
  procedureRefs?: ProcedureRef[];
  approachRefs?: ApproachRef[];
  patientView?: any;
};

export type DiseaseMode = "work" | "study" | "procedure";
