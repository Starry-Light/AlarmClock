export interface Alarm {
  id: string;
  time: Date;
  label: string;
  enabled: boolean;
  repeatDays: RepeatDay[];
  notificationId?: string;
}

export type RepeatDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const DAYS: RepeatDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface AlarmFormData {
  time: Date;
  label: string;
  repeatDays: RepeatDay[];
}
