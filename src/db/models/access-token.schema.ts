import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AccessTokenDocument = HydratedDocument<AccessToken>;

@Schema({ timestamps: true, versionKey: false })
export class AccessToken {
  @Prop({ required: true })
  token: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 'USER' })
  role: string;

  @Prop({ type: Date, expires: '60m', default: Date.now }) // Auto-expire matches JWT expiry
  createdAt: Date;
}

export const AccessTokenSchema = SchemaFactory.createForClass(AccessToken);
