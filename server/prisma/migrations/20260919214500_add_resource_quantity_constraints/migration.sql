-- Add database-level inventory and allocation quantity invariants.
ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_quantity_non_negative"
CHECK ("quantity" >= 0),
ADD CONSTRAINT "Resource_availableQuantity_non_negative"
CHECK ("availableQuantity" >= 0),
ADD CONSTRAINT "Resource_availableQuantity_lte_quantity"
CHECK ("availableQuantity" <= "quantity");

ALTER TABLE "ResourceAllocation"
ADD CONSTRAINT "ResourceAllocation_quantity_positive"
CHECK ("quantity" > 0);
