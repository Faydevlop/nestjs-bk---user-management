import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccessToken, AccessTokenDocument } from './schemas/access-token.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
        @InjectModel(AccessToken.name) private accessTokenModel: Model<AccessTokenDocument>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
            passReqToCallback: true, // Enable Request access
        });
    }

    async validate(req: any, payload: any) {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

        // Check if token exists in DB (Revocation check)
        const isTokenValid = await this.accessTokenModel.findOne({
            token,
            userId: payload.sub
        });

        if (!isTokenValid) {
            throw new UnauthorizedException('Token revoked or invalid');
        }

        const user = await this.usersService.findOne(payload.sub);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}
