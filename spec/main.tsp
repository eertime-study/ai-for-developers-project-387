import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({
  title: "Календарь звонков API",
  version: "1.2.0"
})
namespace CallCalendar;

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

enum SlotStatus {
  available: "available",
  booked: "booked",
  past: "past",
  outsideWindow: "outside_window"
}

enum ErrorCode {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EVENT_TYPE_NOT_FOUND: "EVENT_TYPE_NOT_FOUND",
  EVENT_TYPE_ALREADY_EXISTS: "EVENT_TYPE_ALREADY_EXISTS",
  SLOT_ALREADY_BOOKED: "SLOT_ALREADY_BOOKED",
  SLOT_OUTSIDE_BOOKING_WINDOW: "SLOT_OUTSIDE_BOOKING_WINDOW",
  SLOT_IN_PAST: "SLOT_IN_PAST",
  INVALID_GUEST_EMAIL: "INVALID_GUEST_EMAIL"
}

// -----------------------------------------------------------------------------
// Доменные модели
// -----------------------------------------------------------------------------

/**
 * Владелец календаря.
 * В рамках проекта владелец один и заранее задан.
 * Авторизация и личный кабинет не реализуются.
 */
model Owner {
  id: string;
  name: string;
  timeZone: string;
}

/**
 * Тип события для бронирования встречи.
 */
model EventType {
  id: string;
  title: string;
  description: string;
  durationInMinutes: int32;
}

/**
 * Временной слот в календаре.
 */
model Slot {
  startTime: utcDateTime;
  endTime: utcDateTime;
  status: SlotStatus;
}

/**
 * Ответ со слотами для выбранного типа события.
 *
 * Семантика:
 * - `slots[]` — единственный источник правды для фронта: какие слоты показывать
 *   и в каком статусе. Никаких дополнительных правил фронт не вычисляет.
 * - Окно записи — 14 дней, начиная с текущего момента (`windowStart` … `windowEnd`).
 * - Все времена возвращаются в UTC (`utcDateTime`); человеческое представление
 *   формируется фронтом по `Owner.timeZone`.
 * - Статус `outside_window` означает «слот вне окна записи» (т.е. за пределами
 *   14-дневного окна). Он не описывает рабочие часы или какие-либо иные правила.
 */
model SlotListResponse {
  eventTypeId: string;
  eventTypeTitle: string;
  durationInMinutes: int32;
  timeZone: string;
  windowStart: utcDateTime;
  windowEnd: utcDateTime;
  slots: Slot[];
}

/**
 * Созданное бронирование.
 */
model Booking {
  id: string;
  eventTypeId: string;
  startTime: utcDateTime;
  endTime: utcDateTime;
  guestName: string;
  guestEmail: string;
  notes?: string;
  createdAt: utcDateTime;
}

/**
 * Расширенная модель бронирования для панели владельца календаря.
 * Нужна, чтобы фронтенд мог отобразить список встреч без дополнительных запросов
 * за названием и длительностью типа события.
 */
model AdminBooking {
  ...Booking;
  eventTypeTitle: string;
  durationInMinutes: int32;
}

/**
 * Подтверждение бронирования, возвращаемое гостю после успешного `POST /bookings`.
 * Содержит название и длительность типа события, чтобы экран успеха мог
 * отобразить полные данные без дополнительного запроса за `EventType`.
 */
model GuestBookingConfirmation {
  ...Booking;
  eventTypeTitle: string;
  durationInMinutes: int32;
}

// -----------------------------------------------------------------------------
// Payloads
// -----------------------------------------------------------------------------

model BookingRequest {
  eventTypeId: string;
  startTime: utcDateTime;
  guestName: string;
  guestEmail: string;
  notes?: string;
}

model EventTypeCreateRequest {
  /**
   * Владелец явно задает уникальный идентификатор типа события.
   * Например: "intro-call" или "consultation-30".
   */
  id: string;

  title: string;
  description: string;
  durationInMinutes: int32;
}

// -----------------------------------------------------------------------------
// Ошибки
// -----------------------------------------------------------------------------

@error
model BadRequestError {
  @statusCode statusCode: 400;
  code: ErrorCode;
  message: string;
  field?: string;
}

@error
model NotFoundError {
  @statusCode statusCode: 404;
  code: ErrorCode;
  message: string;
}

@error
model ConflictError {
  @statusCode statusCode: 409;
  code: ErrorCode;
  message: string;
}

// -----------------------------------------------------------------------------
// Публичные сценарии гостя
// -----------------------------------------------------------------------------

interface GuestOperations {
  @summary("Получить профиль владельца календаря и его таймзону")
  @route("/owner")
  @get
  op getOwner(): Owner;

  @summary("Получить список всех доступных типов событий")
  @route("/event-types")
  @get
  op listEventTypes(): EventType[];

  @summary("Получить детальную информацию о конкретном типе события")
  @route("/event-types/{id}")
  @get
  op getEventType(
    @path id: string
  ): EventType | NotFoundError;

  @summary("Получить сетку слотов на 14 дней для выбранного типа события")
  @route("/event-types/{id}/slots")
  @get
  op listSlots(
    @path id: string
  ): SlotListResponse | NotFoundError;

  @summary("Забронировать выбранный временной слот")
  @route("/bookings")
  @post
  op createBooking(
    @body booking: BookingRequest
  ): GuestBookingConfirmation | BadRequestError | NotFoundError | ConflictError;
}

// -----------------------------------------------------------------------------
// Административные сценарии владельца календаря
// -----------------------------------------------------------------------------

@route("/admin")
interface AdminOperations {
  @summary("Создать новый тип события с явным id")
  @route("/event-types")
  @post
  op createEventType(
    @body eventType: EventTypeCreateRequest
  ): EventType | BadRequestError | ConflictError;

  @summary("Посмотреть список всех предстоящих встреч в обогащенном формате")
  @route("/bookings")
  @get
  op listUpcomingBookings(): AdminBooking[];
}
