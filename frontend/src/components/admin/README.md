# Admin UI Components (C-22)

Reusable building blocks for admin CRUD pages.

## Components

### FormField
Wrapper for form inputs with label, error, and hint support.

Props:
- label: string
- name?: string
- error?: string
- hint?: string
- required?: boolean
- children: ReactNode

---

### ImageUrlInput
Controlled input for image URLs with live preview.

Props:
- value: string
- onChange: (value: string) => void
- placeholder?: string
- error?: string

---

### StatusBadge
Displays order/status labels with consistent styling.

Props:
- status: string ("pending" | "confirmed" | "shipped" | "delivered" | "cancelled")