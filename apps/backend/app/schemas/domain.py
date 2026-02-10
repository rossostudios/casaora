from pydantic import BaseModel, Field
from typing import Any, Optional


class ListResponse(BaseModel):
    data: list[dict]


class CreateOrganizationInput(BaseModel):
    name: str
    legal_name: Optional[str] = None
    ruc: Optional[str] = None
    default_currency: str = "PYG"
    timezone: str = "America/Asuncion"


class UpdateOrganizationInput(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    ruc: Optional[str] = None
    default_currency: Optional[str] = None
    timezone: Optional[str] = None


class CreateOrganizationMemberInput(BaseModel):
    user_id: str
    role: str = "operator"
    is_primary: bool = False


class UpdateOrganizationMemberInput(BaseModel):
    role: Optional[str] = None
    is_primary: Optional[bool] = None


class CreateOrganizationInviteInput(BaseModel):
    email: str
    role: str = "operator"
    expires_in_days: Optional[int] = 14


class AcceptOrganizationInviteInput(BaseModel):
    token: str


class CreatePropertyInput(BaseModel):
    organization_id: str
    name: str
    code: Optional[str] = None
    status: str = "active"
    address_line1: Optional[str] = None
    city: str = "Asuncion"
    country_code: str = "PY"


class UpdatePropertyInput(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None


class CreateUnitInput(BaseModel):
    organization_id: str
    property_id: str
    code: str
    name: str
    max_guests: int = 2
    bedrooms: int = 1
    bathrooms: float = 1.0
    currency: str = "PYG"


class UpdateUnitInput(BaseModel):
    name: Optional[str] = None
    max_guests: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    is_active: Optional[bool] = None


class CreateChannelInput(BaseModel):
    organization_id: str
    kind: str
    name: str
    external_account_ref: Optional[str] = None


class UpdateChannelInput(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None
    external_account_ref: Optional[str] = None
    is_active: Optional[bool] = None


class CreateListingInput(BaseModel):
    organization_id: str
    unit_id: str
    channel_id: str
    external_listing_id: Optional[str] = None
    public_name: str
    ical_import_url: Optional[str] = None


class UpdateListingInput(BaseModel):
    external_listing_id: Optional[str] = None
    public_name: Optional[str] = None
    ical_import_url: Optional[str] = None
    is_active: Optional[bool] = None


class CreateGuestInput(BaseModel):
    organization_id: str
    full_name: str
    email: Optional[str] = None
    phone_e164: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    country_code: Optional[str] = None
    preferred_language: str = "es"
    notes: Optional[str] = None


class UpdateGuestInput(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_e164: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    country_code: Optional[str] = None
    preferred_language: Optional[str] = None
    notes: Optional[str] = None


class CreateReservationInput(BaseModel):
    organization_id: str
    unit_id: str
    listing_id: Optional[str] = None
    channel_id: Optional[str] = None
    guest_id: Optional[str] = None
    external_reservation_id: Optional[str] = None
    source: str = "manual"
    status: str = "pending"
    check_in_date: str
    check_out_date: str
    adults: int = 1
    children: int = 0
    infants: int = 0
    pets: int = 0
    currency: str = "PYG"
    nightly_rate: float = 0
    cleaning_fee: float = 0
    tax_amount: float = 0
    extra_fees: float = 0
    discount_amount: float = 0
    total_amount: float
    amount_paid: float = 0
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class UpdateReservationInput(BaseModel):
    guest_id: Optional[str] = None
    amount_paid: Optional[float] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class ReservationStatusInput(BaseModel):
    status: str
    reason: Optional[str] = None


class CreateCalendarBlockInput(BaseModel):
    organization_id: str
    unit_id: str
    starts_on: str
    ends_on: str
    source: str = "manual"
    reason: Optional[str] = None


class UpdateCalendarBlockInput(BaseModel):
    starts_on: Optional[str] = None
    ends_on: Optional[str] = None
    reason: Optional[str] = None


class CreateTaskInput(BaseModel):
    organization_id: str
    title: str
    type: str = "custom"
    status: str = "todo"
    priority: str = "medium"
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    reservation_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    description: Optional[str] = None
    due_at: Optional[str] = None


class UpdateTaskInput(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_user_id: Optional[str] = None
    description: Optional[str] = None
    due_at: Optional[str] = None


class CompleteTaskInput(BaseModel):
    completion_notes: Optional[str] = None


class CreateTaskItemInput(BaseModel):
    label: str
    is_required: bool = True
    sort_order: Optional[int] = None


class UpdateTaskItemInput(BaseModel):
    label: Optional[str] = None
    is_required: Optional[bool] = None
    is_completed: Optional[bool] = None
    sort_order: Optional[int] = None


class CreateExpenseInput(BaseModel):
    organization_id: str
    category: str
    expense_date: str
    amount: float
    currency: str = "PYG"
    fx_rate_to_pyg: Optional[float] = Field(default=None, gt=0)
    payment_method: str = "bank_transfer"
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    reservation_id: Optional[str] = None
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_ruc: Optional[str] = None
    receipt_url: str
    notes: Optional[str] = None


class UpdateExpenseInput(BaseModel):
    category: Optional[str] = None
    expense_date: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    fx_rate_to_pyg: Optional[float] = Field(default=None, gt=0)
    payment_method: Optional[str] = None
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    reservation_id: Optional[str] = None
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_ruc: Optional[str] = None
    receipt_url: Optional[str] = None
    notes: Optional[str] = None


class CreateOwnerStatementInput(BaseModel):
    organization_id: str
    period_start: str
    period_end: str
    currency: str = "PYG"
    property_id: Optional[str] = None
    unit_id: Optional[str] = None


class CreateMessageTemplateInput(BaseModel):
    organization_id: str
    template_key: str
    name: str
    channel: str = "whatsapp"
    language_code: str = "es-PY"
    subject: Optional[str] = None
    body: str
    variables: list[str] = Field(default_factory=list)


class SendMessageInput(BaseModel):
    organization_id: str
    channel: str
    recipient: str
    template_id: Optional[str] = None
    reservation_id: Optional[str] = None
    guest_id: Optional[str] = None
    variables: Optional[dict[str, Any]] = None
    scheduled_at: Optional[str] = None
