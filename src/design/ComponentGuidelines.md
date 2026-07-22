# Component Guidelines

## The `App*` Standard
All UI components must be prefixed with `App` (e.g., `AppButton`, `AppCard`) and must reside in `src/shared/components/app/`.
Never use raw HTML tags (`<button>`, `<input>`) or raw Shadcn components directly in feature pages.

## Forms Standard
Every form MUST follow this strict hierarchical structure:
```tsx
<FormContainer>
  <FormSection title="General Information">
    <FormRow>
      <FormInput name="productName" label="Name" />
      <FormInput name="sku" label="SKU" />
    </FormRow>
  </FormSection>
</FormContainer>
```
- `<FormSection>`: 20px radius, 24px padding.

## Tables Standard
All tabular data must use `<AppTable>`.
Features that are automatically inherited:
- Sticky header
- Sorting & Filtering
- Pagination
- Column Visibility
- Skeletons (Loading State)
- Empty & Error States

## Dashboard Widgets
Do not build custom layouts for the Dashboard or Analytics pages.
Assemble them using reusable widgets:
- `<MetricCard>`
- `<ChartCard>`
- `<ActivityCard>`
- `<QuickActionCard>`

## Icons
- **Library**: `lucide-react` ONLY.
- **Stroke Width**: `1.75px`
- **Sizes**: `16px`, `18px`, `20px`, `24px`
