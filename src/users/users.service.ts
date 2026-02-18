import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async getUsers(payload: GetUsersDto): Promise<{ tableData: User[]; tableCount: number }> {
        const { filters, search, options, projection } = payload;
        const pipeline: PipelineStage[] = [];

        // 1. Filtering
        const matchStage: any = {};

        if (filters) {
            if (typeof filters.isVerified === 'boolean') {
                matchStage.isVerified = filters.isVerified;
            }

            const dateRange: any = {};
            if (filters.createdFrom) {
                dateRange.$gte = new Date(filters.createdFrom);
            }
            if (filters.createdTo) {
                dateRange.$lte = new Date(filters.createdTo);
            }
            if (Object.keys(dateRange).length > 0) {
                matchStage.createdAt = dateRange;
            }
        }

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        // 2. Searching
        if (search && search.length > 0) {
            const searchConditions: Record<string, any>[] = [];
            for (const item of search) {
                if (!item.term || !item.fields || item.fields.length === 0) continue;

                const term = item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
                let regexPattern: string;

                if (item.startsWith && item.endsWith) {
                    regexPattern = `^${term}$`;
                } else if (item.startsWith) {
                    regexPattern = `^${term}`;
                } else if (item.endsWith) {
                    regexPattern = `${term}$`;
                } else {
                    regexPattern = term;
                }

                for (const field of item.fields) {
                    searchConditions.push({ [field]: { $regex: new RegExp(regexPattern, 'i') } });
                }
            }

            if (searchConditions.length > 0) {
                pipeline.push({ $match: { $or: searchConditions } });
            }
        }

        // 3. Sorting
        const sortStage: any = {};
        if (options && options.sortBy && options.sortBy.length > 0) {
            options.sortBy.forEach((field, index) => {
                const sortOrder = options.sortDesc && options.sortDesc[index] ? -1 : 1;
                sortStage[field] = sortOrder;
            });
        } else {
            sortStage.createdAt = -1; // Default sort
        }
        pipeline.push({ $sort: sortStage });

        // 4. Projection
        if (projection && Object.keys(projection).length > 0) {
            pipeline.push({ $project: projection });
        } else {
            // Default projection: Exclude password
            pipeline.push({ $project: { password: 0 } });
        }

        // 5. Pagination (Facet for count and data)
        // Ensure defaults if options is undefined or properties are missing
        const page = (options?.page && options.page > 0) ? options.page : 1;
        const limit = (options?.itemsPerPage && options.itemsPerPage > 0) ? options.itemsPerPage : 10;
        const skip = (page - 1) * limit;

        const facetStage: PipelineStage = {
            $facet: {
                tableData: [{ $skip: skip }, { $limit: limit }],
                tableCount: [{ $count: 'count' }]
            }
        };
        pipeline.push(facetStage);

        const result = await this.userModel.aggregate(pipeline);

        const tableData = result[0]?.tableData || [];
        const tableCount = result[0]?.tableCount?.[0]?.count || 0;

        return { tableData, tableCount };
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const createdUser = new this.userModel(createUserDto);
        return createdUser.save();
    }

    async createVerifiedUser(createUserDto: CreateUserDto): Promise<User> {
        const createdUser = new this.userModel({
            ...createUserDto,
            isVerified: true,
        });
        return createdUser.save();
    }



    async findOne(id: string): Promise<User> {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        if (updateUserDto.password) {
            const salt = await bcrypt.genSalt(10);
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
        }

        const updatedUser = await this.userModel
            .findByIdAndUpdate(id, updateUserDto, { new: true })
            .exec();
        if (!updatedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return updatedUser;
    }

    async remove(id: string): Promise<User> {
        const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
        if (!deletedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return deletedUser;
    }
}
