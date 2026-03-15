import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ token: string }> {
    const existing = await this.pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email, passwordHash, displayName],
    );

    const user = result.rows[0];
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { token };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string }> {
    const result = await this.pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { token };
  }

  async validateUser(payload: { sub: string }): Promise<Record<string, any>> {
    const result = await this.pool.query(
      `SELECT id, email, display_name, role, created_at, updated_at
       FROM users WHERE id = $1`,
      [payload.sub],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return result.rows[0];
  }

  async getProfile(userId: string): Promise<Record<string, any>> {
    return this.validateUser({ sub: userId });
  }
}
