import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { generateSlug } from "../../utils/generate-slug";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDTO } from "./dto/create-event.dto";
import { GetEventDTO } from "./dto/get-event.dto";

type TicketPayload = {
  name: string;
  price: number;
  quota: number;
  description?: string;
};
export class EventService {
  prisma: PrismaService;
  cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
  }

  createEvent = async (
    body: CreateEventDTO,
    image: Express.Multer.File,
    authUserId: number
  ) => {
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: authUserId },
      select: { organizer_id: true },
    });

    if (!organizer) {
      throw new ApiError("Organizer profile not found for this user.", 403);
    }

    // 1. cari dulu data blog di db berdasarkan title
    const event = await this.prisma.event.findFirst({
      where: { title: body.title },
    });

    // 2. kalau sudah ada throw error
    if (event)
      throw new ApiError(
        "The event name already exists, please change the event name.!",
        400
      );

    let tickets: TicketPayload[] = [];
    try {
      const raw = (body as any).tickets; // karena multipart -> string
      tickets = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      throw new ApiError("Invalid tickets format. Must be a JSON array.", 400);
    }

    if (!Array.isArray(tickets) || tickets.length < 1) {
      throw new ApiError("At least 1 ticket type is required.", 400);
    }

    // 3) validasi isi tickets
    for (const [i, t] of tickets.entries()) {
      if (!t?.name || t.name.trim().length < 1) {
        throw new ApiError(`Ticket #${i + 1}: name is required.`, 400);
      }
      if (typeof t.price !== "number" || Number.isNaN(t.price) || t.price < 0) {
        throw new ApiError(`Ticket #${i + 1}: price must be >= 0.`, 400);
      }
      if (
        typeof t.quota !== "number" ||
        !Number.isInteger(t.quota) ||
        t.quota < 1
      ) {
        throw new ApiError(`Ticket #${i + 1}: quota must be at least 1.`, 400);
      }
    }
    // 3. upload image ke cloudinary
    const { secure_url } = await this.cloudinaryService.upload(image);

    // 4. buat slug
    const slug = generateSlug(body.title);

    // 4. insert data event ke database
    await this.prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        start_date: new Date(body.start_date),
        end_date: new Date(body.end_date),
        location: body.location,
        image: secure_url,
        slug,
        category_id: Number(body.category_id),
        organizer_id: organizer.organizer_id,

        tickets: {
          create: tickets.map((t) => ({
            name: t.name.trim(),
            price: new Prisma.Decimal(t.price),
            stock: t.quota,
            description: (t.description ?? "").trim(),
          })),
        },
      },
    });

    // 3. return message success
    return { message: "Event created successfully!" };
  };

  // event.service.ts
getEvents = async (query: GetEventDTO) => {
  const { page, take, sortBy, sortOrder, search, category_id } = query;

  const whereClause: Prisma.eventWhereInput = {};

  if (search) {
    whereClause.title = { contains: search, mode: "insensitive" };
  }

  if (category_id) {
    whereClause.category_id = category_id;
  }

  const events = await this.prisma.event.findMany({
    where: whereClause,
    take,
    skip: (page - 1) * take,
    orderBy: { [sortBy]: sortOrder },
    select: {
      event_id: true,
      title: true,
      slug: true, // ✅ dipaksa ikut
      description: true,
      start_date: true,
      end_date: true,
      location: true,
      image: true,
      category_id: true,
      created_at: true,
      updated_at: true,

      organizers: {
        select: { organization_name: true },
      },
      categories: {
        select: { category_name: true },
      },
    },
  });

  const total = await this.prisma.event.count({ where: whereClause });

  return { data: events, meta: { page, take, total } };
};

  getEventBySlug = async (slug: string) => {
  const event = await this.prisma.event.findFirst({
    where: { slug },
    include: {
      organizers: { select: { organization_name: true } },
      categories: { select: { category_name: true } }, // ✅ tambah ini
      tickets: {
        select: {
          ticket_id: true,
          name: true,
          price: true,
          stock: true,
          description: true,
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!event) throw new ApiError("Event not found", 404);
  return event;
};
}
