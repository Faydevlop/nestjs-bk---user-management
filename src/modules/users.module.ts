import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from '../services/users/users.service';
import { UsersController } from '../controller/users/users.controller';
import { User, UserSchema } from '../db/models/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export so AuthModule can use it
})
export class UsersModule {}
