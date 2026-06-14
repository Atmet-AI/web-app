"use client"

import { AnimatePresence, motion } from "motion/react"
import { Check, CornerDownLeft, Loader2 } from "lucide-react"
import { useState } from "react"

import { PlatformSelect, type PlatformSelectOption } from "@/components/platform-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { countries } from "@/lib/countries"

type WaitlistForm = {
  fullName: string
  profileType: "" | "company" | "solo"
  company: string
  email: string
  companySize: string
  role: string
  referral: string
  country: string
  notes: string
}

type WaitlistErrors = Partial<Record<keyof WaitlistForm, string>>

const companyTypeOptions: PlatformSelectOption[] = [
  { value: "company", label: "Company" },
  { value: "solo", label: "Solo" },
]

const companySizeOptions: PlatformSelectOption[] = ["1-10", "11-50", "51-200", "201-1,000", "1,001+"].map(
  (value) => ({ value, label: value })
)

const companyRoleOptions: PlatformSelectOption[] = [
  "Founder / Owner",
  "Operations",
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Other",
].map((value) => ({ value, label: value }))

const soloRoleOptions: PlatformSelectOption[] = [
  "Designer",
  "Engineer",
  "Developer",
  "Founder",
  "Product Manager",
  "Marketer",
  "Consultant",
  "Student",
  "Other",
].map((value) => ({ value, label: value }))

const referralOptions: PlatformSelectOption[] = [
  "Friend",
  "LinkedIn",
  "Product Hunt",
  "X",
  "Instagram",
  "Else",
].map((value) => ({ value, label: value }))

const countryOptions: PlatformSelectOption[] = countries.map((country) => ({
  value: country.value,
  label: country.label,
  leading: <span className="text-base leading-none">{country.flag}</span>,
}))

const initialForm: WaitlistForm = {
  fullName: "",
  profileType: "",
  company: "",
  email: "",
  companySize: "",
  role: "",
  referral: "",
  country: "",
  notes: "",
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  error,
  searchable,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: readonly PlatformSelectOption[]
  placeholder: string
  error?: string
  searchable?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      <div id={id}>
        <PlatformSelect
          id={id}
          value={value}
          options={options}
          placeholder={placeholder}
          searchPlaceholder={`Search ${label.toLowerCase()}...`}
          searchable={searchable}
          invalid={Boolean(error)}
          onChange={onChange}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export default function WaitlistPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<WaitlistErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const isCompany = form.profileType !== "solo"

  const updateField = (field: keyof WaitlistForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  const updateProfileType = (value: string) => {
    const profileType: WaitlistForm["profileType"] =
      value === "company" || value === "solo" ? value : ""
    setForm((previous) => ({
      ...previous,
      profileType,
      company: profileType === "solo" ? "" : previous.company,
      companySize: profileType === "solo" ? "" : previous.companySize,
      role: "",
    }))
    setErrors((previous) => ({
      ...previous,
      profileType: undefined,
      company: undefined,
      companySize: undefined,
      role: undefined,
    }))
  }

  const validate = () => {
    const nextErrors: WaitlistErrors = {}

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required"
    if (!form.profileType) nextErrors.profileType = "Select your work type"
    if (isCompany && !form.company.trim()) nextErrors.company = "Company name is required"
    if (!form.email.trim()) {
      nextErrors.email = isCompany ? "Work email is required" : "Email is required"
    } else if (!isValidEmail(form.email)) {
      nextErrors.email = "Enter a valid email"
    }
    if (isCompany && !form.companySize) nextErrors.companySize = "Select your company size"
    if (!form.role) nextErrors.role = isCompany ? "Select your role" : "Select your job"
    if (!form.referral) nextErrors.referral = "Select how you heard about us"
    if (!form.country) nextErrors.country = "Select your country"

    return nextErrors
  }

  const handleSubmit = async () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || isSubmitting) return

    setIsSubmitting(true)
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <AnimatePresence initial={false} mode="wait">
        {isSubmitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="mx-auto max-w-sm text-center"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" />
            </div>
            <h1 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-foreground">
              You&apos;re on the waitlist
            </h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              We&apos;ll reach out to {form.email} when your workspace is ready.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            <div className="text-center">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
                Join the waitlist
              </h1>
              <p className="mt-2 text-pretty text-sm text-muted-foreground">
                Tell us a little about yourself and we&apos;ll be in touch.
              </p>
            </div>

            <form
              className="mt-8 grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSubmit()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-full-name" className="text-muted-foreground">
                  Full name
                </Label>
                <Input
                  id="waitlist-full-name"
                  value={form.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  placeholder="Amir Haddad"
                  aria-invalid={Boolean(errors.fullName)}
                />
                {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName}</p> : null}
              </div>

              <SelectField
                id="waitlist-profile-type"
                label="Work type"
                value={form.profileType}
                options={companyTypeOptions}
                placeholder="Select work type"
                error={errors.profileType}
                onChange={updateProfileType}
              />

              <AnimatePresence initial={false} mode="popLayout">
                {isCompany ? (
                  <motion.div
                    key="company-name"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="waitlist-company" className="text-muted-foreground">
                      Company name
                    </Label>
                    <Input
                      id="waitlist-company"
                      value={form.company}
                      onChange={(event) => updateField("company", event.target.value)}
                      placeholder="Atmet"
                      aria-invalid={Boolean(errors.company)}
                    />
                    {errors.company ? <p className="text-xs text-destructive">{errors.company}</p> : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label htmlFor="waitlist-email" className="text-muted-foreground">
                  {isCompany ? "Work email" : "Email"}
                </Label>
                <Input
                  id="waitlist-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@company.com"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {isCompany ? (
                  <motion.div
                    key="company-size"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                  >
                    <SelectField
                      id="waitlist-company-size"
                      label="Company size"
                      value={form.companySize}
                      options={companySizeOptions}
                      placeholder="Select company size"
                      error={errors.companySize}
                      onChange={(value) => updateField("companySize", value)}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <SelectField
                id="waitlist-role"
                label={isCompany ? "Your role" : "Your job"}
                value={form.role}
                options={isCompany ? companyRoleOptions : soloRoleOptions}
                placeholder={isCompany ? "Select your role" : "Select your job"}
                error={errors.role}
                onChange={(value) => updateField("role", value)}
              />

              <SelectField
                id="waitlist-referral"
                label="How did you hear about us?"
                value={form.referral}
                options={referralOptions}
                placeholder="Select a source"
                error={errors.referral}
                onChange={(value) => updateField("referral", value)}
              />

              <SelectField
                id="waitlist-country"
                label="Country"
                value={form.country}
                options={countryOptions}
                placeholder="Select your country"
                error={errors.country}
                searchable
                onChange={(value) => updateField("country", value)}
              />

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="waitlist-notes" className="text-muted-foreground">
                  Anything else you&apos;d like to add?
                </Label>
                <Textarea
                  id="waitlist-notes"
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Tell us what you'd like to automate."
                  className="min-h-20 resize-none"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                data-auth-primary-action="true"
                className="mt-2 w-full transition-transform active:scale-[0.96] sm:col-span-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Join the waitlist</span>
                <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
                  <CornerDownLeft className="h-2.5 w-2.5" />
                </Kbd>
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
