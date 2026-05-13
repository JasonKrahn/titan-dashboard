// Active API adapter. Swap this re-export for the supabase adapter later.
export * from "./adapters/prototype";
export type { ProjectDetail, PhaseDetail, MaterialLog, EquipmentLog, CompleteInspectionInput, CreateDeficiencyInput, UpdateDeficiencyInput, CreateSubcontractorInput, UpdateSubcontractorInput } from "@/lib/types";
export type { BlockSiteCheckInput, UnblockSiteCheckInput, UpdateProjectNotesInput, UpdateAtticGateInput, UploadPhotoEvidenceInput, CreateUserInput, UpdateUserInput, MarkPhaseReadyForInspectionInput, UpdateProjectInput, UpdatePhaseInput, UpdatePhaseMaterialInput, UpdateProjectEquipmentInput } from "./adapters/prototype";
