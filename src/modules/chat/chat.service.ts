import { BadRequestException, Injectable } from "@nestjs/common";
import { ChatDatabaseService } from "./database/database.service";

@Injectable()
export class ChatService {
  constructor(private readonly db: ChatDatabaseService) {}

  async getConversationsByUserId(userId: string): Promise<any> {
    return await this.db.getConversationsByUserId(userId);
  }

  async createConversation(message: any) {
    return await this.db.createConversation(message);
  }

  async storeMessage(conversationId: string, message: any) {
    return await this.db.saveMessage(conversationId, message);
  }

  async conversationExistsForUsers(message: any) {
    return await this.db.conversationExistsForUsers(
      message.senderId,
      message.recipientId,
    );
  }

  async getAll() {
    return await this.db.getAll();
  }

  async getMessagesByConversationId(conversationId: string) {
    return await this.db.getMessagesByConversationId(conversationId);
  }

  async markMessageAsViewed(data: any) {
    if (await this.db.markMessageAsViewed(data)) {
      return { message: "Message marked as viewed" };
    }
    throw new BadRequestException("Message not found");
  }
}
