"""Data-quality report schemas (the public "Report an issue" flow).

Mirrors the enum types and constraints of public.data_quality_report /
public.data_quality_report_field (migration 20260717120000). Client-facing
validation here is a backstop for the frontend's own checks; the DB CHECK
constraints are the final authority.
"""

from __future__ import annotations

import re
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator

# Same shape the frontend uses. Intentionally permissive — real deliverability
# is not verified, we only reject obviously malformed addresses.
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class ReportCategory(str, Enum):
    wrong_info = "wrong_info"
    site_closed = "site_closed"
    site_moved = "site_moved"
    duplicate = "duplicate"
    general_feedback = "general_feedback"


class ReportSubjectType(str, Enum):
    site = "site"
    organization = "organization"
    covered_entity = "covered_entity"
    contract_pharmacy = "contract_pharmacy"


class ReportField(str, Enum):
    hours = "hours"
    phone = "phone"
    address = "address"
    website = "website"


class FeedbackTopic(str, Enum):
    accessibility = "accessibility"
    staff_service = "staff_service"
    wait_times = "wait_times"
    other = "other"


class ReportFieldInput(BaseModel):
    field: ReportField
    currently_listed: str | None = None
    should_be: str | None = None


class ReportSubmission(BaseModel):
    """Incoming report. `status`, `created_at`, ticket reference are server-owned."""

    subject_type: ReportSubjectType
    subject_key: str = Field(min_length=1, description="Stable id of the subject, e.g. a site_id")
    category: ReportCategory
    new_address: str | None = None
    feedback_topic: FeedbackTopic | None = None
    description: str | None = None
    reporter_name: str | None = None
    reporter_organization: str | None = None
    reporter_email: str | None = None
    fields: list[ReportFieldInput] = Field(default_factory=list)

    @field_validator("reporter_email")
    @classmethod
    def _validate_email(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        v = v.strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("reporter_email must be a valid email address")
        return v

    @model_validator(mode="after")
    def _check_category_rules(self) -> "ReportSubmission":
        if not self.subject_key.strip():
            raise ValueError("subject_key must not be blank")

        if self.category is ReportCategory.site_moved and not (
            self.new_address and self.new_address.strip()
        ):
            raise ValueError("new_address is required when category is site_moved")

        if self.category is ReportCategory.general_feedback and not (
            self.description and self.description.strip()
        ):
            raise ValueError("description is required when category is general_feedback")

        if self.category is ReportCategory.wrong_info:
            if not any(f.should_be and f.should_be.strip() for f in self.fields):
                raise ValueError(
                    "wrong_info requires at least one field with a non-empty 'should_be'"
                )
        elif self.fields:
            raise ValueError("fields may only be provided when category is wrong_info")

        field_types = [f.field for f in self.fields]
        if len(field_types) != len(set(field_types)):
            raise ValueError("duplicate field entries are not allowed")

        return self


class ReportSubmissionResponse(BaseModel):
    report_id: str
    reference: str
    status: str = "new"
