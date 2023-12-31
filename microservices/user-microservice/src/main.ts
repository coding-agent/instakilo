import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: "0.0.0.0",
        port: 8080,
      },
    },
  );
  await app.listen().then(() => console.log("User Microservice is listening"));
}
bootstrap();
