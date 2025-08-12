import type { Role } from './roles';

export const mockUsers: ReadonlyArray<{ username: string; password: string; role: Role }> = [
  { username: 'brennan', password: 'pob123', role: 'User' },
  { username: 'ops', password: 'pob123', role: 'Viewer' },
];
