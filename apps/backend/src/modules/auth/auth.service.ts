import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  private users = [
    {
      id: '1',
      username: 'doctor',
      password: '123456',
      role: 'doctor',
    },
    {
      id: '2',
      username: 'technician',
      password: '123456',
      role: 'technician',
    },
  ];

  async login(username: string, password: string) {
    const user = this.users.find(
      (u) =>
        u.username === username &&
        u.password === password,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }
}

