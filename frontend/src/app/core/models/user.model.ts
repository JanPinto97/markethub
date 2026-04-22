export interface User {
  id: string;
  username: string;
  email?: string;
  avatar: string;
  coverImage?: string;
  bio: string;
  role: 'user' | 'moderator' | 'superadmin';
  createdAt: string;
}
