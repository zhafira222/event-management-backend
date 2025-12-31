import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDTO } from "./dto/create-event.dto";

export class EventService {
  prisma: PrismaService;
  cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
  }

  getEvents = async () => {
    const events = await this.prisma.event.findMany();
    return events;
  };

  createEvent = async (
    body: CreateEventDTO, 
    image: Express.Multer.File
  ) => {
    // 1. upload ke cloudinary
    const { secure_url } = await this.cloudinaryService.upload(image);

    // 2. insert ke database
    await this.prisma.event.create({
      data: { ...body, image: secure_url },
    });

    // 3. return message success
    return {message: "event creation success!"};
  };
}
