type MotorStatus = 'pending' | 'generating' | 'done' | 'error';

const state = new Map<string, { status: MotorStatus; updatedAt: Date }>();

export function setMotorState(userId: number, motorType: string, status: MotorStatus): void {
  state.set(`${userId}:${motorType}`, { status, updatedAt: new Date() });
}

export function getAllMotorState(userId: number): Record<string, MotorStatus> {
  const prefixes = ['synthesis', 'abp', 'plan', 'slides', 'ficha', 'quiz', 'tutor', 'pdc', 'recalibrate', 'micro', 'alpha2'];
  const result: Record<string, MotorStatus> = {};
  for (const prefix of prefixes) {
    const key = `${userId}:${prefix}`;
    const entry = state.get(key);
    result[prefix] = entry?.status || 'pending';
  }
  return result;
}
