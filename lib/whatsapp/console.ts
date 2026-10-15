export type WhatsAppSettings = { due_enabled:boolean; overdue_enabled:boolean; welcome_enabled:boolean; receipt_enabled:boolean; trial_confirmation_enabled:boolean; trial_reminder_enabled:boolean; send_hour:number; days_before:number }
export type WhatsAppLogEntry = {
  id:string; kind:string; state:string; createdAt:string; updatedAt:string; student:string|null; guardian:string|null;
  phone:string|null; message:string; actor:{name?:string;username?:string}; attempts:number; error:string|null;
  history:Array<{at:string;finishedAt:string|null;result:string|null;actor:{name?:string;username?:string};error:string|null}>;
}
export type WhatsAppConsole = { entries:WhatsAppLogEntry[]; total:number; settings:WhatsAppSettings; workerLastSeen:string|null }
