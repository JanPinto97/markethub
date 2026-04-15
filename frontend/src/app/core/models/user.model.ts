export interface User {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  role: 'user' | 'moderator' | 'superadmin';
  createdAt: string;
}
