import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema({ timestamps: true, versionKey: false })
export class Otp {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    otp: string;

    @Prop({ required: true, enum: ['SIGNUP', 'PASSWORD'] })
    type: string;

    @Prop({ type: Date, expires: 300, default: Date.now }) // Auto-expire after 5 minutes (300s)
    createdAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
