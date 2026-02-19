import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../services/users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccessToken,
  AccessTokenDocument,
} from '../db/models/access-token.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @InjectModel(AccessToken.name)
    private accessTokenModel: Model<AccessTokenDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // Enable Request access
    } as StrategyOptionsWithRequest);
  }

  async validate(req: any, payload: { sub: string; email: string }) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const extractor = (ExtractJwt as any).fromAuthHeaderAsBearerToken() as (
      req: any,
    ) => string | null;
    const token = extractor(req);

    // Check if token exists in DB (Revocation check)
    const tokenDoc = await this.accessTokenModel.findOne({ token });

    if (!tokenDoc) {
      this.logger.warn(`Token validation FAILED. Token not found in DB.`);
      throw new UnauthorizedException('Token revoked or invalid');
    }

    // Compare UserIDs as strings to avoid ObjectId type mismatch issues
    const dbUserId = tokenDoc.userId.toString();
    const payloadUserId = payload.sub.toString();

    if (dbUserId !== payloadUserId) {
      this.logger.warn(
        `Token validation FAILED for user [${payloadUserId}]. Mismatch with DB userId [${dbUserId}]`,
      );
      throw new UnauthorizedException('Token revoked or invalid');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      this.logger.warn(`User [${payload.sub}] not found in DB.`);
      throw new UnauthorizedException();
    }
    return user;
  }
}
