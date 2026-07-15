import { BadRequestException, ConflictException } from "@nestjs/common";
import { Repository } from "typeorm";
import { SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { EventRegistration } from "../database/entities/event-registration.entity";
import { Event, EventStatus } from "../database/entities/event.entity";
import { EventsService } from "./events.service";

describe("EventsService", () => {
  const organizer = { id: "11111111-1111-4111-8111-111111111111", displayName: "运营" } as User;
  const event = { id: "22222222-2222-4222-8222-222222222222", title: "行业圆桌", status: EventStatus.PUBLISHED, startsAt: new Date(Date.now() + 86_400_000), endsAt: new Date(Date.now() + 172_800_000), registrationDeadline: null, capacity: 1, registrationFields: [{ key: "company", label: "公司", required: true }], organizer } as Event;
  const events = { findOneBy: jest.fn(), findOne: jest.fn(), findAndCount: jest.fn(), create: jest.fn((value) => value), save: jest.fn() } as unknown as Repository<Event>;
  const registrations = { findOne: jest.fn(), count: jest.fn(), create: jest.fn((value) => value), save: jest.fn(), find: jest.fn() } as unknown as Repository<EventRegistration>;
  const notifications = { create: jest.fn() };
  const service = new EventsService(events, registrations, notifications as never);
  const user = { id: "33333333-3333-4333-8333-333333333333", email: "member@example.com", roles: [SystemRole.USER] };
  beforeEach(() => { jest.clearAllMocks(); (events.findOneBy as jest.Mock).mockReset().mockResolvedValue(event); (registrations.findOne as jest.Mock).mockReset().mockResolvedValue(null); (registrations.count as jest.Mock).mockReset().mockResolvedValue(0); });
  it("rejects a registration after its deadline", async () => { (events.findOneBy as jest.Mock).mockResolvedValue({ ...event, registrationDeadline: new Date(Date.now() - 1) }); await expect(service.register(event.id, { formData: { company: "OPC" } }, user)).rejects.toBeInstanceOf(BadRequestException); });
  it("rejects a registration once confirmed capacity is full", async () => { (registrations.count as jest.Mock).mockResolvedValue(1); await expect(service.register(event.id, { formData: { company: "OPC" } }, user)).rejects.toBeInstanceOf(ConflictException); });
  it("requires configured registration fields", async () => { await expect(service.register(event.id, { formData: {} }, user)).rejects.toBeInstanceOf(BadRequestException); });
});
