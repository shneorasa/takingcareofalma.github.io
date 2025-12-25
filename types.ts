
export type TaskType = 'איסוף' | 'ארוחה' | 'מקלחת והשכבה' | 'לינה' | 'עזרה כללית';

export interface CareTask {
  id: string;
  shiftId: string;
  taskType: TaskType;
  description: string;
  time: string;
  assignedTo?: string; // Family Member ID
  dateLabel: string;
}

export interface FlightShift {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  dateLabel: string; // The specific date for display (e.g., 25/10/2024)
  careStart: string;
  careEnd: string;
  status: 'ממתין' | 'מאויש' | 'הסתיים';
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'אמא' | 'אבא' | 'סבתא' | 'סבא';
  avatar: string;
  isAdmin: boolean;
}

export interface ExtractionResult {
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  dateLabel: string;
  careStart: string;
  careEnd: string;
  suggestedTasks: { type: TaskType; description: string; time: string; dateLabel: string }[];
}
