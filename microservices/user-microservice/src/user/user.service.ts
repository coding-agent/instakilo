import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  FollowUserDto,
  LoggedUserDto,
  ProfileUpdateDto,
  UniqueUser,
} from "../dto/user-dto/index";
import { IUser, IUserAndFollowing, followOrUnfollow } from "../types/index";
import { UserPrismaService } from "../user-prisma/user-prisma.service";
import {
  Ctx,
  EventPattern,
  Payload,
  TcpContext,
  MessagePattern,
  MessageHandler,
} from "@nestjs/microservices";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { RegistrationDto } from "../dto";

@Injectable()
export class UserService {
  constructor(private userPrisma: UserPrismaService) {}

  private async checkIfUserAlreadyFollows(
    follower: FollowUserDto,
  ): Promise<boolean> {
    const userAndFollowingList: IUserAndFollowing =
      await this.userPrisma.user.findUnique({
        where: {
          username: follower.username,
        },
        include: {
          following: true,
        },
      });

    let isFollowing = false;
    userAndFollowingList.following.map((eachFollow) => {
      if (eachFollow.username == follower.username) {
        isFollowing = true;
      }
    });

    return isFollowing;
  }

  private async findUser(userToFollowReq: FollowUserDto) {
    const userToFollow = await this.userPrisma.user.findUnique({
      where: {
        username: userToFollowReq.username,
      },
    });

    return userToFollow;
  }

  private async addFollowing(follower: any, userToFollow: IUser) {
    const followingResponse = await this.userPrisma.following.create({
      data: {
        user: {
          connect: {
            username: follower.username,
          },
        },
        following: userToFollow.username,
      },
    });

    return followingResponse;
  }

  private async removeFollowing(follower: any, userToUnfollow: IUser) {
    const unfollowResponse = await this.userPrisma.following.deleteMany({
      where: {
        user: {
          username: follower.username,
        },
        following: userToUnfollow.username,
      },
    });

    return { unfollowResponse };
  }

  async createUser(dto: RegistrationDto) {
    try {
      const user = await this.userPrisma.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          hash: dto.password,
          profile: {
            create: {
              photo_url: "",
              bio: "",
              followerCount: 0,
              followsCount: 0,
            },
          },
        },
      });

      return {
        message: "User Registered successfully",
        userId: user.id,
      };
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          return { message: "Username or email already exist", status: 400 };
        } else {
          return { message: err.message, status: 400 };
        }
      }
    }
  }

  async findOneUser(dto: any): Promise<UniqueUser> {
    return await this.userPrisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
  }

  async logout(user: any) {
    const { username, hashedRefreshToken } =
      await this.userPrisma.user.findFirst({
        where: {
          username: user.username,
          email: user.email,
          id: user.uuid,
        },
      });
    if (!username) {
      throw new InternalServerErrorException("unable to find user");
    }

    if (hashedRefreshToken === null) {
      return false;
    }

    return await this.userPrisma.user.update({
      where: {
        username: user.username,
        email: user.email,
        id: user.uuid,
      },
      data: {
        hashedRefreshToken: null,
      },
    });
  }

  async storeRefreshToken(id: string, hashedRefreshToken: string) {
    try {
      return await this.userPrisma.user.update({
        where: {
          id,
        },
        data: {
          hashedRefreshToken,
        },
      });
      console.log(hashedRefreshToken);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async follow(follower: any, userToFollowReq: FollowUserDto) {
    try {
      if (follower.username === userToFollowReq.username)
        throw new BadRequestException("User can't follow self account");

      if (await this.checkIfUserAlreadyFollows(follower)) {
        throw new BadRequestException(
          "User Already follows " + userToFollowReq.username,
        );
      }

      const userToFollow = await this.findUser(userToFollowReq);

      if (!userToFollow) {
        throw new ForbiddenException("User to follow not found");
      }

      const followingResponse = await this.addFollowing(follower, userToFollow);

      return {
        message: "User Followed successfully",
        followingResponse,
      };
    } catch (error) {
      return error;
    }
  }

  async unfollow(follower: any, userToFollowReq: FollowUserDto) {
    try {
      if (!(await this.checkIfUserAlreadyFollows(follower))) {
        throw new BadRequestException(
          "User already does not follow " + userToFollowReq.username,
        );
      }

      const userToUnfollow = await this.findUser(userToFollowReq);

      const unfollowResponse = await this.removeFollowing(
        follower,
        userToUnfollow,
      );

      return {
        message: "Unfollowed successfully",
        unfollowResponse,
      };
    } catch (error) {
      return { error };
    }
  }

  async updateProfile(user: LoggedUserDto, dto: ProfileUpdateDto) {
    return await this.userPrisma.profile.upsert({
      where: {
        username: user.username,
      },
      update: {
        bio: dto.bio,
        photo_url: dto.photo_url,
      },
      create: {
        user: {
          connect: {
            username: user.username,
          },
        },
        photo_url: dto.photo_url,
        bio: dto.bio,
      },
    });
  }

  async getProfile(username: string) {
    const profile = await this.userPrisma.profile.findUnique({
      where: {
        username,
      },
    });

    if (!profile) throw new NotFoundException("No User found");

    return profile;
  }
}