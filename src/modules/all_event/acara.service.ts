import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAcaraDTO } from "./dto/create-acara.dto";

export class AcaraService {
  prisma: PrismaService;
  cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
  }

  getAcaras = async () => {
    const acaras = await this.prisma.acara.findMany();
    return acaras;
  };

  createAcara = async (
    body: CreateAcaraDTO, 
    image: Express.Multer.File
  ) => {
    // 1. upload ke cloudinary
    const { secure_url } = await this.cloudinaryService.upload(image);

    // 2. insert ke database
    await this.prisma.acara.create({
      data: { ...body, image: secure_url },
    });

    // 3. return message success
    return {message: "Acara berhasil dibuat!"};
  };
}
