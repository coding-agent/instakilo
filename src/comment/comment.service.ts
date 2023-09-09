import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as Nano from 'nano';
import { CreateCommentDto } from './dto/create-comment.dto';
import { DATABASES } from './types';

@Injectable()
export class CommentService {
  private readonly couchdb: Nano.ServerScope;
  constructor() {
    this.couchdb = Nano(
      'http://admin:ifThisPasswordIsHackedTheWorldIsUnsafe@localhost:5984',
    );
  }

  async createComment(comment: CreateCommentDto): Promise<Nano.DocumentInsertResponse> {
    const db = await this.getDB(DATABASES.COMMENTS);
    const data = {
      postId: comment.postId,
      username: comment.username,
      comment: comment.comment,
      createdAt: Date.now
    };
    const result = await db.insert(data as any);
    console.log(result);
    return result;
  }

  async getAllComments(): Promise<Nano.DocumentListResponse<unknown>> {
    const db = await this.getDB(DATABASES.COMMENTS);
    const result = await db.list({include_docs: true})
    console.log(result);
    return result;
  }

  async getAllCommentsByPostId(postId: string): Promise<any> {
    const db = await this.getDB(DATABASES.COMMENTS);
    const result = await db.find({
        selector: {
            "postId": postId
        }, fields: ["_id", "_rev", "postId", "username", "comment"]
    })
    console.log(result);
    return result;
  }

  async getDB(db: DATABASES) {
    try {
      await this.couchdb.db.create(db);
    } catch (error) {
      //check if DB already exists
      if (error.errid === 'non_200') return this.couchdb.db.use(db);
    }
  }
}