"""Clinic registration schemas (the public "Register Your Clinic" form).

Mirrors public.clinic_registration (migration 20261026163128). Multi-select
answers are stable keys, not localized labels, so EN/ES submissions match.
"""

from __future__ import annotations

import re
from enum import Enum

from pydantic import BaseModel, Field, field_validator

from api.schemas.reports import _EMAIL_RE

_MAX = 2000


class ClinicType(str, Enum):
    fqhc = "fqhc"
    free = "free"
    mental = "mental"
    pharmacy = "pharmacy"
    hospital = "hospital"
    planned_parenthood = "planned_parenthood"
    dental = "dental"
    other = "other"


class ClinicService(str, Enum):
    primary_care = "primary_care"
    dental = "dental"
    mental_health = "mental_health"
    pharmacy = "pharmacy"
    womens_health = "womens_health"
    pediatrics = "pediatrics"
    vision = "vision"
    hiv_aids = "hiv_aids"
    substance_abuse = "substance_abuse"
    chronic_disease = "chronic_disease"
    prenatal_obgyn = "prenatal_obgyn"
    vaccinations = "vaccinations"


class PatientType(str, Enum):
    uninsured = "uninsured"
    medicaid = "medicaid"
    medicare = "medicare"
    sliding_scale = "sliding_scale"
    marketplace = "marketplace"


class DispenseOption(str, Enum):
    low_cost = "low_cost"
    program_340b = "340b"
    no = "no"


class Language(str, Enum):
    en = "en"
    es = "es"
    ht = "ht"
    pt = "pt"
    other = "other"


class Plan(str, Enum):
    basic = "basic"
    featured = "featured"
    partner = "partner"


class ClinicRegistrationSubmission(BaseModel):
    clinic_name: str = Field(min_length=1, max_length=300)
    clinic_type: ClinicType
    zip: str = Field(min_length=1, max_length=20)
    phone: str = Field(min_length=1, max_length=50)
    address: str = Field(min_length=1, max_length=500)
    website: str | None = Field(default=None, max_length=500)
    hours: str = Field(min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=_MAX)
    contact_name: str = Field(min_length=1, max_length=200)
    contact_role: str = Field(min_length=1, max_length=200)
    contact_email: str = Field(min_length=1, max_length=320)
    contact_phone: str | None = Field(default=None, max_length=50)
    services: list[ClinicService] = Field(default_factory=list)
    patients_served: list[PatientType] = Field(default_factory=list)
    dispenses_meds: DispenseOption | None = None
    languages: list[Language] = Field(default_factory=list)
    plan: Plan = Plan.basic
    lang: str | None = Field(default=None, max_length=5)
    # Cloudflare Turnstile token; required only when captcha is enabled server-side.
    captcha_token: str | None = None

    @field_validator(
        "clinic_name", "zip", "phone", "address", "hours", "contact_name", "contact_role"
    )
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("contact_email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        v = v.strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("contact_email must be a valid email address")
        return v

    @field_validator("plan")
    @classmethod
    def _only_basic_plan(cls, v: Plan) -> Plan:
        # Paid plans are hidden in the UI until billing exists (PAID_PLANS_ENABLED
        # in the frontend); reject them here so they can't be recorded directly.
        if v is not Plan.basic:
            raise ValueError("only the basic plan is currently available")
        return v

    @field_validator("zip")
    @classmethod
    def _validate_zip(cls, v: str) -> str:
        if not re.fullmatch(r"\d{5}(-\d{4})?", v):
            raise ValueError("zip must be a 5-digit US ZIP code")
        return v


class ClinicRegistrationResponse(BaseModel):
    registration_id: str
    reference: str
